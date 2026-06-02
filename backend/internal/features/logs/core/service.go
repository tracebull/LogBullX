package logs_core

import "github.com/google/uuid"

type LogCoreService struct {
	logStorage LogStorage
}

func (s *LogCoreService) OnBeforeProjectDeletion(projectID uuid.UUID) error {
	return s.logStorage.DeleteLogsByProject(projectID)
}
