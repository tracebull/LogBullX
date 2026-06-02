package downdetect

import (
	"fmt"

	logs_core "logbull/internal/features/logs/core"
	"logbull/internal/storage"
	cache_utils "logbull/internal/util/cache"
)

type DowndetectService struct {
	logStorage logs_core.LogStorage
}

func (s *DowndetectService) IsAvailable() error {
	if err := storage.GetDb().Exec("SELECT 1").Error; err != nil {
		return fmt.Errorf("database check failed: %w", err)
	}

	if err := s.testCacheConnection(); err != nil {
		return fmt.Errorf("cache check failed: %w", err)
	}

	if err := s.logStorage.HealthCheck(); err != nil {
		return fmt.Errorf("log storage check failed: %w", err)
	}

	return nil
}

func (s *DowndetectService) testCacheConnection() (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("cache connection test panicked: %v", r)
		}
	}()

	cache_utils.TestCacheConnection()
	return nil
}
