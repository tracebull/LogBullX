package api_keys_models

import (
	"time"

	api_keys_enums "logbull/internal/features/api_keys/enums"

	"github.com/google/uuid"
)

type ApiKey struct {
	ID          uuid.UUID            `json:"id"          gorm:"column:id"`
	Name        string               `json:"name"        gorm:"column:name"`
	ProjectID   uuid.UUID            `json:"projectId"   gorm:"column:project_id"`
	TokenPrefix string               `json:"tokenPrefix" gorm:"column:token_prefix"`
	TokenHash   string               `json:"-"           gorm:"column:token_hash"`
	Status      api_keys_enums.ApiKeyStatus `json:"status"      gorm:"column:status"`
	CreatedAt   time.Time            `json:"createdAt"   gorm:"column:created_at"`

	Token string `json:"token,omitempty" gorm:"-"`
}

func (ApiKey) TableName() string {
	return "api_keys"
}
