package database

import (
	"log"

	"xray-dashboard/server/internal/config"
	"xray-dashboard/server/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(
		&models.Server{},
		&models.LogEntry{},
		&models.AdminUser{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Create indexes for common query patterns
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp_user ON log_entries (timestamp DESC, user_email)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_log_entries_dest_host ON log_entries (dest_host, timestamp DESC)`)

	ensureAdmin(db, cfg)
	return db
}

func ensureAdmin(db *gorm.DB, cfg *config.Config) {
	var count int64
	db.Model(&models.AdminUser{}).Where("username = ?", cfg.AdminUsername).Count(&count)
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash admin password: %v", err)
	}

	admin := models.AdminUser{
		Username:     cfg.AdminUsername,
		PasswordHash: string(hash),
	}
	if err := db.Create(&admin).Error; err != nil {
		log.Fatalf("failed to create admin user: %v", err)
	}
	log.Printf("created admin user: %s", cfg.AdminUsername)
}
