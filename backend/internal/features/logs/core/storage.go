package logs_core

import (
	"time"

	"github.com/google/uuid"
)

type LogStorage interface {
	StoreLogsBatch(entries map[uuid.UUID][]*LogItem) error
	ExecuteQueryForProject(projectID uuid.UUID, request *LogQueryRequestDTO) (*LogQueryResponseDTO, error)
	DiscoverFields(projectID uuid.UUID) ([]string, error)
	ForceFlush() error
	DeleteLogsByProject(projectID uuid.UUID) error
	DeleteOldLogs(projectID uuid.UUID, olderThan time.Time) error
	GetProjectLogStats(projectID uuid.UUID) (*LogsStatsDTO, error)
	GetSystemLogStats() (*LogsStatsDTO, error)
	HealthCheck() error
}
