package disk_controllers

import (
	"net/http"

	disk_services "logbull/internal/features/disk/services"

	"github.com/gin-gonic/gin"
)

type DiskController struct {
	DiskService *disk_services.DiskService
}

func (c *DiskController) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/disk/usage", c.GetDiskUsage)
}

// GetDiskUsage
// @Summary Get disk usage information
// @Description Returns information about disk space usage
// @Tags disk
// @Produce json
// @Success 200 {object} disk_dto.DiskUsage
// @Failure 500
// @Router /disk/usage [get]
func (c *DiskController) GetDiskUsage(ctx *gin.Context) {
	diskUsage, err := c.DiskService.GetDiskUsage()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, diskUsage)
}
