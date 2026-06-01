package api_keys_repositories

import (
	"time"

	api_keys_enums "logbull/internal/features/api_keys/enums"
	api_keys_models "logbull/internal/features/api_keys/models"
	"logbull/internal/storage"

	"github.com/google/uuid"
)

type ApiKeyRepository struct{}

func (r *ApiKeyRepository) CreateApiKey(apiKey *api_keys_models.ApiKey) error {
	if apiKey.ID == uuid.Nil {
		apiKey.ID = uuid.New()
	}

	if apiKey.CreatedAt.IsZero() {
		apiKey.CreatedAt = time.Now().UTC()
	}

	return storage.GetDb().Create(apiKey).Error
}

func (r *ApiKeyRepository) GetApiKeysByProjectID(projectID uuid.UUID) ([]*api_keys_models.ApiKey, error) {
	var apiKeys []*api_keys_models.ApiKey

	err := storage.GetDb().
		Where("project_id = ?", projectID).
		Order("created_at DESC").
		Find(&apiKeys).Error

	return apiKeys, err
}

func (r *ApiKeyRepository) GetApiKeyByID(apiKeyID uuid.UUID) (*api_keys_models.ApiKey, error) {
	var apiKey api_keys_models.ApiKey

	err := storage.GetDb().
		Where("id = ?", apiKeyID).
		First(&apiKey).Error

	if err != nil {
		return nil, err
	}

	return &apiKey, nil
}

func (r *ApiKeyRepository) GetApiKeyByTokenHash(tokenHash string) (*api_keys_models.ApiKey, error) {
	var apiKey api_keys_models.ApiKey

	err := storage.GetDb().
		Where("token_hash = ? AND status = ?", tokenHash, api_keys_enums.ApiKeyStatusActive).
		First(&apiKey).Error

	if err != nil {
		return nil, err
	}

	return &apiKey, nil
}

func (r *ApiKeyRepository) UpdateApiKey(apiKey *api_keys_models.ApiKey) error {
	return storage.GetDb().Save(apiKey).Error
}

func (r *ApiKeyRepository) DeleteApiKey(apiKeyID uuid.UUID) error {
	return storage.GetDb().Delete(&api_keys_models.ApiKey{}, apiKeyID).Error
}
