package api

import (
	"xray-dashboard/server/internal/api/handlers"
	"xray-dashboard/server/internal/api/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NewRouter(db *gorm.DB, jwtSecret string) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	authH := handlers.NewAuthHandler(db, jwtSecret)
	serversH := handlers.NewServersHandler(db)
	ingestH := handlers.NewIngestHandler(db)
	statsH := handlers.NewStatsHandler(db)
	logsH := handlers.NewLogsHandler(db)

	// Agent ingestion endpoint — authenticated via API key
	ingest := r.Group("/api/ingest")
	ingest.Use(middleware.APIKeyAuth(db))
	ingest.POST("", ingestH.Ingest)

	// Public auth
	auth := r.Group("/api/auth")
	auth.POST("/login", authH.Login)

	// Admin routes — authenticated via JWT
	admin := r.Group("/api")
	admin.Use(middleware.JWTAuth(jwtSecret))

	admin.GET("/auth/me", authH.Me)

	admin.GET("/servers", serversH.List)
	admin.POST("/servers", serversH.Create)
	admin.DELETE("/servers/:id", serversH.Delete)

	admin.GET("/stats/overview", statsH.Overview)
	admin.GET("/stats/users", statsH.TopUsers)
	admin.GET("/stats/users/:email", statsH.UserDetail)
	admin.GET("/stats/destinations", statsH.TopDestinations)
	admin.GET("/stats/timeline", statsH.Timeline)
	admin.GET("/stats/inbound", statsH.InboundStats)

	admin.GET("/logs", logsH.List)

	return r
}
