package api_keys

import (
	"logbull/internal/cache"
	api_keys_controllers "logbull/internal/features/api_keys/controllers"
	api_keys_dto "logbull/internal/features/api_keys/dto"
	api_keys_repositories "logbull/internal/features/api_keys/repositories"
	api_keys_services "logbull/internal/features/api_keys/services"
	audit_logs "logbull/internal/features/audit_logs"
	projects_services "logbull/internal/features/projects/services"
	cache_utils "logbull/internal/util/cache"

	"golang.org/x/sync/singleflight"
)

var apiKeyRepository = &api_keys_repositories.ApiKeyRepository{}

var apiKeyService = &api_keys_services.ApiKeyService{
	apiKeyRepository,
	projects_services.GetProjectService(),
	audit_logs.GetAuditLogService(),
	cache_utils.NewCacheUtil[api_keys_dto.CachedApiKey](cache.GetCache(), "lb_apikey:"),
	singleflight.Group{},
}

var apiKeyController = &api_keys_controllers.ApiKeyController{
	apiKeyService,
}

func GetApiKeyService() *api_keys_services.ApiKeyService {
	return apiKeyService
}

func GetApiKeyController() *api_keys_controllers.ApiKeyController {
	return apiKeyController
}
