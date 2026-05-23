package parser

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// LogEntry represents a parsed Xray access log line.
type LogEntry struct {
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

// Matches both formats:
// from 1.2.3.4:PORT accepted proto:host:port [IN -> OUT] email: USER
// from proto:1.2.3.4:PORT accepted proto:host:port [IN -> OUT] email: USER
var logRe = regexp.MustCompile(
	`^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}\.\d+) ` +
		`from (?:(\w+):)?(\d+\.\d+\.\d+\.\d+):(\d+) ` +
		`accepted (\w+):(.+):(\d+) ` +
		`\[([^\s\]]+) -> ([^\]]+)\] ` +
		`email: (.+)$`,
)

const timestampLayout = "2006/01/02 15:04:05.000000"

func Parse(line string) (*LogEntry, error) {
	line = strings.TrimSpace(line)
	m := logRe.FindStringSubmatch(line)
	if m == nil {
		return nil, fmt.Errorf("no match")
	}

	ts, err := time.ParseInLocation(timestampLayout, m[1], time.UTC)
	if err != nil {
		return nil, fmt.Errorf("parsing timestamp: %w", err)
	}

	srcPort, _ := strconv.Atoi(m[4])
	dstPort, _ := strconv.Atoi(m[7])

	return &LogEntry{
		Timestamp:      ts,
		SourceProtocol: m[2],
		SourceIP:       m[3],
		SourcePort:     srcPort,
		DestProtocol:   m[5],
		DestHost:       m[6],
		DestPort:       dstPort,
		Inbound:        m[8],
		Outbound:       strings.TrimSpace(m[9]),
		UserEmail:      strings.TrimSpace(m[10]),
	}, nil
}
