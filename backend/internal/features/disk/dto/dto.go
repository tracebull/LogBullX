package disk_dto

import disk_enums "logbull/internal/features/disk/enums"

type DiskUsage struct {
	Platform        disk_enums.Platform `json:"platform"`
	TotalSpaceBytes int64               `json:"totalSpaceBytes"`
	UsedSpaceBytes  int64               `json:"usedSpaceBytes"`
	FreeSpaceBytes  int64               `json:"freeSpaceBytes"`
}
