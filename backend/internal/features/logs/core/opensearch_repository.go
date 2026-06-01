package logs_core

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Fields we treat as "system"
var systemFields = map[string]bool{
	"timestamp":    true,
	"project_id":   true,
	"id":           true,
	"level":        true,
	"client_ip":    true,
	"created_at":   true,
	"message":      true,
	"attrs_text":   true,
	"attrs_tokens": true,
}

type LogCoreRepository struct {
	client       *http.Client
	baseURL      string
	indexPattern string
	indexPrefix  string
	timeout      time.Duration
	logger       *slog.Logger

	queryBuilder *QueryBuilder
}

func (r *LogCoreRepository) StoreLogsBatch(entries map[uuid.UUID][]*LogItem) error {
	if len(entries) == 0 {
		return nil
	}

	var bulkRequestBuilder strings.Builder

	for projectID, logs := range entries {
		for _, logItem := range logs {
			indexName := r.indexFor(logItem.Timestamp)

			metadata := map[string]any{
				"index": map[string]any{
					"_index":  indexName,
					"_id":     logItem.ID.String(),
					"routing": projectID.String(),
				},
			}

			metadataBytes, err := json.Marshal(metadata)
			if err != nil {
				return fmt.Errorf("failed to marshal metadata: %w", err)
			}

			bulkRequestBuilder.Write(metadataBytes)
			bulkRequestBuilder.WriteByte('\n')

			document := map[string]any{
				"timestamp":  logItem.Timestamp.UnixNano(),
				"project_id": projectID.String(),
				"id":         logItem.ID.String(),
				"level":      string(logItem.Level),
				"client_ip":  logItem.ClientIP,
				"message":    logItem.Message,
			}

			// Copy custom fields into document, converting non-system fields to strings to avoid mapping conflicts
			for fieldName, fieldValue := range logItem.Fields {
				if systemFields[fieldName] {
					document[fieldName] = fieldValue
				} else {
					// Convert ALL custom fields to strings to avoid OpenSearch mapping conflicts
					document[fieldName] = fmt.Sprintf("%v", fieldValue)
				}
			}

			// Build attrs_tokens for custom field queries
			var attrsTokens []string
			var attrsTextParts []string
			for fieldName, fieldValue := range logItem.Fields {
				if !systemFields[fieldName] {
					// Use string representation for attrs regardless of how we store the field
					stringValue := fmt.Sprintf("%v", fieldValue)
					// Add token for exact matching: "field=value"
					attrsTokens = append(attrsTokens, fmt.Sprintf("%s=%s", fieldName, stringValue))
					// Add text for contains/wildcard searches: "field:value"
					attrsTextParts = append(attrsTextParts, fmt.Sprintf("%s:%s", fieldName, stringValue))
				}
			}

			if len(attrsTokens) > 0 {
				document["attrs_tokens"] = attrsTokens
			}
			if len(attrsTextParts) > 0 {
				attrsText := strings.Join(attrsTextParts, " ")
				document["attrs_text"] = attrsText
			}

			documentBytes, err := json.Marshal(document)
			if err != nil {
				return fmt.Errorf("failed to marshal document: %w", err)
			}

			bulkRequestBuilder.Write(documentBytes)
			bulkRequestBuilder.WriteByte('\n')
		}
	}

	bulkEndpoint := r.baseURL + "/_bulk"
	bulkRequest, err := http.NewRequest("POST", bulkEndpoint, strings.NewReader(bulkRequestBuilder.String()))
	if err != nil {
		return fmt.Errorf("failed to create bulk request: %w", err)
	}

	bulkRequest.Header.Set("Content-Type", "application/x-ndjson")

	bulkResponse, err := r.client.Do(bulkRequest)
	if err != nil {
		return fmt.Errorf("failed to send logs to OpenSearch: %w", err)
	}

	defer func() {
		if closeErr := bulkResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close bulk response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(bulkResponse.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	if bulkResponse.StatusCode < 200 || bulkResponse.StatusCode >= 300 {
		return fmt.Errorf("OpenSearch bulk returned status %d: %s", bulkResponse.StatusCode, string(responseBody))
	}

	var bulkResponseData openSearchBulkResponse
	if err := json.Unmarshal(responseBody, &bulkResponseData); err != nil {
		return fmt.Errorf("failed to unmarshal bulk response: %w", err)
	}

	if bulkResponseData.Errors {
		return fmt.Errorf("OpenSearch bulk reported item errors: %s", string(responseBody))
	}

	return nil
}

func (r *LogCoreRepository) ExecuteQueryForProject(
	projectID uuid.UUID,
	request *LogQueryRequestDTO,
) (*LogQueryResponseDTO, error) {
	startTime := time.Now()
	searchBody, err := r.queryBuilder.BuildSearchBody(projectID, request)
	if err != nil {
		return nil, fmt.Errorf("failed to build search body: %w", err)
	}

	searchPayload, err := json.Marshal(searchBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search body: %w", err)
	}

	searchEndpoint := r.baseURL + "/" + r.indexPattern + "/_search"
	searchRequest, err := http.NewRequest("POST", searchEndpoint, bytes.NewReader(searchPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}
	searchRequest.Header.Set("Content-Type", "application/json")

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search: %w", err)
	}
	defer func() {
		if closeErr := searchResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close search response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(searchResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read search response body: %w", err)
	}

	if searchResponse.StatusCode != 200 {
		return nil, fmt.Errorf(
			"OpenSearch search returned status %d: %s",
			searchResponse.StatusCode,
			string(responseBody),
		)
	}

	var openSearchResponse openSearchSearchResponse
	decoder := json.NewDecoder(bytes.NewReader(responseBody))
	decoder.UseNumber()
	if err := decoder.Decode(&openSearchResponse); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	logItems := make([]LogItemDTO, 0, len(openSearchResponse.Hits.Hits))
	for _, hit := range openSearchResponse.Hits.Hits {
		source := hit.Source
		logItemDTO := LogItemDTO{
			ID:       asString(source["id"]),
			Level:    asString(source["level"]),
			Message:  asString(source["message"]),
			ClientIP: asString(source["client_ip"]),
		}
		if timestampNanos, exists := source["timestamp"]; exists {
			if num, ok := timestampNanos.(json.Number); ok {
				if nanos, err := num.Int64(); err == nil {
					logItemDTO.Timestamp = time.Unix(0, nanos).UTC()
				}
			} else if nanos, ok := timestampNanos.(float64); ok {
				logItemDTO.Timestamp = time.Unix(0, int64(nanos)).UTC()
			}
		}

		if createdAtStr, exists := source["created_at"].(string); exists {
			if parsedTime, err := time.Parse(time.RFC3339Nano, createdAtStr); err == nil {
				logItemDTO.CreatedAt = parsedTime.UTC()
			}
		}

		// Collect custom fields from source (excluding system fields) plus clientIp in sorted order
		var fieldNames []string
		for fieldName := range source {
			if !systemFields[fieldName] || fieldName == "client_ip" {
				fieldNames = append(fieldNames, fieldName)
			}
		}
		if len(fieldNames) > 0 {
			// Sort field names alphabetically to ensure consistent ordering
			slices.Sort(fieldNames)
			fields := make(map[string]any)

			for _, fieldName := range fieldNames {

				// Map client_ip to client_ip for consistency in Fields
				if fieldName == "client_ip" {
					fields["client_ip"] = source[fieldName]
				} else {
					fields[fieldName] = source[fieldName]
				}
			}
			logItemDTO.Fields = fields
		}

		logItems = append(logItems, logItemDTO)
	}

	executionTime := time.Since(startTime).String()
	response := &LogQueryResponseDTO{
		Logs:         logItems,
		Total:        openSearchResponse.Hits.Total.Value,
		Limit:        request.Limit,
		Offset:       request.Offset,
		ExecutedInMs: executionTime,
	}

	return response, nil
}

// DiscoverFields returns unique non-system keys present in recent documents of the project
func (r *LogCoreRepository) DiscoverFields(projectID uuid.UUID) ([]string, error) {
	discoveryQuery := map[string]any{
		"size":    50,
		"sort":    []any{map[string]any{"timestamp": map[string]any{"order": "desc"}}},
		"_source": true,
		"query": map[string]any{"bool": map[string]any{
			"filter": []any{
				map[string]any{"term": map[string]any{"project_id.keyword": projectID.String()}},
			},
		}},
	}
	discoveryPayload, err := json.Marshal(discoveryQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal discovery query: %w", err)
	}

	discoveryEndpoint := r.baseURL + "/" + r.indexPattern + "/_search"
	discoveryRequest, err := http.NewRequest("POST", discoveryEndpoint, bytes.NewReader(discoveryPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}

	discoveryRequest.Header.Set("Content-Type", "application/json")

	discoveryResponse, err := r.client.Do(discoveryRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to execute field discovery search: %w", err)
	}
	defer func() {
		if closeErr := discoveryResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close discovery response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(discoveryResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read discovery response body: %w", err)
	}

	if discoveryResponse.StatusCode != 200 {
		return nil, fmt.Errorf(
			"OpenSearch search returned status %d: %s",
			discoveryResponse.StatusCode,
			string(responseBody),
		)
	}

	var openSearchResponse openSearchSearchResponse
	if err := json.Unmarshal(responseBody, &openSearchResponse); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	fieldSet := map[string]bool{}
	for _, hit := range openSearchResponse.Hits.Hits {
		for fieldName := range hit.Source {
			if !systemFields[fieldName] {
				fieldSet[fieldName] = true
			}
		}
	}

	discoveredFields := make([]string, 0, len(fieldSet))
	for fieldName := range fieldSet {
		discoveredFields = append(discoveredFields, fieldName)
	}

	// Sort fields alphabetically for consistent ordering
	slices.Sort(discoveredFields)

	return discoveredFields, nil
}

// ForceFlush => OpenSearch _refresh to make recent docs searchable
func (r *LogCoreRepository) ForceFlush() error {
	refreshEndpoint := r.baseURL + "/" + r.indexPattern + "/_refresh"
	refreshRequest, err := http.NewRequest("POST", refreshEndpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create refresh request: %w", err)
	}

	refreshResponse, err := r.client.Do(refreshRequest)
	if err != nil {
		return fmt.Errorf("failed to execute refresh: %w", err)
	}
	defer func() {
		if closeErr := refreshResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close refresh response body", "error", closeErr)
		}
	}()

	if refreshResponse.StatusCode != 200 {
		responseBody, err := io.ReadAll(refreshResponse.Body)
		if err != nil {
			return fmt.Errorf(
				"OpenSearch refresh returned status %d and failed to read response body: %w",
				refreshResponse.StatusCode,
				err,
			)
		}

		return fmt.Errorf("OpenSearch refresh returned status %d: %s", refreshResponse.StatusCode, string(responseBody))
	}

	return nil
}

// Delete all logs by project
func (r *LogCoreRepository) DeleteLogsByProject(projectID uuid.UUID) error {
	deleteQuery := map[string]any{
		"query": map[string]any{
			"term": map[string]any{"project_id.keyword": projectID.String()},
		},
	}

	return r.deleteByQuery(deleteQuery, &projectID)
}

// Delete logs older than time for a given project
func (r *LogCoreRepository) DeleteOldLogs(projectID uuid.UUID, olderThan time.Time) error {
	deleteQuery := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": []any{
					map[string]any{"term": map[string]any{"project_id.keyword": projectID.String()}},
					map[string]any{
						"range": map[string]any{
							"timestamp": map[string]any{"lt": olderThan.UTC().UnixNano()},
						},
					},
				},
			},
		},
	}

	return r.deleteByQuery(deleteQuery, &projectID)
}

func (r *LogCoreRepository) GetProjectLogStats(projectID uuid.UUID) (*LogsStatsDTO, error) {
	statsQuery := map[string]any{
		"size": 0, // Don't return hits, only aggregations
		"query": map[string]any{
			"bool": map[string]any{
				"filter": []any{
					map[string]any{"term": map[string]any{"project_id.keyword": projectID.String()}},
				},
			},
		},
		"aggs": map[string]any{
			"total_logs": map[string]any{
				"value_count": map[string]any{"field": "_id"},
			},
			"oldest_log": map[string]any{
				"min": map[string]any{"field": "timestamp"},
			},
			"newest_log": map[string]any{
				"max": map[string]any{"field": "timestamp"},
			},
			"total_size_bytes": map[string]any{
				"sum": map[string]any{
					"script": map[string]any{
						"source": `
							int size = 200; // Base overhead for system fields
							if (params._source.message != null) {
								size += params._source.message.length();
							}
							if (params._source.attrs_text != null) {
								size += params._source.attrs_text.length();
							}
							if (params._source.attrs_tokens != null) {
								for (token in params._source.attrs_tokens) {
									size += token.length();
								}
							}
							return size;
						`,
					},
				},
			},
		},
	}

	statsPayload, err := json.Marshal(statsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal stats query: %w", err)
	}

	statsEndpoint := r.baseURL + "/" + r.indexPattern + "/_search"
	statsRequest, err := http.NewRequest("POST", statsEndpoint, bytes.NewReader(statsPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create stats request: %w", err)
	}
	statsRequest.Header.Set("Content-Type", "application/json")

	statsResponse, err := r.client.Do(statsRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to execute stats search: %w", err)
	}
	defer func() {
		if closeErr := statsResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close stats response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(statsResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read stats response body: %w", err)
	}

	if statsResponse.StatusCode != 200 {
		return nil, fmt.Errorf(
			"OpenSearch stats search returned status %d: %s",
			statsResponse.StatusCode,
			string(responseBody),
		)
	}

	var statsSearchResponse openSearchStatsResponse
	if err := json.Unmarshal(responseBody, &statsSearchResponse); err != nil {
		return nil, fmt.Errorf("failed to parse stats response: %w", err)
	}

	stats := &LogsStatsDTO{
		TotalLogs:   statsSearchResponse.Aggregations.TotalLogs.Value,
		TotalSizeMB: statsSearchResponse.Aggregations.TotalSizeBytes.Value / (1024 * 1024), // Convert bytes to MB
	}

	// Parse oldest timestamp from nanoseconds only
	if statsSearchResponse.Aggregations.OldestLog.Value != 0 {
		stats.OldestLogTime = time.Unix(0, int64(statsSearchResponse.Aggregations.OldestLog.Value)).UTC()
	} else {
		r.logger.Warn("No oldest log timestamp available",
			"projectId", projectID.String())
	}

	// Parse newest timestamp from nanoseconds only
	if statsSearchResponse.Aggregations.NewestLog.Value != 0 {
		stats.NewestLogTime = time.Unix(0, int64(statsSearchResponse.Aggregations.NewestLog.Value)).UTC()
	} else {
		r.logger.Warn("No newest log timestamp available",
			"projectId", projectID.String())
	}

	return stats, nil
}

func (r *LogCoreRepository) GetSystemLogStats() (*LogsStatsDTO, error) {
	statsQuery := map[string]any{
		"size": 0, // Don't return hits, only aggregations
		"query": map[string]any{
			"match_all": map[string]any{},
		},
		"aggs": map[string]any{
			"total_logs": map[string]any{
				"value_count": map[string]any{"field": "_id"},
			},
			"oldest_log": map[string]any{
				"min": map[string]any{"field": "timestamp"},
			},
			"newest_log": map[string]any{
				"max": map[string]any{"field": "timestamp"},
			},
			"total_size_bytes": map[string]any{
				"sum": map[string]any{
					"script": map[string]any{
						"source": `
							int size = 200; // Base overhead for system fields
							if (params._source.message != null) {
								size += params._source.message.length();
							}
							if (params._source.attrs_text != null) {
								size += params._source.attrs_text.length();
							}
							if (params._source.attrs_tokens != null) {
								for (token in params._source.attrs_tokens) {
									size += token.length();
								}
							}
							return size;
						`,
					},
				},
			},
		},
	}

	statsPayload, err := json.Marshal(statsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal stats query: %w", err)
	}

	statsEndpoint := r.baseURL + "/" + r.indexPattern + "/_search"
	statsRequest, err := http.NewRequest("POST", statsEndpoint, bytes.NewReader(statsPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create stats request: %w", err)
	}
	statsRequest.Header.Set("Content-Type", "application/json")

	statsResponse, err := r.client.Do(statsRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to execute stats search: %w", err)
	}
	defer func() {
		if closeErr := statsResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close stats response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(statsResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read stats response body: %w", err)
	}

	if statsResponse.StatusCode != 200 {
		return nil, fmt.Errorf(
			"OpenSearch stats search returned status %d: %s",
			statsResponse.StatusCode,
			string(responseBody),
		)
	}

	var statsSearchResponse openSearchStatsResponse
	if err := json.Unmarshal(responseBody, &statsSearchResponse); err != nil {
		return nil, fmt.Errorf("failed to parse stats response: %w", err)
	}

	stats := &LogsStatsDTO{
		TotalLogs:   statsSearchResponse.Aggregations.TotalLogs.Value,
		TotalSizeMB: statsSearchResponse.Aggregations.TotalSizeBytes.Value / (1024 * 1024), // Convert bytes to MB
	}

	// Parse oldest timestamp from nanoseconds only
	if statsSearchResponse.Aggregations.OldestLog.Value != 0 {
		stats.OldestLogTime = time.Unix(0, int64(statsSearchResponse.Aggregations.OldestLog.Value)).UTC()
	} else {
		r.logger.Warn("No oldest log timestamp available for system stats")
	}

	// Parse newest timestamp from nanoseconds only
	if statsSearchResponse.Aggregations.NewestLog.Value != 0 {
		stats.NewestLogTime = time.Unix(0, int64(statsSearchResponse.Aggregations.NewestLog.Value)).UTC()
	} else {
		r.logger.Warn("No newest log timestamp available for system stats")
	}

	return stats, nil
}

func (r *LogCoreRepository) deleteByQuery(queryBody map[string]any, routing *uuid.UUID) error {
	queryPayload, err := json.Marshal(queryBody)
	if err != nil {
		return fmt.Errorf("failed to marshal delete query: %w", err)
	}

	params := make([]string, 0, 8)
	params = append(params,
		"conflicts=proceed",
		"wait_for_completion=true",
		"refresh=false",
		"ignore_unavailable=true",
		"allow_no_indices=true",
		"expand_wildcards=open,hidden",
		"timeout=60s",
		"requests_per_second=-1",
	)
	if routing != nil {
		params = append(params, "routing="+routing.String())
	}

	deleteEndpoint := fmt.Sprintf("%s/%s/_delete_by_query?%s",
		r.baseURL, r.indexPattern, strings.Join(params, "&"))

	const maxAttempts = 3
	var lastBody []byte
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		req, err := http.NewRequest("POST", deleteEndpoint, bytes.NewReader(queryPayload))
		if err != nil {
			return fmt.Errorf("failed to create delete_by_query request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := r.client.Do(req)
		if err != nil {
			if attempt == maxAttempts {
				return fmt.Errorf("failed to execute delete_by_query: %w", err)
			}
			time.Sleep(time.Duration(attempt*attempt) * 200 * time.Millisecond)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		lastBody = body

		if resp.StatusCode == 429 || resp.StatusCode == 502 || resp.StatusCode == 503 || resp.StatusCode == 504 {
			if attempt == maxAttempts {
				return fmt.Errorf("OpenSearch delete_by_query returned status %d: %s", resp.StatusCode, string(body))
			}
			time.Sleep(time.Duration(attempt*attempt) * 250 * time.Millisecond)
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("OpenSearch delete_by_query returned status %d: %s", resp.StatusCode, string(body))
		}

		return nil
	}

	return fmt.Errorf("OpenSearch delete_by_query failed after retries: %s", string(lastBody))
}

func (r *LogCoreRepository) TestOpenSearchConnection() error {
	healthEndpoint := r.baseURL + "/_cluster/health"
	healthRequest, err := http.NewRequest("GET", healthEndpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	healthResponse, err := r.client.Do(healthRequest)
	if err != nil {
		return fmt.Errorf("failed to connect to OpenSearch: %w", err)
	}
	defer func() {
		if closeErr := healthResponse.Body.Close(); closeErr != nil {
			r.logger.Error("failed to close health check response body", "error", closeErr)
		}
	}()

	if healthResponse.StatusCode < 200 || healthResponse.StatusCode >= 300 {
		responseBody, err := io.ReadAll(healthResponse.Body)
		if err != nil {
			return fmt.Errorf(
				"OpenSearch health check returned status %d and failed to read response body: %w",
				healthResponse.StatusCode,
				err,
			)
		}

		return fmt.Errorf(
			"OpenSearch health check returned status %d: %s",
			healthResponse.StatusCode,
			string(responseBody),
		)
	}

	return nil
}

func (r *LogCoreRepository) indexFor(timestamp time.Time) string {
	utcTime := timestamp.UTC()
	return fmt.Sprintf("%s%04d.%02d.%02d", r.indexPrefix, utcTime.Year(), int(utcTime.Month()), utcTime.Day())
}

func asString(value any) string {
	switch typedValue := value.(type) {
	case string:
		return typedValue
	case fmt.Stringer:
		return typedValue.String()
	default:
		return fmt.Sprintf("%v", value)
	}
}
