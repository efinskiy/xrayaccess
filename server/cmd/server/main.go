package main

import (
	"log"

	"xray-dashboard/server/internal/api"
	"xray-dashboard/server/internal/config"
	"xray-dashboard/server/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()
	db := database.Connect(cfg)

	router := api.NewRouter(db, cfg.JWTSecret)

	log.Printf("starting server on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
