package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"xray-dashboard/server/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServersHandler struct {
	db *gorm.DB
}

func NewServersHandler(db *gorm.DB) *ServersHandler {
	return &ServersHandler{db: db}
}

func (h *ServersHandler) List(c *gin.Context) {
	var servers []models.Server
	h.db.Order("created_at DESC").Find(&servers)
	c.JSON(http.StatusOK, servers)
}

type createServerRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *ServersHandler) Create(c *gin.Context) {
	var req createServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, err := generateAPIKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate key"})
		return
	}

	server := models.Server{
		Name:   req.Name,
		APIKey: key,
	}
	if err := h.db.Create(&server).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         server.ID,
		"name":       server.Name,
		"api_key":    server.APIKey,
		"created_at": server.CreatedAt,
	})
}

func (h *ServersHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.db.Delete(&models.Server{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func generateAPIKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
