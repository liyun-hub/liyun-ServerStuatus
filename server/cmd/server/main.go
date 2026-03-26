package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"server-status/server/internal/alert"
	"server-status/server/internal/config"
	"server-status/server/internal/handler"
	"server-status/server/internal/store/sqlite"
	"server-status/server/internal/ws"
)

func main() {
	cfg := config.Load()
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		log.Fatalf("create db dir failed: %v", err)
	}

	store, err := sqlite.New(cfg.DBPath)
	if err != nil {
		log.Fatalf("init sqlite failed: %v", err)
	}
	defer store.Close()

	alertEngine := alert.NewEngine(store)
	hub := ws.NewHub(store, alertEngine, cfg.HeartbeatTimeout)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, store, cfg)
	mux.HandleFunc("GET /ws/agent", hub.ServeAgentWS)

	server := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      withCORS(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("server started on %s", cfg.HTTPAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
