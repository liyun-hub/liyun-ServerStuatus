package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr          string
	DBPath            string
	HeartbeatTimeout  time.Duration
	AdminSessionTTL   time.Duration
	InstallAgentImage string
	InstallWSURL      string
}

func Load() Config {
	return Config{
		HTTPAddr:          getEnv("HTTP_ADDR", ":8080"),
		DBPath:            getEnv("DB_PATH", "./data/server-status.db"),
		HeartbeatTimeout:  time.Duration(getEnvInt("HEARTBEAT_TIMEOUT_SEC", 30)) * time.Second,
		AdminSessionTTL:   time.Duration(getEnvInt("ADMIN_SESSION_TTL_SEC", 86400)) * time.Second,
		InstallAgentImage: getEnv("INSTALL_AGENT_IMAGE", "ghcr.io/liyun/server-status-agent:latest"),
		InstallWSURL:      getEnv("INSTALL_WS_URL", ""),
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
