package api_keys_services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	audit_logs_services "logbull/internal/features/audit_logs/services"
	api_keys_dto "logbull/internal/features/api_keys/dto"
	api_keys_enums "logbull/internal/features/api_keys/enums"
	api_keys_models "logbull/internal/features/api_keys/models"
	api_keys_repositories "logbull/internal/features/api_keys/repositories"
	projects_services "logbull/internal/features/projects/services"
	users_models "logbull/internal/features/users/models"
	cache_utils "logbull/internal/util/cache"

	"github.com/google/uuid"
	"golang.org/x/sync/singleflight"
)

type ApiKeyService struct {
	ApiKeyRepository  *api_keys_repositories.ApiKeyRepository
	ProjectService    *projects_services.ProjectService
	AuditLogService   *audit_logs_services.AuditLogService
	ApiKeyCacheUtil   *cache_utils.CacheUtil[api_keys_dto.CachedApiKey]
	Singleflight      singleflight.Group
}

const (
	TokenPrefix = "lb_"
	TokenLength = 32
)

func (s *ApiKeyService) CreateApiKey(
	projectID uuid.UUID,
	request *api_keys_dto.CreateApiKeyRequestDTO,
	creator *users_models.User,
) (*api_keys_models.ApiKey, error) {
	canManage, err := s.ProjectService.CanUserManageProject(projectID, creator)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("insufficient permissions to create API keys")
	}

	fullToken, tokenPrefix, tokenHash, err := s.generateSecureToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	apiKey := &api_keys_models.ApiKey{
		ID:          uuid.New(),
		Name:        request.Name,
		ProjectID:   projectID,
		TokenPrefix: tokenPrefix,
		TokenHash:   tokenHash,
		Status:      api_keys_enums.ApiKeyStatusActive,
	}

	if err := s.ApiKeyRepository.CreateApiKey(apiKey); err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	cachedKey := &api_keys_dto.CachedApiKey{
		ID:        apiKey.ID,
		ProjectID: apiKey.ProjectID,
		Status:    apiKey.Status,
	}
	s.ApiKeyCacheUtil.Set(tokenHash, cachedKey)

	s.AuditLogService.WriteAuditLog(
		fmt.Sprintf("API key created: %s (%s)", request.Name, tokenPrefix),
		&creator.ID,
		&projectID,
	)

	apiKey.Token = fullToken

	return apiKey, nil
}

func (s *ApiKeyService) GetProjectApiKeys(
	projectID uuid.UUID,
	user *users_models.User,
) (*api_keys_dto.GetApiKeysResponseDTO, error) {
	canAccess, _, err := s.ProjectService.CanUserAccessProject(projectID, user)
	if err != nil {
		return nil, err
	}
	if !canAccess {
		return nil, errors.New("insufficient permissions to view API keys")
	}

	apiKeys, err := s.ApiKeyRepository.GetApiKeysByProjectID(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get API keys: %w", err)
	}

	return &api_keys_dto.GetApiKeysResponseDTO{
		ApiKeys: apiKeys,
	}, nil
}

func (s *ApiKeyService) UpdateApiKey(
	projectID uuid.UUID,
	apiKeyID uuid.UUID,
	request *api_keys_dto.UpdateApiKeyRequestDTO,
	updater *users_models.User,
) error {
	canManage, err := s.ProjectService.CanUserManageProject(projectID, updater)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("insufficient permissions to update API keys")
	}

	apiKey, err := s.ApiKeyRepository.GetApiKeyByID(apiKeyID)
	if err != nil {
		return errors.New("API key not found")
	}

	if apiKey.ProjectID != projectID {
		return errors.New("API key does not belong to this project")
	}

	if request.Name != nil {
		apiKey.Name = *request.Name
	}

	if request.Status != nil {
		apiKey.Status = *request.Status
	}

	if err := s.ApiKeyRepository.UpdateApiKey(apiKey); err != nil {
		return fmt.Errorf("failed to update API key: %w", err)
	}

	s.ApiKeyCacheUtil.Invalidate(apiKey.TokenHash)

	s.AuditLogService.WriteAuditLog(
		fmt.Sprintf("API key updated: %s (%s)", apiKey.Name, apiKey.TokenPrefix),
		&updater.ID,
		&projectID,
	)

	return nil
}

func (s *ApiKeyService) DeleteApiKey(
	projectID uuid.UUID,
	apiKeyID uuid.UUID,
	deleter *users_models.User,
) error {
	canManage, err := s.ProjectService.CanUserManageProject(projectID, deleter)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("insufficient permissions to delete API keys")
	}

	apiKey, err := s.ApiKeyRepository.GetApiKeyByID(apiKeyID)
	if err != nil {
		return errors.New("API key not found")
	}

	if apiKey.ProjectID != projectID {
		return errors.New("API key does not belong to this project")
	}

	if err := s.ApiKeyRepository.DeleteApiKey(apiKeyID); err != nil {
		return fmt.Errorf("failed to delete API key: %w", err)
	}

	s.ApiKeyCacheUtil.Invalidate(apiKey.TokenHash)

	s.AuditLogService.WriteAuditLog(
		fmt.Sprintf("API key deleted: %s (%s)", apiKey.Name, apiKey.TokenPrefix),
		&deleter.ID,
		&projectID,
	)

	return nil
}

func (s *ApiKeyService) ValidateApiKey(token string, projectID uuid.UUID) (*api_keys_dto.ValidateTokenResponse, error) {
	if !strings.HasPrefix(token, TokenPrefix) {
		return &api_keys_dto.ValidateTokenResponse{IsValid: false}, nil
	}

	tokenHash := s.hashToken(token)

	if cachedKey := s.ApiKeyCacheUtil.Get(tokenHash); cachedKey != nil {
		if cachedKey.ProjectID != projectID || cachedKey.Status != api_keys_enums.ApiKeyStatusActive {
			return &api_keys_dto.ValidateTokenResponse{IsValid: false}, nil
		}

		return &api_keys_dto.ValidateTokenResponse{
			IsValid:   true,
			ApiKeyID:  cachedKey.ID,
			ProjectID: cachedKey.ProjectID,
		}, nil
	}

	result, err, _ := s.Singleflight.Do(tokenHash, func() (any, error) {
		return s.ApiKeyRepository.GetApiKeyByTokenHash(tokenHash)
	})

	if err != nil {
		invalidCachedKey := &api_keys_dto.CachedApiKey{
			ID:        uuid.Nil,
			ProjectID: uuid.Nil,
			Status:    api_keys_enums.ApiKeyStatusNotFound,
		}

		s.ApiKeyCacheUtil.Set(tokenHash, invalidCachedKey)
		return &api_keys_dto.ValidateTokenResponse{IsValid: false}, nil
	}

	apiKey, ok := result.(*api_keys_models.ApiKey)
	if !ok {
		return &api_keys_dto.ValidateTokenResponse{IsValid: false}, fmt.Errorf("failed to cast result to ApiKey")
	}

	if apiKey.ProjectID != projectID || apiKey.Status != api_keys_enums.ApiKeyStatusActive {
		return &api_keys_dto.ValidateTokenResponse{IsValid: false}, nil
	}

	cachedKey := &api_keys_dto.CachedApiKey{
		ID:        apiKey.ID,
		ProjectID: apiKey.ProjectID,
		Status:    apiKey.Status,
	}
	s.ApiKeyCacheUtil.Set(tokenHash, cachedKey)

	return &api_keys_dto.ValidateTokenResponse{
		IsValid:   true,
		ApiKeyID:  apiKey.ID,
		ProjectID: apiKey.ProjectID,
	}, nil
}

func (s *ApiKeyService) generateSecureToken() (fullToken, prefix, hash string, err error) {
	tokenBytes := make([]byte, TokenLength/2)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", "", err
	}

	tokenSuffix := hex.EncodeToString(tokenBytes)
	fullToken = TokenPrefix + tokenSuffix
	prefix = TokenPrefix + tokenSuffix[:6] + "..."
	hash = s.hashToken(fullToken)

	return fullToken, prefix, hash, nil
}

func (s *ApiKeyService) hashToken(token string) string {
	hasher := sha256.New()
	hasher.Write([]byte(token))
	return hex.EncodeToString(hasher.Sum(nil))
}
