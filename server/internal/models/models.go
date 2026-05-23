package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Server struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name       string     `gorm:"not null" json:"name"`
	APIKey     string     `gorm:"uniqueIndex;not null" json:"-"`
	IPAddress  string     `json:"ip_address"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (s *Server) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type LogEntry struct {
	ID             int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	ServerID       uuid.UUID `gorm:"type:uuid;index" json:"server_id"`
	Timestamp      time.Time `gorm:"index" json:"timestamp"`
	SourceIP       string    `gorm:"index" json:"source_ip"`
	SourcePort     int       `json:"source_port"`
	SourceProtocol string    `json:"source_protocol"`
	DestProtocol   string    `json:"dest_protocol"`
	DestHost       string    `gorm:"index" json:"dest_host"`
	DestPort       int       `json:"dest_port"`
	Inbound        string    `json:"inbound"`
	Outbound       string    `json:"outbound"`
	UserEmail      string    `gorm:"index" json:"user_email"`
	CreatedAt      time.Time `json:"created_at"`
}

type AdminUser struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

func (u *AdminUser) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
