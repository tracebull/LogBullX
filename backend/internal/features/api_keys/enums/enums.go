package api_keys_enums

type ApiKeyStatus string

const (
	ApiKeyStatusActive   ApiKeyStatus = "ACTIVE"
	ApiKeyStatusDisabled ApiKeyStatus = "DISABLED"
	ApiKeyStatusNotFound ApiKeyStatus = "NOT_FOUND"
)
