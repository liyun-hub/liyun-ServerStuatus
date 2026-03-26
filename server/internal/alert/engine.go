package alert

import (
	"fmt"
	"sync"

	"server-status/server/internal/model"
	"server-status/server/internal/store/sqlite"
)

type Engine struct {
	store    *sqlite.Store
	mu       sync.Mutex
	counter  map[string]int
	isFiring map[string]bool
}

func NewEngine(store *sqlite.Store) *Engine {
	return &Engine{
		store:    store,
		counter:  make(map[string]int),
		isFiring: make(map[string]bool),
	}
}

func (e *Engine) Evaluate(snapshot model.MetricsSnapshot) error {
	rules, err := e.store.ListEnabledAlertRules()
	if err != nil {
		return err
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	for _, rule := range rules {
		value, ok := metricValue(snapshot, rule.Metric)
		if !ok {
			continue
		}

		key := fmt.Sprintf("%d:%s", rule.ID, snapshot.NodeID)
		matched := compare(value, rule.Operator, rule.Threshold)
		if matched {
			e.counter[key]++
			if e.counter[key] >= rule.Consecutive && !e.isFiring[key] {
				e.isFiring[key] = true
				_ = e.store.InsertAlertEvent(model.AlertEvent{
					RuleID:   rule.ID,
					RuleName: rule.Name,
					NodeID:   snapshot.NodeID,
					Status:   "firing",
					Value:    value,
					Message:  fmt.Sprintf("%s %s %.2f", rule.Metric, rule.Operator, rule.Threshold),
				})
			}
		} else {
			e.counter[key] = 0
			if e.isFiring[key] {
				e.isFiring[key] = false
				_ = e.store.InsertAlertEvent(model.AlertEvent{
					RuleID:   rule.ID,
					RuleName: rule.Name,
					NodeID:   snapshot.NodeID,
					Status:   "resolved",
					Value:    value,
					Message:  fmt.Sprintf("%s back to normal", rule.Metric),
				})
			}
		}
	}
	return nil
}

func metricValue(snapshot model.MetricsSnapshot, metric string) (float64, bool) {
	switch metric {
	case "cpu_usage":
		return snapshot.CPUUsage, true
	case "memory_usage":
		return snapshot.MemoryUsage, true
	case "disk_usage":
		return snapshot.DiskUsage, true
	case "net_rx_rate":
		return snapshot.NetRXRate, true
	case "net_tx_rate":
		return snapshot.NetTXRate, true
	default:
		return 0, false
	}
}

func compare(value float64, operator string, threshold float64) bool {
	switch operator {
	case ">":
		return value > threshold
	case ">=":
		return value >= threshold
	case "<":
		return value < threshold
	case "<=":
		return value <= threshold
	case "==":
		return value == threshold
	default:
		return false
	}
}
