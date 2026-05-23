package handlers

import (
	"net/http"
	"strconv"

	"xray-dashboard/server/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LogsHandler struct {
	db *gorm.DB
}

func NewLogsHandler(db *gorm.DB) *LogsHandler {
	return &LogsHandler{db: db}
}

func (h *LogsHandler) List(c *gin.Context) {
	tr := parseTimeRange(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "100"))
	if pageSize > 500 {
		pageSize = 500
	}
	if page < 1 {
		page = 1
	}

	userEmail := c.Query("user_email")
	destHost := c.Query("dest_host")
	serverID := c.Query("server_id")

	query := h.db.Model(&models.LogEntry{}).
		Where("timestamp BETWEEN ? AND ?", tr.From, tr.To).
		Order("timestamp DESC")

	if userEmail != "" {
		query = query.Where("user_email = ?", userEmail)
	}
	if destHost != "" {
		query = query.Where("dest_host ILIKE ?", "%"+destHost+"%")
	}
	if serverID != "" {
		if id, err := uuid.Parse(serverID); err == nil {
			query = query.Where("server_id = ?", id)
		}
	}

	var total int64
	query.Count(&total)

	entries := make([]models.LogEntry, 0)
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&entries)

	c.JSON(http.StatusOK, gin.H{
		"entries":   entries,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
