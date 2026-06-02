package logs_core

import (
	"logbull/internal/config"
	projects_services "logbull/internal/features/projects/services"
)

var env = config.GetEnv()

var victoriaLogsRepository = newVictoriaLogsStorage(env)

var logCoreService = &LogCoreService{
	victoriaLogsRepository,
}

func GetLogStorage() LogStorage {
	return victoriaLogsRepository
}

func SetupDependencies() {
	projects_services.GetProjectService().AddProjectDeletionListener(logCoreService)
}
