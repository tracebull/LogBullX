package audit_logs_services

import (
	"errors"
	"log/slog"
	"time"

	audit_logs_dto "logbull/internal/features/audit_logs/dto"
	audit_logs_models "logbull/internal/features/audit_logs/models"
	audit_logs_repositories "logbull/internal/features/audit_logs/repositories"
	user_enums "logbull/internal/features/users/enums"
	user_models "logbull/internal/features/users/models"

	"github.com/google/uuid"
)

type AuditLogService struct {
	AuditLogRepository *audit_logs_repositories.AuditLogRepository
	Logger             *slog.Logger
}

func (s *AuditLogService) WriteAuditLog(
	message string,
	userID *uuid.UUID,
	projectID *uuid.UUID,
) {
	auditLog := &audit_logs_models.AuditLog{
		UserID:    userID,
		ProjectID: projectID,
		Message:   message,
		CreatedAt: time.Now().UTC(),
	}

	err := s.AuditLogRepository.Create(auditLog)
	if err != nil {
		s.Logger.Error("failed to create audit log", "error", err)
		return
	}
}

func (s *AuditLogService) CreateAuditLog(auditLog *audit_logs_models.AuditLog) error {
	return s.AuditLogRepository.Create(auditLog)
}

func (s *AuditLogService) GetGlobalAuditLogs(
	user *user_models.User,
	request *audit_logs_dto.GetAuditLogsRequest,
) (*audit_logs_dto.GetAuditLogsResponse, error) {
	if user.Role != user_enums.UserRoleAdmin {
		return nil, errors.New("only administrators can view global audit logs")
	}

	limit := request.Limit
	if limit <= 0 || limit > 1000 {
		limit = 100
	}

	offset := max(request.Offset, 0)

	auditLogs, err := s.AuditLogRepository.GetGlobal(limit, offset, request.BeforeDate)
	if err != nil {
		return nil, err
	}

	total, err := s.AuditLogRepository.CountGlobal(request.BeforeDate)
	if err != nil {
		return nil, err
	}

	return &audit_logs_dto.GetAuditLogsResponse{
		AuditLogs: auditLogs,
		Total:     total,
		Limit:     limit,
		Offset:    offset,
	}, nil
}

func (s *AuditLogService) GetUserAuditLogs(
	targetUserID uuid.UUID,
	user *user_models.User,
	request *audit_logs_dto.GetAuditLogsRequest,
) (*audit_logs_dto.GetAuditLogsResponse, error) {
	if user.Role != user_enums.UserRoleAdmin && user.ID != targetUserID {
		return nil, errors.New("insufficient permissions to view user audit logs")
	}

	limit := request.Limit
	if limit <= 0 || limit > 1000 {
		limit = 100
	}

	offset := max(request.Offset, 0)

	auditLogs, err := s.AuditLogRepository.GetByUser(targetUserID, limit, offset, request.BeforeDate)
	if err != nil {
		return nil, err
	}

	return &audit_logs_dto.GetAuditLogsResponse{
		AuditLogs: auditLogs,
		Total:     int64(len(auditLogs)),
		Limit:     limit,
		Offset:    offset,
	}, nil
}

func (s *AuditLogService) GetProjectAuditLogs(
	projectID uuid.UUID,
	request *audit_logs_dto.GetAuditLogsRequest,
) (*audit_logs_dto.GetAuditLogsResponse, error) {
	limit := request.Limit
	if limit <= 0 || limit > 1000 {
		limit = 100
	}

	offset := max(request.Offset, 0)

	auditLogs, err := s.AuditLogRepository.GetByProject(projectID, limit, offset, request.BeforeDate)
	if err != nil {
		return nil, err
	}

	return &audit_logs_dto.GetAuditLogsResponse{
		AuditLogs: auditLogs,
		Total:     int64(len(auditLogs)),
		Limit:     limit,
		Offset:    offset,
	}, nil
}
