package downdetect

import (
	logs_core "logbull/internal/features/logs/core"
)

var downdetectService = &DowndetectService{
	logs_core.GetLogStorage(),
}
var downdetectController = &DowndetectController{
	downdetectService,
}

func GetDowndetectController() *DowndetectController {
	return downdetectController
}
