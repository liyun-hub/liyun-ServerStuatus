package sqlite

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"time"

	"golang.org/x/crypto/bcrypt"
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
		`CREATE TABLE IF NOT EXISTS node_metadata (
			node_id TEXT PRIMARY KEY,
			display_name TEXT NOT NULL,
			token_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS admin_users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			must_change_password INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS admin_sessions (
			token_hash TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		);`,
	}

	for _, stmt := range schema {
		if _, err := s.db.Exec(stmt); err != nil {
			return err
		}
	}

	if err := s.ensureAdminMustChangePasswordColumn(); err != nil {
		return err
	}
	if err := s.backfillAdminMustChangePassword(); err != nil {
		return err
	}

	if _, err := s.db.Exec(`PRAGMA journal_mode=WAL;`); err != nil {
		return err
	}

	if err := s.seedDefaultAdmin(); err != nil {
		return err
	}

	return nil
}

func (s *Store) ensureAdminMustChangePasswordColumn() error {
	rows, err := s.db.Query(`PRAGMA table_info(admin_users);`)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasColumn := false
	for rows.Next() {
		var (
			cid      int
			name     string
			dataType string
			notNull  int
			defaultV any
			pk       int
		)
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultV, &pk); err != nil {
			return err
		}
		if name == "must_change_password" {
			hasColumn = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if hasColumn {
		return nil
	}
	_, err = s.db.Exec(`ALTER TABLE admin_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`)
	return err
}

func (s *Store) backfillAdminMustChangePassword() error {
	rows, err := s.db.Query(`SELECT username, password_hash FROM admin_users`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type adminRow struct {
		username string
		hash     string
	}
	admins := make([]adminRow, 0)
	for rows.Next() {
		var item adminRow
		if err := rows.Scan(&item.username, &item.hash); err != nil {
			return err
		}
		admins = append(admins, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	now := time.Now().Unix()
	for _, item := range admins {
		mustChange := 0
		if bcrypt.CompareHashAndPassword([]byte(item.hash), []byte("admin")) == nil {
			mustChange = 1
		}
		if _, err := s.db.Exec(`UPDATE admin_users SET must_change_password=?, updated_at=? WHERE username=?`, mustChange, now, item.username); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) seedDefaultAdmin() error {
	const username = "admin"
	const defaultPassword = "admin"

	row := s.db.QueryRow(`SELECT COUNT(1) FROM admin_users`)
	var count int
	if err := row.Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), 12)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	_, err = s.db.Exec(`
		INSERT INTO admin_users (username, password_hash, must_change_password, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, username, string(hash), 1, now, now)
	return err
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

func (s *Store) EnsureNode(nodeID string) error {
	now := time.Now().Unix()
	_, err := s.db.Exec(`
		INSERT INTO nodes (
			id, hostname, os, platform, platform_version, kernel, arch, cpu_model, cpu_cores,
			total_memory, total_disk, ip, created_at, updated_at, last_seen_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING
	`,
		nodeID, nodeID, "unknown", "unknown", "", "", "", "", 0,
		0, 0, "", now, now, 0,
	)
	return err
}

func (s *Store) TouchNode(nodeID string, at int64) error {
	if nodeID == "" {
		return fmt.Errorf("node id is required")
	}
	if at == 0 {
		at = time.Now().Unix()
	}
	if err := s.EnsureNode(nodeID); err != nil {
		return err
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

type NodeMetadata struct {
	NodeID      string
	DisplayName string
	TokenHash   string
	CreatedAt   int64
	UpdatedAt   int64
}

func (s *Store) UpsertNodeMetadata(nodeID, displayName, tokenHash string) error {
	now := time.Now().Unix()
	if displayName == "" {
		displayName = nodeID
	}
	_, err := s.db.Exec(`
		INSERT INTO node_metadata (node_id, display_name, token_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(node_id) DO UPDATE SET
			display_name=excluded.display_name,
			token_hash=excluded.token_hash,
			updated_at=excluded.updated_at
	`, nodeID, displayName, tokenHash, now, now)
	return err
}

func (s *Store) UpdateNodeDisplayName(nodeID, displayName string) error {
	if nodeID == "" {
		return fmt.Errorf("node id is required")
	}
	if displayName == "" {
		return fmt.Errorf("display name is required")
	}
	now := time.Now().Unix()
	result, err := s.db.Exec(`
		UPDATE node_metadata
		SET display_name=?, updated_at=?
		WHERE node_id=?
	`, displayName, now, nodeID)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) GetNodeMetadata(nodeID string) (*NodeMetadata, error) {
	row := s.db.QueryRow(`
		SELECT node_id, display_name, token_hash, created_at, updated_at
		FROM node_metadata
		WHERE node_id=?
	`, nodeID)
	var m NodeMetadata
	if err := row.Scan(&m.NodeID, &m.DisplayName, &m.TokenHash, &m.CreatedAt, &m.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func (s *Store) ListNodeMetadata() (map[string]NodeMetadata, error) {
	rows, err := s.db.Query(`
		SELECT node_id, display_name, token_hash, created_at, updated_at
		FROM node_metadata
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]NodeMetadata)
	for rows.Next() {
		var m NodeMetadata
		if err := rows.Scan(&m.NodeID, &m.DisplayName, &m.TokenHash, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		result[m.NodeID] = m
	}
	return result, rows.Err()
}

func (s *Store) FindNodeIDByTokenHash(tokenHash string) (string, error) {
	row := s.db.QueryRow(`SELECT node_id FROM node_metadata WHERE token_hash=?`, tokenHash)
	var nodeID string
	if err := row.Scan(&nodeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return nodeID, nil
}

func (s *Store) CreateNodeWithToken(nodeID, displayName, tokenHash string) error {
	if nodeID == "" {
		return fmt.Errorf("node id is required")
	}
	if tokenHash == "" {
		return fmt.Errorf("token hash is required")
	}
	if displayName == "" {
		displayName = nodeID
	}
	if err := s.EnsureNode(nodeID); err != nil {
		return err
	}
	now := time.Now().Unix()
	_, err := s.db.Exec(`
		INSERT INTO node_metadata (node_id, display_name, token_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, nodeID, displayName, tokenHash, now, now)
	return err
}

func (s *Store) UpdateNodeTokenHash(nodeID, tokenHash string) error {
	if nodeID == "" {
		return fmt.Errorf("node id is required")
	}
	if tokenHash == "" {
		return fmt.Errorf("token hash is required")
	}
	if err := s.EnsureNode(nodeID); err != nil {
		return err
	}
	metadata, err := s.GetNodeMetadata(nodeID)
	if err != nil {
		return err
	}
	if metadata == nil {
		now := time.Now().Unix()
		_, err := s.db.Exec(`
			INSERT INTO node_metadata (node_id, display_name, token_hash, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)
		`, nodeID, nodeID, tokenHash, now, now)
		return err
	}
	now := time.Now().Unix()
	_, err = s.db.Exec(`
		UPDATE node_metadata SET token_hash=?, updated_at=? WHERE node_id=?
	`, tokenHash, now, nodeID)
	return err
}

func (s *Store) ListNodeSummaries() ([]model.NodeSummary, error) {
	rows, err := s.db.Query(`
		SELECT
			n.id, n.hostname, n.os, n.platform, n.platform_version, n.kernel, n.arch, n.cpu_model, n.cpu_cores,
			n.total_memory, n.total_disk, n.ip, n.created_at, n.updated_at, n.last_seen_at,
			COALESCE(m.display_name, n.id) AS display_name,
			l.node_id, COALESCE(l.cpu_usage, 0), COALESCE(l.memory_used, 0), COALESCE(l.memory_total, 0), COALESCE(l.memory_usage, 0),
			COALESCE(l.disk_used, 0), COALESCE(l.disk_total, 0), COALESCE(l.disk_usage, 0),
			COALESCE(l.net_rx_rate, 0), COALESCE(l.net_tx_rate, 0), COALESCE(l.net_rx_total, 0), COALESCE(l.net_tx_total, 0), COALESCE(l.timestamp, 0)
		FROM nodes n
		LEFT JOIN node_metadata m ON m.node_id = n.id
		LEFT JOIN metrics_latest l ON l.node_id = n.id
		ORDER BY n.updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.NodeSummary, 0)
	for rows.Next() {
		var summary model.NodeSummary
		var latestNodeID sql.NullString
		var latest model.MetricsSnapshot
		if err := rows.Scan(
			&summary.ID, &summary.Hostname, &summary.OS, &summary.Platform, &summary.PlatformVersion, &summary.Kernel, &summary.Arch, &summary.CPUModel, &summary.CPUCores,
			&summary.TotalMemory, &summary.TotalDisk, &summary.IP, &summary.CreatedAt, &summary.UpdatedAt, &summary.LastSeenAt,
			&summary.DisplayName,
			&latestNodeID, &latest.CPUUsage, &latest.MemoryUsed, &latest.MemoryTotal, &latest.MemoryUsage,
			&latest.DiskUsed, &latest.DiskTotal, &latest.DiskUsage,
			&latest.NetRXRate, &latest.NetTXRate, &latest.NetRXTotal, &latest.NetTXTotal, &latest.Timestamp,
		); err != nil {
			return nil, err
		}
		if latestNodeID.Valid {
			latest.NodeID = latestNodeID.String
			summary.Latest = &latest
		}
		result = append(result, summary)
	}

	return result, rows.Err()
}

func (s *Store) GetNodeSummary(nodeID string) (*model.NodeSummary, error) {
	row := s.db.QueryRow(`
		SELECT
			n.id, n.hostname, n.os, n.platform, n.platform_version, n.kernel, n.arch, n.cpu_model, n.cpu_cores,
			n.total_memory, n.total_disk, n.ip, n.created_at, n.updated_at, n.last_seen_at,
			COALESCE(m.display_name, n.id) AS display_name,
			l.node_id, COALESCE(l.cpu_usage, 0), COALESCE(l.memory_used, 0), COALESCE(l.memory_total, 0), COALESCE(l.memory_usage, 0),
			COALESCE(l.disk_used, 0), COALESCE(l.disk_total, 0), COALESCE(l.disk_usage, 0),
			COALESCE(l.net_rx_rate, 0), COALESCE(l.net_tx_rate, 0), COALESCE(l.net_rx_total, 0), COALESCE(l.net_tx_total, 0), COALESCE(l.timestamp, 0)
		FROM nodes n
		LEFT JOIN node_metadata m ON m.node_id = n.id
		LEFT JOIN metrics_latest l ON l.node_id = n.id
		WHERE n.id = ?
	`, nodeID)

	var summary model.NodeSummary
	var latestNodeID sql.NullString
	var latest model.MetricsSnapshot
	if err := row.Scan(
		&summary.ID, &summary.Hostname, &summary.OS, &summary.Platform, &summary.PlatformVersion, &summary.Kernel, &summary.Arch, &summary.CPUModel, &summary.CPUCores,
		&summary.TotalMemory, &summary.TotalDisk, &summary.IP, &summary.CreatedAt, &summary.UpdatedAt, &summary.LastSeenAt,
		&summary.DisplayName,
		&latestNodeID, &latest.CPUUsage, &latest.MemoryUsed, &latest.MemoryTotal, &latest.MemoryUsage,
		&latest.DiskUsed, &latest.DiskTotal, &latest.DiskUsage,
		&latest.NetRXRate, &latest.NetTXRate, &latest.NetRXTotal, &latest.NetTXTotal, &latest.Timestamp,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if latestNodeID.Valid {
		latest.NodeID = latestNodeID.String
		summary.Latest = &latest
	}
	return &summary, nil
}

func (s *Store) ListNodeMetadataList() ([]NodeMetadata, error) {
	rows, err := s.db.Query(`
		SELECT node_id, display_name, token_hash, created_at, updated_at
		FROM node_metadata
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]NodeMetadata, 0)
	for rows.Next() {
		var m NodeMetadata
		if err := rows.Scan(&m.NodeID, &m.DisplayName, &m.TokenHash, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

func (s *Store) ValidateAdminPasswordHash(username string) (string, error) {
	row := s.db.QueryRow(`SELECT password_hash FROM admin_users WHERE username=?`, username)
	var hash string
	if err := row.Scan(&hash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return hash, nil
}

func (s *Store) GetAdminMustChangePassword(username string) (bool, error) {
	row := s.db.QueryRow(`SELECT must_change_password FROM admin_users WHERE username=?`, username)
	var mustChange int
	if err := row.Scan(&mustChange); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, sql.ErrNoRows
		}
		return false, err
	}
	return mustChange == 1, nil
}

func (s *Store) UpdateAdminPasswordHashAndClearMustChange(username, passwordHash string) error {
	now := time.Now().Unix()
	res, err := s.db.Exec(`
		UPDATE admin_users
		SET password_hash=?, must_change_password=0, updated_at=?
		WHERE username=?
	`, passwordHash, now, username)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) DeleteAdminSessionsByUsername(username string) error {
	_, err := s.db.Exec(`DELETE FROM admin_sessions WHERE username=?`, username)
	return err
}

func (s *Store) UpsertAdminSession(tokenHash, username string, expiresAt int64) error {
	now := time.Now().Unix()
	_, err := s.db.Exec(`
		INSERT INTO admin_sessions (token_hash, username, expires_at, created_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(token_hash) DO UPDATE SET
			expires_at=excluded.expires_at
	`, tokenHash, username, expiresAt, now)
	return err
}

func (s *Store) GetAdminSession(tokenHash string) (string, int64, error) {
	row := s.db.QueryRow(`SELECT username, expires_at FROM admin_sessions WHERE token_hash=?`, tokenHash)
	var username string
	var expiresAt int64
	if err := row.Scan(&username, &expiresAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", 0, nil
		}
		return "", 0, err
	}
	return username, expiresAt, nil
}

func (s *Store) DeleteAdminSession(tokenHash string) error {
	_, err := s.db.Exec(`DELETE FROM admin_sessions WHERE token_hash=?`, tokenHash)
	return err
}

func (s *Store) DeleteExpiredAdminSessions(now int64) error {
	_, err := s.db.Exec(`DELETE FROM admin_sessions WHERE expires_at<=?`, now)
	return err
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
