package main

import (
	"log"
	"time"

	"server-status/agent/internal/collector"
	"server-status/agent/internal/config"
	"server-status/agent/internal/model"
	"server-status/agent/internal/transport"
)

func main() {
	cfg := config.Load()
	if cfg.AgentToken == "" {
		log.Fatal("AGENT_TOKEN is required")
	}
	systemCollector := collector.NewSystemCollector()
	netCollector := collector.NewNetCollector()

	for {
		if err := runOnce(cfg, systemCollector, netCollector); err != nil {
			log.Printf("agent loop error: %v", err)
		}
		time.Sleep(cfg.ReconnectWait)
	}
}

func runOnce(cfg config.Config, systemCollector *collector.SystemCollector, netCollector *collector.NetCollector) error {
	client := transport.NewWSClient(cfg.ServerWSURL, cfg.AgentToken)
	if err := client.Connect(); err != nil {
		return err
	}
	defer client.Close()

	stop := make(chan struct{})
	defer close(stop)
	go client.ReadLoop(stop)

	registerPayload, err := systemCollector.CollectRegister(cfg.NodeID)
	if err != nil {
		return err
	}
	if err := client.WriteEnvelope("register", registerPayload); err != nil {
		return err
	}

	heartbeatTicker := time.NewTicker(cfg.HeartbeatInterval)
	collectTicker := time.NewTicker(cfg.CollectInterval)
	defer heartbeatTicker.Stop()
	defer collectTicker.Stop()

	for {
		select {
		case <-heartbeatTicker.C:
			heartbeat := model.HeartbeatPayload{NodeID: cfg.NodeID, Timestamp: time.Now().Unix()}
			if err := client.WriteEnvelope("heartbeat", heartbeat); err != nil {
				return err
			}
		case <-collectTicker.C:
			netStats := netCollector.Collect()
			metrics, err := systemCollector.CollectMetrics(cfg.NodeID, netStats)
			if err != nil {
				continue
			}
			if err := client.WriteEnvelope("metrics", metrics); err != nil {
				return err
			}
		}
	}
}
