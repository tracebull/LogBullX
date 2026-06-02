package logs_receiving

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"strings"
	"time"

	api_keys_services "logbull/internal/features/api_keys/services"
	logs_core "logbull/internal/features/logs/core"
	projects_models "logbull/internal/features/projects/models"
	projects_services "logbull/internal/features/projects/services"
	rate_limit "logbull/internal/util/rate_limit"
	time_parser "logbull/internal/util/time"

	"github.com/google/uuid"
)

const (
	// Rate limiting
	LogsBurstMultiplier = 5 // 5x base limit for burst handling

	// Batch limits
	MaxBatchSize      = 1000             // Maximum number of logs per batch
	MaxBatchSizeBytes = 10 * 1024 * 1024 // 10MB maximum batch size

	// Individual log limits
	MaxLogSizeFactor = 1024 // Convert KB to bytes
)

type LogReceivingService struct {
	logRepository    logs_core.LogStorage
	rateLimiter      *rate_limit.RateLimiter
	projectService   *projects_services.ProjectService
	apiKeyService    *api_keys_services.ApiKeyService
	logWorkerService *LogWorkerService
	logger           *slog.Logger
}

func (s *LogReceivingService) SubmitLogs(
	projectID uuid.UUID,
	request *SubmitLogsRequestDTO,
	clientIP, apiKey, origin string,
) (*SubmitLogsResponseDTO, error) {
	if err := s.validateBasicBatchLimits(request); err != nil {
		return nil, err
	}

	project, err := s.validateBasicProjectConstraints(projectID, origin, clientIP)
	if err != nil {
		return nil, err
	}

	if err := s.validateApiKey(project, apiKey); err != nil {
		return nil, err
	}

	validLogs, errors, totalBatchSize := s.processLogItemsWithRateLimit(request.Logs, project, projectID, clientIP)

	if err := s.validateTotalBatchSize(totalBatchSize); err != nil {
		return nil, err
	}

	s.queueValidLogs(validLogs, project)

	return &SubmitLogsResponseDTO{
		Accepted: len(validLogs),
		Rejected: len(errors),
		Errors:   errors,
	}, nil
}

func (s *LogReceivingService) processLogItemsWithRateLimit(
	logItems []LogItemRequestDTO,
	project *projects_models.Project,
	projectID uuid.UUID,
	clientIP string,
) ([]*logs_core.LogItem, []LogSubmissionError, int) {
	var validLogs []*logs_core.LogItem
	var errors []LogSubmissionError
	var totalBatchSize int

	logsAcceptedCount := 0
	maxLogsPerBatch := s.calculateMaxLogsPerBatch(project)

	for i, logItem := range logItems {
		logSize, err := s.calculateLogSize(&logItem)
		if err != nil {
			errors = append(errors, s.createLogError(i, err))
			continue
		}

		totalBatchSize += logSize
		logItem.Level = s.normalizeLogLevel(logItem.Level)

		if err := s.validateLogItemWithSize(&logItem, project, logSize); err != nil {
			errors = append(errors, s.createLogError(i, err))
			continue
		}

		if logsAcceptedCount >= maxLogsPerBatch {
			errors = append(errors, LogSubmissionError{Index: i, Message: logs_core.ErrorRateLimitExceeded})
			continue
		}

		if err := s.checkPerLogRateLimit(project); err != nil {
			errors = append(errors, s.createLogError(i, err))
			continue
		}

		for key, value := range logItem.Fields {
			logItem.Fields[key] = s.convertFieldValueToString(value)
		}

		validLogs = append(validLogs, &logs_core.LogItem{
			ID:        uuid.New(),
			ProjectID: projectID,
			Timestamp: time_parser.ParseTimestamp(logItem.Timestamp),
			Level:     logItem.Level,
			Message:   s.prettyFormatIfMessageJSON(logItem.Message),
			Fields:    logItem.Fields,
			ClientIP:  clientIP,
		})

		logsAcceptedCount++
	}

	return validLogs, errors, totalBatchSize
}

func (s *LogReceivingService) createLogError(index int, err error) LogSubmissionError {
	message := err.Error()
	if validationErr, ok := err.(*logs_core.ValidationError); ok {
		message = validationErr.Code
	}
	return LogSubmissionError{Index: index, Message: message}
}

func (s *LogReceivingService) queueValidLogs(
	validLogs []*logs_core.LogItem,
	project *projects_models.Project,
) {
	if len(validLogs) == 0 {
		return
	}

	// Queue each log individually - they will be accumulated internally and flushed every second
	successCount := 0
	for _, log := range validLogs {
		if err := s.logWorkerService.QueueLog(log); err != nil {
			s.logger.Error("Failed to queue log",
				slog.String("projectId", project.ID.String()),
				slog.String("logId", log.ID.String()),
				slog.String("error", err.Error()))
		} else {
			successCount++
		}
	}
}

func (s *LogReceivingService) validateBasicBatchLimits(request *SubmitLogsRequestDTO) error {
	if len(request.Logs) == 0 {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorBatchTooLarge,
			Message: "batch cannot be empty",
		}
	}

	if len(request.Logs) > MaxBatchSize {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorBatchTooLarge,
			Message: fmt.Sprintf("batch size cannot exceed %d logs", MaxBatchSize),
		}
	}

	return nil
}

func (s *LogReceivingService) validateBasicProjectConstraints(
	projectID uuid.UUID,
	origin, clientIP string,
) (*projects_models.Project, error) {
	project, err := s.projectService.GetProjectWithCache(projectID)
	if err != nil {
		return nil, &logs_core.ValidationError{
			Code:    logs_core.ErrorProjectNotFound,
			Message: "project not found",
		}
	}

	if err := s.validateDomainFilter(project, origin); err != nil {
		return nil, err
	}

	if err := s.validateIPFilter(project, clientIP); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *LogReceivingService) validateApiKey(project *projects_models.Project, apiKey string) error {
	if !project.IsApiKeyRequired {
		return nil
	}

	if apiKey == "" {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorAPIKeyRequired,
			Message: "API key required for this project",
		}
	}

	result, err := s.apiKeyService.ValidateApiKey(apiKey, project.ID)
	if err != nil {
		return fmt.Errorf("failed to validate API key: %w", err)
	}

	if !result.IsValid {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorAPIKeyInvalid,
			Message: "invalid API key",
		}
	}

	return nil
}

func (s *LogReceivingService) validateDomainFilter(project *projects_models.Project, origin string) error {
	if !project.IsFilterByDomain {
		return nil
	}

	if origin == "" {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorDomainNotAllowed,
			Message: "origin header required for domain filtering",
		}
	}

	for _, allowedDomain := range project.AllowedDomains {
		if s.matchesDomain(origin, allowedDomain) {
			return nil
		}
	}

	return &logs_core.ValidationError{
		Code:    logs_core.ErrorDomainNotAllowed,
		Message: "domain not allowed",
	}
}

func (s *LogReceivingService) validateIPFilter(project *projects_models.Project, clientIP string) error {
	if !project.IsFilterByIP {
		return nil
	}

	if clientIP == "" {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorIPNotAllowed,
			Message: "client IP required for IP filtering",
		}
	}

	ip := net.ParseIP(clientIP)
	if ip == nil {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorIPNotAllowed,
			Message: "invalid client IP format",
		}
	}

	for _, allowedIP := range project.AllowedIPs {
		if s.matchesIPOrCIDR(ip, allowedIP) {
			return nil
		}
	}

	return &logs_core.ValidationError{
		Code:    logs_core.ErrorIPNotAllowed,
		Message: "IP address not allowed",
	}
}

func (s *LogReceivingService) calculateMaxLogsPerBatch(project *projects_models.Project) int {
	if project.LogsPerSecondLimit == 0 {
		return MaxBatchSize
	}

	burstLimit := project.LogsPerSecondLimit * LogsBurstMultiplier

	rateLimitInfo, err := s.rateLimiter.GetRateLimitInfo(project.ID, project.LogsPerSecondLimit, burstLimit)
	if err != nil {
		return 0
	}

	availableTokens := rateLimitInfo.Remaining
	if rateLimitInfo.Allowed {
		availableTokens++
	}

	maxLogsForThisBatch := project.LogsPerSecondLimit
	if availableTokens < maxLogsForThisBatch {
		maxLogsForThisBatch = availableTokens
	}

	return maxLogsForThisBatch
}

func (s *LogReceivingService) checkPerLogRateLimit(project *projects_models.Project) error {
	if project.LogsPerSecondLimit == 0 {
		return nil
	}

	burstLimit := project.LogsPerSecondLimit * LogsBurstMultiplier

	result, err := s.rateLimiter.CheckRateLimit(project.ID, project.LogsPerSecondLimit, burstLimit)
	if err != nil {
		return fmt.Errorf("rate limit check failed: %w", err)
	}

	if !result.Allowed {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorRateLimitExceeded,
			Message: logs_core.ErrorRateLimitExceeded,
		}
	}

	return nil
}

func (s *LogReceivingService) validateLogItemWithSize(
	entry *LogItemRequestDTO,
	project *projects_models.Project,
	logSize int,
) error {
	if !entry.Level.IsValid() {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorInvalidLogLevel,
			Message: "invalid log level",
			Field:   "level",
		}
	}

	if strings.TrimSpace(entry.Message) == "" {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorMessageEmpty,
			Message: "message cannot be empty",
			Field:   "message",
		}
	}

	maxSizeBytes := project.MaxLogSizeKB * MaxLogSizeFactor
	if logSize > maxSizeBytes {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorLogTooLarge,
			Message: fmt.Sprintf("log size %d bytes exceeds maximum %d bytes", logSize, maxSizeBytes),
			Field:   "size",
		}
	}

	if err := s.validateTimestamp(entry.Timestamp); err != nil {
		return err
	}

	return nil
}

func (s *LogReceivingService) validateTotalBatchSize(totalBatchSize int) error {
	if totalBatchSize > MaxBatchSizeBytes {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorBatchTooLarge,
			Message: fmt.Sprintf("batch size %d bytes exceeds maximum %d bytes", totalBatchSize, MaxBatchSizeBytes),
		}
	}

	return nil
}

func (s *LogReceivingService) calculateLogSize(entry *LogItemRequestDTO) (int, error) {
	jsonData, err := json.Marshal(entry)
	if err != nil {
		return 0, err
	}

	return len(jsonData), nil
}

func (s *LogReceivingService) matchesDomain(origin, allowedDomain string) bool {
	origin = strings.ToLower(origin)
	allowedDomain = strings.ToLower(allowedDomain)

	if strings.HasPrefix(allowedDomain, "*.") {
		domain := allowedDomain[2:]
		return strings.HasSuffix(origin, "."+domain) || origin == domain
	}

	return origin == allowedDomain
}

func (s *LogReceivingService) matchesIPOrCIDR(ip net.IP, allowedIP string) bool {
	_, cidr, err := net.ParseCIDR(allowedIP)
	if err == nil {
		return cidr.Contains(ip)
	}

	allowed := net.ParseIP(allowedIP)
	if allowed != nil {
		return ip.Equal(allowed)
	}

	return false
}

func (s *LogReceivingService) prettyFormatIfMessageJSON(message string) string {
	message = strings.TrimSpace(message)
	if message == "" {
		return message
	}

	var jsonData any
	if err := json.Unmarshal([]byte(message), &jsonData); err != nil {
		return message
	}

	prettyJSON, err := json.MarshalIndent(jsonData, "", "  ")
	if err != nil {
		return message
	}

	return string(prettyJSON)
}

func (s *LogReceivingService) validateTimestamp(timestamp any) error {
	if timestamp == nil {
		return nil
	}

	parsedTimestamp := time_parser.ParseTimestamp(timestamp)
	currentTime := time.Now().UTC()

	// Usually, if logs are in the future - this is a mistake and needs to be fixed.
	// However, sometimes we receive logs a couple of milliseconds or seconds in the future, and this is expected behavior.
	//
	// To ensure log order, if multiple logs have the same timestamp down to the nanosecond,
	// logging libraries may add an additional millisecond or nanosecond to maintain sequence.
	// We allow up to 5 minutes in the future as a safety buffer.
	//
	// However, if logs are more than 5 minutes in the future - this is definitely a mistake.
	maxFutureOffset := 5 * time.Minute
	if parsedTimestamp.After(currentTime.Add(maxFutureOffset)) {
		return &logs_core.ValidationError{
			Code:    logs_core.ErrorFutureTimestamp,
			Message: "timestamp cannot be more than 5 minutes in the future",
			Field:   "timestamp",
		}
	}

	return nil
}

// normalizeLogLevel normalizes log levels from different programming languages and frameworks
// to our standard log levels
func (s *LogReceivingService) normalizeLogLevel(level logs_core.LogLevel) logs_core.LogLevel {
	normalizedLevel := strings.ToUpper(strings.TrimSpace(string(level)))

	switch normalizedLevel {
	case "DEBUG", "TRACE", "VERBOSE", "SILLY":
		return logs_core.LogLevelDebug

	case "INFO", "INFORMATION", "NOTICE":
		return logs_core.LogLevelInfo

	case "WARN", "WARNING":
		return logs_core.LogLevelWarn

	case "ERROR", "ERR", "PANIC", "CRITICAL", "CRIT", "ALERT", "EMERG", "EMERGENCY":
		return logs_core.LogLevelError

	case "FATAL":
		return logs_core.LogLevelFatal

	default:
		if logs_core.LogLevel(normalizedLevel).IsValid() {
			return logs_core.LogLevel(normalizedLevel)
		}

		return level
	}
}

func (s *LogReceivingService) convertFieldValueToString(value any) string {
	switch v := value.(type) {
	case float64:
		if v == float64(int64(v)) {
			return fmt.Sprintf("%.0f", v)
		}
		return fmt.Sprintf("%f", v)
	case float32:
		if v == float32(int32(v)) {
			return fmt.Sprintf("%.0f", v)
		}
		return fmt.Sprintf("%f", v)
	default:
		return fmt.Sprintf("%v", v)
	}
}
