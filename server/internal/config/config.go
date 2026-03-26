package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr         string
	DBPath           string
	HeartbeatTimeout time.Duration
	AgentToken       string
}

func Load() Config {
	return Config{
		HTTPAddr:         getEnv("HTTP_ADDR", ":8080"),
		DBPath:           getEnv("DB_PATH", "./data/server-status.db"),
		HeartbeatTimeout: time.Duration(getEnvInt("HEARTBEAT_TIMEOUT_SEC", 30)) * time.Second,
		AgentToken:       getEnv("AGENT_TOKEN", ""),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
