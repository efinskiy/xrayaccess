package main

import (
	"flag"
	"io"
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

const retryDelay = 5 * time.Second

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

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	ticker := time.NewTicker(cfg.FlushInterval)
	defer ticker.Stop()

	var buffer []*parser.LogEntry

	flush := func() {
		if len(buffer) == 0 {
			return
		}
		batch := buffer
		buffer = nil
		go s.SendWithRetry(batch, 5)
	}

	for {
		t, err := tail.TailFile(cfg.LogFile, tail.Config{
			Follow:    true,
			ReOpen:    true,
			MustExist: false,
			Location:  &tail.SeekInfo{Offset: 0, Whence: io.SeekEnd},
			Logger:    tail.DefaultLogger, // видим внутренние ошибки tail в journald
		})
		if err != nil {
			log.Printf("failed to open log file: %v — retrying in %s", err, retryDelay)
			select {
			case <-sigCh:
				return
			case <-time.After(retryDelay):
				continue
			}
		}

		log.Printf("watching %s", cfg.LogFile)
		stopped := false

		for !stopped {
			select {
			case line, ok := <-t.Lines:
				if !ok {
					// канал закрылся — tail упал (permission denied, inotify limit и т.п.)
					log.Printf("tail channel closed, restarting in %s...", retryDelay)
					stopped = true
					continue
				}
				if line.Err != nil {
					log.Printf("tail line error: %v", line.Err)
					continue
				}

				entry, err := parser.Parse(line.Text)
				if err != nil {
					continue
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
				t.Cleanup()
				time.Sleep(2 * time.Second)
				return
			}
		}

		t.Cleanup()

		// ждём перед перезапуском, но отвечаем на сигнал
		select {
		case <-sigCh:
			return
		case <-time.After(retryDelay):
		}
	}
}
