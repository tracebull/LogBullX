package disk

import (
	disk_controllers "logbull/internal/features/disk/controllers"
	disk_services "logbull/internal/features/disk/services"
)

var (
	diskService    *disk_services.DiskService
	diskController *disk_controllers.DiskController
)

func init() {
	diskService = &disk_services.DiskService{}

	diskController = &disk_controllers.DiskController{
		diskService,
	}
}

func GetDiskService() *disk_services.DiskService {
	return diskService
}

func GetDiskController() *disk_controllers.DiskController {
	return diskController
}
