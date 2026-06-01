package logs_core

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"logbull/internal/config"
	projects_services "logbull/internal/features/projects/services"
	"logbull/internal/util/logger"
)

var env = config.GetEnv()

var logCoreRepository = &LogCoreRepository{
	client: &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     50,
			IdleConnTimeout:     90 * time.Second,
			DisableKeepAlives:   false,
			ForceAttemptHTTP2:   false,
		},
	},
	baseURL:      strings.TrimRight(fmt.Sprintf("%s:%s", env.OpenSearchURL, env.OpenSearchAPIPort), "/"),
	indexPattern: "logs-*",
	indexPrefix:  "logs-",
	timeout:      5 * time.Minute,
	logger:       logger.GetLogger(),
	queryBuilder: &QueryBuilder{logger.GetLogger()},
}

var logCoreService = &LogCoreService{
	logCoreRepository,
}

func GetLogStorage() LogStorage {
	return logCoreRepository
}

func GetLogCoreRepository() *LogCoreRepository {
	return logCoreRepository
}

func GetUnavailableLogCoreRepository() *LogCoreRepository {
	return &LogCoreRepository{
		client:  &http.Client{},
		baseURL: "http://localhost:8080",
		timeout: 30 * time.Second,
		logger:  logger.GetLogger(),
	}
}

func SetupDependencies() {
	projects_services.GetProjectService().AddProjectDeletionListener(logCoreService)
}
