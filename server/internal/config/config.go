package config

import (
	"os"
)

type Config struct {
	DatabaseURL   string
	JWTSecret     string
	AdminUsername string
	AdminPassword string
	Port          string
}

func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://xray:xray_secret@localhost:5432/xray_dashboard?sslmode=disable"),
		JWTSecret:     getEnv("JWT_SECRET", "change_me_in_production_32chars!"),
		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
		Port:          getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
