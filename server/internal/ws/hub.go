package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"server-status/server/internal/alert"
	"server-status/server/internal/model"
	"server-status/server/internal/store/sqlite"
)

type Hub struct {
	store            *sqlite.Store
	alertEngine      *alert.Engine
	heartbeatTimeout time.Duration
	agentToken       string
	upgrader         websocket.Upgrader
}

type incomingMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type registerPayload struct {
	NodeID          string  `json:"nodeId"`
	Hostname        string  `json:"hostname"`
	OS              string  `json:"os"`
	Platform        string  `json:"platform"`
	PlatformVersion string  `json:"platformVersion"`
	Kernel          string  `json:"kernel"`
	Arch            string  `json:"arch"`
	CPUModel        string  `json:"cpuModel"`
	CPUCores        int     `json:"cpuCores"`
	TotalMemory     float64 `json:"totalMemory"`
	TotalDisk       float64 `json:"totalDisk"`
	IP              string  `json:"ip"`
}

type heartbeatPayload struct {
	NodeID    string `json:"nodeId"`
	Timestamp int64  `json:"timestamp"`
}

type metricsPayload struct {
	NodeID      string  `json:"nodeId"`
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryUsed  float64 `json:"memoryUsed"`
	MemoryTotal float64 `json:"memoryTotal"`
	MemoryUsage float64 `json:"memoryUsage"`
	DiskUsed    float64 `json:"diskUsed"`
	DiskTotal   float64 `json:"diskTotal"`
	DiskUsage   float64 `json:"diskUsage"`
	NetRXRate   float64 `json:"netRxRate"`
	NetTXRate   float64 `json:"netTxRate"`
	NetRXTotal  float64 `json:"netRxTotal"`
	NetTXTotal  float64 `json:"netTxTotal"`
	Timestamp   int64   `json:"timestamp"`
}

func NewHub(store *sqlite.Store, alertEngine *alert.Engine, timeout time.Duration, agentToken string) *Hub {
	return &Hub{
		store:            store,
		alertEngine:      alertEngine,
		heartbeatTimeout: timeout,
		agentToken:       agentToken,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Hub) ServeAgentWS(w http.ResponseWriter, r *http.Request) {
	if !h.authorized(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "unauthorized"})
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(h.heartbeatTimeout * 2))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(h.heartbeatTimeout * 2))
	})

	currentNodeID := ""
	for {
		_ = conn.SetReadDeadline(time.Now().Add(h.heartbeatTimeout * 2))
		var msg incomingMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("ws closed: %v", err)
			return
		}

		switch msg.Type {
		case "register":
			var payload registerPayload
			if err := json.Unmarshal(msg.Data, &payload); err != nil {
				continue
			}
			currentNodeID = payload.NodeID
			node := model.Node{
				ID:              payload.NodeID,
				Hostname:        payload.Hostname,
				OS:              payload.OS,
				Platform:        payload.Platform,
				PlatformVersion: payload.PlatformVersion,
				Kernel:          payload.Kernel,
				Arch:            payload.Arch,
				CPUModel:        payload.CPUModel,
				CPUCores:        payload.CPUCores,
				TotalMemory:     payload.TotalMemory,
				TotalDisk:       payload.TotalDisk,
				IP:              payload.IP,
				LastSeenAt:      time.Now().Unix(),
			}
			_ = h.store.UpsertNode(node)
			_ = h.writeAck(conn, "register")
		case "heartbeat":
			var payload heartbeatPayload
			if err := json.Unmarshal(msg.Data, &payload); err != nil {
				continue
			}
			nodeID := payload.NodeID
			if nodeID == "" {
				nodeID = currentNodeID
			}
			if nodeID != "" {
				_ = h.store.TouchNode(nodeID, payload.Timestamp)
			}
			_ = h.writeAck(conn, "heartbeat")
		case "metrics":
			var payload metricsPayload
			if err := json.Unmarshal(msg.Data, &payload); err != nil {
				continue
			}
			nodeID := payload.NodeID
			if nodeID == "" {
				nodeID = currentNodeID
			}
			if nodeID == "" {
				continue
			}
			if payload.Timestamp == 0 {
				payload.Timestamp = time.Now().Unix()
			}
			snapshot := model.MetricsSnapshot{
				NodeID:      nodeID,
				CPUUsage:    payload.CPUUsage,
				MemoryUsed:  payload.MemoryUsed,
				MemoryTotal: payload.MemoryTotal,
				MemoryUsage: payload.MemoryUsage,
				DiskUsed:    payload.DiskUsed,
				DiskTotal:   payload.DiskTotal,
				DiskUsage:   payload.DiskUsage,
				NetRXRate:   payload.NetRXRate,
				NetTXRate:   payload.NetTXRate,
				NetRXTotal:  payload.NetRXTotal,
				NetTXTotal:  payload.NetTXTotal,
				Timestamp:   payload.Timestamp,
			}
			_ = h.store.TouchNode(nodeID, payload.Timestamp)
			_ = h.store.UpsertLatest(snapshot)
			_ = h.store.InsertHistory(snapshot)
			_ = h.alertEngine.Evaluate(snapshot)
		default:
		}
	}
}

func (h *Hub) writeAck(conn *websocket.Conn, ackType string) error {
	return conn.WriteJSON(map[string]any{
		"type": "ack",
		"data": map[string]any{"for": ackType, "ts": time.Now().Unix()},
	})
}

func (h *Hub) authorized(r *http.Request) bool {
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if auth == "" {
		return false
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(auth, prefix) {
		return false
	}
	token := strings.TrimSpace(strings.TrimPrefix(auth, prefix))
	return token != "" && token == h.agentToken
}
