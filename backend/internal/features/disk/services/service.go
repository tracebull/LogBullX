package disk_services

import (
	"fmt"
	"runtime"

	disk_dto "logbull/internal/features/disk/dto"
	disk_enums "logbull/internal/features/disk/enums"

	"github.com/shirou/gopsutil/v4/disk"
)

type DiskService struct{}

func (s *DiskService) GetDiskUsage() (*disk_dto.DiskUsage, error) {
	platform := s.detectPlatform()

	path := "/"
	if platform == disk_enums.PlatformWindows {
		path = "C:\\"
	}

	diskUsage, err := disk.Usage(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get disk usage for path %s: %w", path, err)
	}

	return &disk_dto.DiskUsage{
		Platform:        platform,
		TotalSpaceBytes: int64(diskUsage.Total),
		UsedSpaceBytes:  int64(diskUsage.Used),
		FreeSpaceBytes:  int64(diskUsage.Free),
	}, nil
}

func (s *DiskService) detectPlatform() disk_enums.Platform {
	switch runtime.GOOS {
	case "windows":
		return disk_enums.PlatformWindows
	default:
		return disk_enums.PlatformLinux
	}
}
