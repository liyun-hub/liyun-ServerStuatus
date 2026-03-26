package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	ServerWSURL       string
	NodeID            string
	AgentToken        string
	HeartbeatInterval time.Duration
	CollectInterval   time.Duration
	ReconnectWait     time.Duration
}

func Load() Config {
	nodeID := getEnv("NODE_ID", "")
	if nodeID == "" {
		hostname, _ := os.Hostname()
		nodeID = hostname
	}

	return Config{
		ServerWSURL:       getEnv("SERVER_WS_URL", "ws://localhost:8080/ws/agent"),
		NodeID:            nodeID,
		AgentToken:        getEnv("AGENT_TOKEN", ""),
		HeartbeatInterval: time.Duration(getEnvInt("HEARTBEAT_INTERVAL_SEC", 5)) * time.Second,
		CollectInterval:   time.Duration(getEnvInt("COLLECT_INTERVAL_SEC", 5)) * time.Second,
		ReconnectWait:     time.Duration(getEnvInt("RECONNECT_WAIT_SEC", 3)) * time.Second,
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
