package sqlite

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"time"

	_ "modernc.org/sqlite"

	"server-status/server/internal/model"
)

type Store struct {
	db *sql.DB
}

func New(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(0)
	db.SetConnMaxIdleTime(0)

	store := &Store{db: db}
	if err := store.init(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) init() error {
	schema := []string{
		`CREATE TABLE IF NOT EXISTS nodes (
			id TEXT PRIMARY KEY,
			hostname TEXT NOT NULL,
			os TEXT NOT NULL,
			platform TEXT NOT NULL,
			platform_version TEXT NOT NULL,
			kernel TEXT NOT NULL,
			arch TEXT NOT NULL,
			cpu_model TEXT NOT NULL,
			cpu_cores INTEGER NOT NULL,
			total_memory REAL NOT NULL,
			total_disk REAL NOT NULL,
			ip TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			last_seen_at INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS metrics_latest (
			node_id TEXT PRIMARY KEY,
			cpu_usage REAL NOT NULL,
			memory_used REAL NOT NULL,
			memory_total REAL NOT NULL,
			memory_usage REAL NOT NULL,
			disk_used REAL NOT NULL,
			disk_total REAL NOT NULL,
			disk_usage REAL NOT NULL,
			net_rx_rate REAL NOT NULL,
			net_tx_rate REAL NOT NULL,
			net_rx_total REAL NOT NULL,
			net_tx_total REAL NOT NULL,
			timestamp INTEGER NOT NULL,
			FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS metrics_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			node_id TEXT NOT NULL,
			cpu_usage REAL NOT NULL,
			memory_used REAL NOT NULL,
			memory_total REAL NOT NULL,
			memory_usage REAL NOT NULL,
			disk_used REAL NOT NULL,
			disk_total REAL NOT NULL,
			disk_usage REAL NOT NULL,
			net_rx_rate REAL NOT NULL,
			net_tx_rate REAL NOT NULL,
			net_rx_total REAL NOT NULL,
			net_tx_total REAL NOT NULL,
			timestamp INTEGER NOT NULL,
			FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_metrics_history_node_time ON metrics_history(node_id, timestamp);`,
		`CREATE TABLE IF NOT EXISTS alert_rules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			metric TEXT NOT NULL,
			operator TEXT NOT NULL,
			threshold REAL NOT NULL,
			consecutive INTEGER NOT NULL,
			enabled INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS alert_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			rule_id INTEGER NOT NULL,
			rule_name TEXT NOT NULL,
			node_id TEXT NOT NULL,
			status TEXT NOT NULL,
			value REAL NOT NULL,
			message TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);`,
	}

	for _, stmt := range schema {
		if _, err := s.db.Exec(stmt); err != nil {
			return err
		}
	}

	if _, err := s.db.Exec(`PRAGMA journal_mode=WAL;`); err != nil {
		return err
	}
	return nil
}

func (s *Store) UpsertNode(node model.Node) error {
	now := time.Now().Unix()
	if node.CreatedAt == 0 {
		node.CreatedAt = now
	}
	node.UpdatedAt = now
	if node.LastSeenAt == 0 {
		node.LastSeenAt = now
	}
	_, err := s.db.Exec(`
		INSERT INTO nodes (
			id, hostname, os, platform, platform_version, kernel, arch, cpu_model, cpu_cores,
			total_memory, total_disk, ip, created_at, updated_at, last_seen_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			hostname=excluded.hostname,
			os=excluded.os,
			platform=excluded.platform,
			platform_version=excluded.platform_version,
			kernel=excluded.kernel,
			arch=excluded.arch,
			cpu_model=excluded.cpu_model,
			cpu_cores=excluded.cpu_cores,
			total_memory=excluded.total_memory,
			total_disk=excluded.total_disk,
			ip=excluded.ip,
			updated_at=excluded.updated_at,
			last_seen_at=excluded.last_seen_at;
	`,
		node.ID, node.Hostname, node.OS, node.Platform, node.PlatformVersion, node.Kernel, node.Arch,
		node.CPUModel, node.CPUCores, node.TotalMemory, node.TotalDisk, node.IP, node.CreatedAt, node.UpdatedAt, node.LastSeenAt,
	)
	return err
}

func (s *Store) TouchNode(nodeID string, at int64) error {
	if at == 0 {
		at = time.Now().Unix()
	}
	_, err := s.db.Exec(`UPDATE nodes SET last_seen_at=?, updated_at=? WHERE id=?`, at, at, nodeID)
	return err
}

func (s *Store) ListNodes() ([]model.Node, error) {
	rows, err := s.db.Query(`
		SELECT id, hostname, os, platform, platform_version, kernel, arch, cpu_model, cpu_cores,
		       total_memory, total_disk, ip, created_at, updated_at, last_seen_at
		FROM nodes
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.Node, 0)
	for rows.Next() {
		var n model.Node
		if err := rows.Scan(
			&n.ID, &n.Hostname, &n.OS, &n.Platform, &n.PlatformVersion, &n.Kernel, &n.Arch,
			&n.CPUModel, &n.CPUCores, &n.TotalMemory, &n.TotalDisk, &n.IP,
			&n.CreatedAt, &n.UpdatedAt, &n.LastSeenAt,
		); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, rows.Err()
}

func (s *Store) GetNode(nodeID string) (*model.Node, error) {
	row := s.db.QueryRow(`
		SELECT id, hostname, os, platform, platform_version, kernel, arch, cpu_model, cpu_cores,
		       total_memory, total_disk, ip, created_at, updated_at, last_seen_at
		FROM nodes
		WHERE id=?
	`, nodeID)
	var n model.Node
	if err := row.Scan(
		&n.ID, &n.Hostname, &n.OS, &n.Platform, &n.PlatformVersion, &n.Kernel, &n.Arch,
		&n.CPUModel, &n.CPUCores, &n.TotalMemory, &n.TotalDisk, &n.IP,
		&n.CreatedAt, &n.UpdatedAt, &n.LastSeenAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &n, nil
}

func (s *Store) UpsertLatest(snapshot model.MetricsSnapshot) error {
	_, err := s.db.Exec(`
		INSERT INTO metrics_latest (
			node_id, cpu_usage, memory_used, memory_total, memory_usage,
			disk_used, disk_total, disk_usage,
			net_rx_rate, net_tx_rate, net_rx_total, net_tx_total,
			timestamp
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(node_id) DO UPDATE SET
			cpu_usage=excluded.cpu_usage,
			memory_used=excluded.memory_used,
			memory_total=excluded.memory_total,
			memory_usage=excluded.memory_usage,
			disk_used=excluded.disk_used,
			disk_total=excluded.disk_total,
			disk_usage=excluded.disk_usage,
			net_rx_rate=excluded.net_rx_rate,
			net_tx_rate=excluded.net_tx_rate,
			net_rx_total=excluded.net_rx_total,
			net_tx_total=excluded.net_tx_total,
			timestamp=excluded.timestamp;
	`,
		snapshot.NodeID, snapshot.CPUUsage, snapshot.MemoryUsed, snapshot.MemoryTotal, snapshot.MemoryUsage,
		snapshot.DiskUsed, snapshot.DiskTotal, snapshot.DiskUsage,
		snapshot.NetRXRate, snapshot.NetTXRate, snapshot.NetRXTotal, snapshot.NetTXTotal,
		snapshot.Timestamp,
	)
	return err
}

func (s *Store) InsertHistory(snapshot model.MetricsSnapshot) error {
	_, err := s.db.Exec(`
		INSERT INTO metrics_history (
			node_id, cpu_usage, memory_used, memory_total, memory_usage,
			disk_used, disk_total, disk_usage,
			net_rx_rate, net_tx_rate, net_rx_total, net_tx_total,
			timestamp
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		snapshot.NodeID, snapshot.CPUUsage, snapshot.MemoryUsed, snapshot.MemoryTotal, snapshot.MemoryUsage,
		snapshot.DiskUsed, snapshot.DiskTotal, snapshot.DiskUsage,
		snapshot.NetRXRate, snapshot.NetTXRate, snapshot.NetRXTotal, snapshot.NetTXTotal,
		snapshot.Timestamp,
	)
	return err
}

func (s *Store) GetLatest(nodeID string) (*model.MetricsSnapshot, error) {
	row := s.db.QueryRow(`
		SELECT node_id, cpu_usage, memory_used, memory_total, memory_usage,
		       disk_used, disk_total, disk_usage,
		       net_rx_rate, net_tx_rate, net_rx_total, net_tx_total,
		       timestamp
		FROM metrics_latest WHERE node_id=?
	`, nodeID)
	var m model.MetricsSnapshot
	if err := row.Scan(
		&m.NodeID, &m.CPUUsage, &m.MemoryUsed, &m.MemoryTotal, &m.MemoryUsage,
		&m.DiskUsed, &m.DiskTotal, &m.DiskUsage,
		&m.NetRXRate, &m.NetTXRate, &m.NetRXTotal, &m.NetTXTotal,
		&m.Timestamp,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func (s *Store) GetHistory(nodeID string, from, to int64, limit int) ([]model.MetricsSnapshot, error) {
	if limit <= 0 || limit > 5000 {
		limit = 500
	}
	if from == 0 {
		from = time.Now().Add(-24 * time.Hour).Unix()
	}
	if to == 0 {
		to = time.Now().Unix()
	}
	query := `
		SELECT node_id, cpu_usage, memory_used, memory_total, memory_usage,
		       disk_used, disk_total, disk_usage,
		       net_rx_rate, net_tx_rate, net_rx_total, net_tx_total,
		       timestamp
		FROM metrics_history
		WHERE node_id=? AND timestamp BETWEEN ? AND ?
		ORDER BY timestamp ASC
		LIMIT ?`
	rows, err := s.db.Query(query, nodeID, from, to, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.MetricsSnapshot, 0)
	for rows.Next() {
		var m model.MetricsSnapshot
		if err := rows.Scan(
			&m.NodeID, &m.CPUUsage, &m.MemoryUsed, &m.MemoryTotal, &m.MemoryUsage,
			&m.DiskUsed, &m.DiskTotal, &m.DiskUsage,
			&m.NetRXRate, &m.NetTXRate, &m.NetRXTotal, &m.NetTXTotal,
			&m.Timestamp,
		); err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

func (s *Store) ListAlertRules() ([]model.AlertRule, error) {
	rows, err := s.db.Query(`
		SELECT id, name, metric, operator, threshold, consecutive, enabled, created_at, updated_at
		FROM alert_rules
		ORDER BY id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.AlertRule, 0)
	for rows.Next() {
		var r model.AlertRule
		var enabled int
		if err := rows.Scan(&r.ID, &r.Name, &r.Metric, &r.Operator, &r.Threshold, &r.Consecutive, &enabled, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		r.Enabled = enabled == 1
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *Store) ListEnabledAlertRules() ([]model.AlertRule, error) {
	rows, err := s.db.Query(`
		SELECT id, name, metric, operator, threshold, consecutive, enabled, created_at, updated_at
		FROM alert_rules
		WHERE enabled=1
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.AlertRule, 0)
	for rows.Next() {
		var r model.AlertRule
		var enabled int
		if err := rows.Scan(&r.ID, &r.Name, &r.Metric, &r.Operator, &r.Threshold, &r.Consecutive, &enabled, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		r.Enabled = enabled == 1
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *Store) CreateAlertRule(rule model.AlertRule) (model.AlertRule, error) {
	now := time.Now().Unix()
	if rule.Consecutive <= 0 {
		rule.Consecutive = 1
	}
	if rule.Operator == "" {
		rule.Operator = ">"
	}
	result, err := s.db.Exec(`
		INSERT INTO alert_rules (name, metric, operator, threshold, consecutive, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, rule.Name, rule.Metric, rule.Operator, rule.Threshold, rule.Consecutive, boolToInt(rule.Enabled), now, now)
	if err != nil {
		return model.AlertRule{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return model.AlertRule{}, err
	}
	rule.ID = id
	rule.CreatedAt = now
	rule.UpdatedAt = now
	return rule, nil
}

func (s *Store) UpdateAlertRule(id int64, rule model.AlertRule) (model.AlertRule, error) {
	now := time.Now().Unix()
	if rule.Consecutive <= 0 {
		rule.Consecutive = 1
	}
	if rule.Operator == "" {
		rule.Operator = ">"
	}
	res, err := s.db.Exec(`
		UPDATE alert_rules
		SET name=?, metric=?, operator=?, threshold=?, consecutive=?, enabled=?, updated_at=?
		WHERE id=?
	`, rule.Name, rule.Metric, rule.Operator, rule.Threshold, rule.Consecutive, boolToInt(rule.Enabled), now, id)
	if err != nil {
		return model.AlertRule{}, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return model.AlertRule{}, sql.ErrNoRows
	}
	rule.ID = id
	rule.UpdatedAt = now
	row := s.db.QueryRow(`SELECT created_at FROM alert_rules WHERE id=?`, id)
	if err := row.Scan(&rule.CreatedAt); err != nil {
		return model.AlertRule{}, err
	}
	return rule, nil
}

func (s *Store) InsertAlertEvent(event model.AlertEvent) error {
	if event.CreatedAt == 0 {
		event.CreatedAt = time.Now().Unix()
	}
	_, err := s.db.Exec(`
		INSERT INTO alert_events (rule_id, rule_name, node_id, status, value, message, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, event.RuleID, event.RuleName, event.NodeID, event.Status, event.Value, event.Message, event.CreatedAt)
	return err
}

func (s *Store) ListAlertEvents(limit int) ([]model.AlertEvent, error) {
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	rows, err := s.db.Query(`
		SELECT id, rule_id, rule_name, node_id, status, value, message, created_at
		FROM alert_events
		ORDER BY id DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.AlertEvent, 0)
	for rows.Next() {
		var e model.AlertEvent
		if err := rows.Scan(&e.ID, &e.RuleID, &e.RuleName, &e.NodeID, &e.Status, &e.Value, &e.Message, &e.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func ParseInt64OrDefault(input string, fallback int64) int64 {
	if input == "" {
		return fallback
	}
	value, err := strconv.ParseInt(input, 10, 64)
	if err != nil {
		return fallback
	}
	return value
}

func ParseIntOrDefault(input string, fallback int) int {
	if input == "" {
		return fallback
	}
	value, err := strconv.Atoi(input)
	if err != nil {
		return fallback
	}
	return value
}

func ValidateMetric(metric string) error {
	switch metric {
	case "cpu_usage", "memory_usage", "disk_usage", "net_rx_rate", "net_tx_rate":
		return nil
	default:
		return fmt.Errorf("unsupported metric: %s", metric)
	}
}
