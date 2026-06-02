package logs_core

import "time"

type LogQueryRequestDTO struct {
	Query      *QueryNode    `json:"query,omitempty"`
	TimeRange  *TimeRangeDTO `json:"timeRange,omitempty"`
	Limit      int           `json:"limit,omitempty"`
	Offset     int           `json:"offset,omitempty"`
	SortBy     string        `json:"sortBy,omitempty"`
	SortOrder  string        `json:"sortOrder,omitempty"`
	TrackTotal bool          `json:"trackTotal,omitempty"`
}

type TimeRangeDTO struct {
	From *time.Time `json:"from,omitempty"`
	To   *time.Time `json:"to,omitempty"`
}

type LogQueryResponseDTO struct {
	Logs         []LogItemDTO `json:"logs"`
	Total        int64        `json:"total"`
	Limit        int          `json:"limit"`
	Offset       int          `json:"offset"`
	ExecutedInMs string       `json:"executedIn"`
}

type LogItemDTO struct {
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	Fields    map[string]any `json:"fields,omitempty"`
	ClientIP  string         `json:"clientIp,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
}

// QueryNode / Condition / Logic (same spirit as before)
type QueryNode struct {
	Type      QueryNodeType  `json:"type"`
	Logic     *LogicalNode   `json:"logic,omitempty"`
	Condition *ConditionNode `json:"condition,omitempty"`
}

type LogicalNode struct {
	Operator LogicalOperator `json:"operator"`
	Children []QueryNode     `json:"children"`
}

type ConditionNode struct {
	Field    string            `json:"field"`
	Operator ConditionOperator `json:"operator"`
	Value    any               `json:"value"`
}

type QueryableField struct {
	Name       string              `json:"name"`
	Type       QueryableFieldType  `json:"type"`
	Operations []ConditionOperator `json:"operations"`
	IsCustom   bool                `json:"isCustom"` // non-system field
}

type GetQueryableFieldsRequestDTO struct {
	Query string `form:"query" json:"query"`
}

type GetQueryableFieldsResponseDTO struct {
	Fields []QueryableField `json:"fields"`
}

type LogsStatsDTO struct {
	TotalLogs     int64     `json:"totalLogs"`
	TotalSizeMB   float64   `json:"totalSizeMb"`
	OldestLogTime time.Time `json:"oldestLogTime"`
	NewestLogTime time.Time `json:"newestLogTime"`
}

var PredefinedQueryableFields = []QueryableField{
	{
		Name: "message",
		Type: QueryableFieldTypeString,
		Operations: []ConditionOperator{
			ConditionOperatorEquals, ConditionOperatorNotEquals,
			ConditionOperatorContains, ConditionOperatorNotContains,
		},
	},
	{
		Name: "level",
		Type: QueryableFieldTypeString,
		Operations: []ConditionOperator{
			ConditionOperatorEquals, ConditionOperatorNotEquals,
			ConditionOperatorIn, ConditionOperatorNotIn,
		},
	},
	{
		Name: "client_ip",
		Type: QueryableFieldTypeString,
		Operations: []ConditionOperator{
			ConditionOperatorEquals, ConditionOperatorNotEquals,
			ConditionOperatorContains, ConditionOperatorNotContains,
		},
	},
	{
		Name: "timestamp",
		Type: QueryableFieldTypeTimestamp,
		Operations: []ConditionOperator{
			ConditionOperatorEquals, ConditionOperatorNotEquals,
			ConditionOperatorGreaterThan, ConditionOperatorGreaterOrEqual,
			ConditionOperatorLessThan, ConditionOperatorLessOrEqual,
		},
	},
	// Dynamic fields support
	{
		Name:     "fields.*",
		Type:     QueryableFieldTypeString, // Default, can be overridden
		IsCustom: true,
		Operations: []ConditionOperator{
			ConditionOperatorEquals, ConditionOperatorNotEquals,
			ConditionOperatorContains, ConditionOperatorNotContains,
			ConditionOperatorExists, ConditionOperatorNotExists,
		},
	},
}
