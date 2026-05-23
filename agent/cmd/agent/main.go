package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"xray-dashboard/agent/internal/config"
	"xray-dashboard/agent/internal/parser"
	"xray-dashboard/agent/internal/sender"

	"github.com/nxadm/tail"
)

// version is set at build time via -ldflags "-X main.version=vX.Y.Z"
var version = "dev"

func main() {
	configPath := flag.String("config", "/etc/xray-agent/config.yaml", "path to config file")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()

	if *showVersion {
		log.Printf("xray-agent %s", version)
		return
	}

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	log.Printf("xray-agent %s starting: log=%s server=%s", version, cfg.LogFile, cfg.ServerURL)

	s := sender.New(cfg.ServerURL, cfg.APIKey, cfg.TLSSkipVerify)

	t, err := tail.TailFile(cfg.LogFile, tail.Config{
		Follow:    true,
		ReOpen:    true, // handle log rotation
		MustExist: false,
		Location:  &tail.SeekInfo{Offset: 0, Whence: os.SEEK_END},
		Logger:    tail.DiscardingLogger,
	})
	if err != nil {
		log.Fatalf("tail error: %v", err)
	}
	defer t.Cleanup()

	var buffer []*parser.LogEntry
	ticker := time.NewTicker(cfg.FlushInterval)
	defer ticker.Stop()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	flush := func() {
		if len(buffer) == 0 {
			return
		}
		batch := buffer
		buffer = nil
		go s.SendWithRetry(batch, 5)
	}

	for {
		select {
		case line, ok := <-t.Lines:
			if !ok {
				flush()
				return
			}
			if line.Err != nil {
				log.Printf("tail error: %v", line.Err)
				continue
			}

			entry, err := parser.Parse(line.Text)
			if err != nil {
				continue // not an access log line
			}

			buffer = append(buffer, entry)
			if len(buffer) >= cfg.BatchSize {
				flush()
			}

		case <-ticker.C:
			flush()

		case <-sigCh:
			log.Println("shutting down, flushing buffer...")
			flush()
			time.Sleep(2 * time.Second) // wait for in-flight sends
			return
		}
	}
}
