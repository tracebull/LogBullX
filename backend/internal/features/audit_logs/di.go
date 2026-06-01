package audit_logs

import (
	audit_logs_controllers "logbull/internal/features/audit_logs/controllers"
	audit_logs_repositories "logbull/internal/features/audit_logs/repositories"
	audit_logs_services "logbull/internal/features/audit_logs/services"
	users_services "logbull/internal/features/users/services"
	"logbull/internal/util/logger"
)

var auditLogRepository = &audit_logs_repositories.AuditLogRepository{}
var auditLogService = &audit_logs_services.AuditLogService{
	auditLogRepository,
	logger.GetLogger(),
}
var auditLogController = &audit_logs_controllers.AuditLogController{
	auditLogService,
}

func GetAuditLogService() *audit_logs_services.AuditLogService {
	return auditLogService
}

func GetAuditLogController() *audit_logs_controllers.AuditLogController {
	return auditLogController
}

func SetupDependencies() {
	users_services.GetUserService().SetAuditLogWriter(auditLogService)
	users_services.GetSettingsService().SetAuditLogWriter(auditLogService)
	users_services.GetManagementService().SetAuditLogWriter(auditLogService)
	users_services.GetUserPlanService().SetAuditLogWriter(auditLogService)
}
