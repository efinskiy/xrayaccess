package sender

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"xray-dashboard/agent/internal/parser"
)

type Sender struct {
	serverURL string
	apiKey    string
	client    *http.Client
}

func New(serverURL, apiKey string, skipTLS bool) *Sender {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: skipTLS}, //nolint:gosec
	}
	return &Sender{
		serverURL: serverURL,
		apiKey:    apiKey,
		client: &http.Client{
			Transport: transport,
			Timeout:   15 * time.Second,
		},
	}
}

type payload struct {
	Entries []*parser.LogEntry `json:"entries"`
}

func (s *Sender) Send(entries []*parser.LogEntry) error {
	if len(entries) == 0 {
		return nil
	}

	body, err := json.Marshal(payload{Entries: entries})
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, s.serverURL+"/api/ingest", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned %d", resp.StatusCode)
	}
	return nil
}

// SendWithRetry retries up to maxAttempts with exponential backoff.
func (s *Sender) SendWithRetry(entries []*parser.LogEntry, maxAttempts int) {
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err := s.Send(entries); err != nil {
			log.Printf("send attempt %d/%d failed: %v", attempt, maxAttempts, err)
			if attempt < maxAttempts {
				time.Sleep(time.Duration(attempt*attempt) * time.Second)
			}
			continue
		}
		return
	}
	log.Printf("dropping batch of %d entries after %d failed attempts", len(entries), maxAttempts)
}
