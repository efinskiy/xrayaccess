package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StatsHandler struct {
	db *gorm.DB
}

func NewStatsHandler(db *gorm.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

type timeRange struct {
	From time.Time
	To   time.Time
}

func parseTimeRange(c *gin.Context) timeRange {
	to := time.Now()
	from := to.Add(-24 * time.Hour)

	if v := c.Query("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := c.Query("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}
	return timeRange{From: from, To: to}
}

func (h *StatsHandler) Overview(c *gin.Context) {
	tr := parseTimeRange(c)

	var totalRequests int64
	h.db.Model(nil).Table("log_entries").
		Where("timestamp BETWEEN ? AND ?", tr.From, tr.To).
		Count(&totalRequests)

	var uniqueUsers int64
	h.db.Model(nil).Table("log_entries").
		Where("timestamp BETWEEN ? AND ?", tr.From, tr.To).
		Distinct("user_email").Count(&uniqueUsers)

	var uniqueDests int64
	h.db.Model(nil).Table("log_entries").
		Where("timestamp BETWEEN ? AND ?", tr.From, tr.To).
		Distinct("dest_host").Count(&uniqueDests)

	var activeServers int64
	h.db.Model(nil).Table("log_entries").
		Where("timestamp BETWEEN ? AND ?", tr.From, tr.To).
		Distinct("server_id").Count(&activeServers)

	c.JSON(http.StatusOK, gin.H{
		"total_requests":  totalRequests,
		"unique_users":    uniqueUsers,
		"unique_dests":    uniqueDests,
		"active_servers":  activeServers,
		"from":            tr.From,
		"to":              tr.To,
	})
}

type userStat struct {
	UserEmail   string `json:"user_email" gorm:"column:user_email"`
	Requests    int64  `json:"requests" gorm:"column:requests"`
	UniqueDests int64  `json:"unique_dests" gorm:"column:unique_dests"`
}

func (h *StatsHandler) TopUsers(c *gin.Context) {
	tr := parseTimeRange(c)
	limit := 50

	var stats []userStat
	h.db.Raw(`
		SELECT user_email,
		       COUNT(*) AS requests,
		       COUNT(DISTINCT dest_host) AS unique_dests
		FROM log_entries
		WHERE timestamp BETWEEN ? AND ?
		  AND user_email != ''
		GROUP BY user_email
		ORDER BY requests DESC
		LIMIT ?
	`, tr.From, tr.To, limit).Scan(&stats)

	c.JSON(http.StatusOK, stats)
}

type destStat struct {
	DestHost    string `json:"dest_host" gorm:"column:dest_host"`
	Requests    int64  `json:"requests" gorm:"column:requests"`
	UniqueUsers int64  `json:"unique_users" gorm:"column:unique_users"`
}

func (h *StatsHandler) TopDestinations(c *gin.Context) {
	tr := parseTimeRange(c)
	userEmail := c.Query("user_email")
	limit := 50

	query := h.db.Raw(`
		SELECT dest_host,
		       COUNT(*) AS requests,
		       COUNT(DISTINCT user_email) AS unique_users
		FROM log_entries
		WHERE timestamp BETWEEN ? AND ?
		  AND dest_host != ''
		  AND (? = '' OR user_email = ?)
		GROUP BY dest_host
		ORDER BY requests DESC
		LIMIT ?
	`, tr.From, tr.To, userEmail, userEmail, limit)

	var stats []destStat
	query.Scan(&stats)
	c.JSON(http.StatusOK, stats)
}

type timelineBucket struct {
	Time     time.Time `json:"time" gorm:"column:bucket"`
	Requests int64     `json:"requests" gorm:"column:requests"`
}

func (h *StatsHandler) Timeline(c *gin.Context) {
	tr := parseTimeRange(c)
	userEmail := c.Query("user_email")

	// Choose bucket size based on range
	duration := tr.To.Sub(tr.From)
	var truncate string
	switch {
	case duration <= 2*time.Hour:
		truncate = "minute"
	case duration <= 48*time.Hour:
		truncate = "hour"
	default:
		truncate = "day"
	}

	var buckets []timelineBucket
	h.db.Raw(`
		SELECT DATE_TRUNC(?, timestamp) AS bucket,
		       COUNT(*) AS requests
		FROM log_entries
		WHERE timestamp BETWEEN ? AND ?
		  AND (? = '' OR user_email = ?)
		GROUP BY bucket
		ORDER BY bucket ASC
	`, truncate, tr.From, tr.To, userEmail, userEmail).Scan(&buckets)

	c.JSON(http.StatusOK, buckets)
}

type userDetail struct {
	UserEmail   string     `json:"user_email"`
	Requests    int64      `json:"requests"`
	UniqueDests int64      `json:"unique_dests"`
	FirstSeen   *time.Time `json:"first_seen"`
	LastSeen    *time.Time `json:"last_seen"`
}

func (h *StatsHandler) UserDetail(c *gin.Context) {
	email := c.Param("email")
	tr := parseTimeRange(c)

	var detail userDetail
	h.db.Raw(`
		SELECT user_email,
		       COUNT(*) AS requests,
		       COUNT(DISTINCT dest_host) AS unique_dests,
		       MIN(timestamp) AS first_seen,
		       MAX(timestamp) AS last_seen
		FROM log_entries
		WHERE user_email = ?
		  AND timestamp BETWEEN ? AND ?
		GROUP BY user_email
	`, email, tr.From, tr.To).Scan(&detail)

	detail.UserEmail = email
	c.JSON(http.StatusOK, detail)
}

type inboundStat struct {
	Inbound  string `json:"inbound" gorm:"column:inbound"`
	Requests int64  `json:"requests" gorm:"column:requests"`
}

func (h *StatsHandler) InboundStats(c *gin.Context) {
	tr := parseTimeRange(c)

	var stats []inboundStat
	h.db.Raw(`
		SELECT inbound,
		       COUNT(*) AS requests
		FROM log_entries
		WHERE timestamp BETWEEN ? AND ?
		  AND inbound != ''
		GROUP BY inbound
		ORDER BY requests DESC
		LIMIT 20
	`, tr.From, tr.To).Scan(&stats)

	c.JSON(http.StatusOK, stats)
}
