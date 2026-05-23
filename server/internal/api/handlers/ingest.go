package handlers

import (
	"net/http"
	"time"

	"xray-dashboard/server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type IngestHandler struct {
	db *gorm.DB
}

func NewIngestHandler(db *gorm.DB) *IngestHandler {
	return &IngestHandler{db: db}
}

type ingestEntry struct {
	Timestamp      time.Time `json:"timestamp"`
	SourceIP       string    `json:"source_ip"`
	SourcePort     int       `json:"source_port"`
	SourceProtocol string    `json:"source_protocol"`
	DestProtocol   string    `json:"dest_protocol"`
	DestHost       string    `json:"dest_host"`
	DestPort       int       `json:"dest_port"`
	Inbound        string    `json:"inbound"`
	Outbound       string    `json:"outbound"`
	UserEmail      string    `json:"user_email"`
}

type ingestRequest struct {
	Entries []ingestEntry `json:"entries" binding:"required"`
}

func (h *IngestHandler) Ingest(c *gin.Context) {
	server := c.MustGet("server").(*models.Server)

	var req ingestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Entries) == 0 {
		c.JSON(http.StatusOK, gin.H{"inserted": 0})
		return
	}

	entries := make([]models.LogEntry, 0, len(req.Entries))
	for _, e := range req.Entries {
		entries = append(entries, models.LogEntry{
			ServerID:       server.ID,
			Timestamp:      e.Timestamp,
			SourceIP:       e.SourceIP,
			SourcePort:     e.SourcePort,
			SourceProtocol: e.SourceProtocol,
			DestProtocol:   e.DestProtocol,
			DestHost:       e.DestHost,
			DestPort:       e.DestPort,
			Inbound:        e.Inbound,
			Outbound:       e.Outbound,
			UserEmail:      e.UserEmail,
		})
	}

	// Batch insert
	if err := h.db.CreateInBatches(entries, 500).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update server last_seen
	now := time.Now()
	h.db.Model(server).Updates(map[string]any{
		"last_seen_at": now,
		"ip_address":   c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"inserted": len(entries)})
}
