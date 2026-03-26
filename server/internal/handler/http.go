package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"server-status/server/internal/model"
	"server-status/server/internal/store/sqlite"
)

type API struct {
	store            *sqlite.Store
	heartbeatTimeout time.Duration
}

func RegisterRoutes(mux *http.ServeMux, store *sqlite.Store, heartbeatTimeout time.Duration) {
	api := &API{store: store, heartbeatTimeout: heartbeatTimeout}

	mux.HandleFunc("GET /api/health", api.health)
	mux.HandleFunc("GET /api/nodes", api.listNodes)
	mux.HandleFunc("GET /api/nodes/{id}", api.getNode)
	mux.HandleFunc("GET /api/nodes/{id}/history", api.getNodeHistory)
	mux.HandleFunc("GET /api/alert-rules", api.listAlertRules)
	mux.HandleFunc("POST /api/alert-rules", api.createAlertRule)
	mux.HandleFunc("PUT /api/alert-rules/{id}", api.updateAlertRule)
	mux.HandleFunc("GET /api/alert-events", api.listAlertEvents)
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ts": time.Now().Unix()})
}

func (a *API) listNodes(w http.ResponseWriter, _ *http.Request) {
	nodes, err := a.store.ListNodes()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	result := make([]model.NodeSummary, 0, len(nodes))
	now := time.Now().Unix()
	for _, n := range nodes {
		latest, _ := a.store.GetLatest(n.ID)
		result = append(result, model.NodeSummary{
			Node:   n,
			Latest: latest,
			Online: now-n.LastSeenAt <= int64(a.heartbeatTimeout.Seconds()),
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) getNode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	node, err := a.store.GetNode(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if node == nil {
		writeError(w, http.StatusNotFound, "node not found")
		return
	}
	latest, _ := a.store.GetLatest(id)
	writeJSON(w, http.StatusOK, model.NodeSummary{
		Node:   *node,
		Latest: latest,
		Online: time.Now().Unix()-node.LastSeenAt <= int64(a.heartbeatTimeout.Seconds()),
	})
}

func (a *API) getNodeHistory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	query := r.URL.Query()
	from := sqlite.ParseInt64OrDefault(query.Get("from"), time.Now().Add(-1*time.Hour).Unix())
	to := sqlite.ParseInt64OrDefault(query.Get("to"), time.Now().Unix())
	limit := sqlite.ParseIntOrDefault(query.Get("limit"), 1000)

	history, err := a.store.GetHistory(id, from, to, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, history)
}

func (a *API) listAlertRules(w http.ResponseWriter, _ *http.Request) {
	rules, err := a.store.ListAlertRules()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

func (a *API) createAlertRule(w http.ResponseWriter, r *http.Request) {
	var req model.AlertRule
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.Metric == "" {
		writeError(w, http.StatusBadRequest, "name and metric are required")
		return
	}
	if err := sqlite.ValidateMetric(req.Metric); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	created, err := a.store.CreateAlertRule(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateAlertRule(w http.ResponseWriter, r *http.Request) {
	idText := r.PathValue("id")
	id, err := strconv.ParseInt(idText, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req model.AlertRule
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.Metric == "" {
		writeError(w, http.StatusBadRequest, "name and metric are required")
		return
	}
	if err := sqlite.ValidateMetric(req.Metric); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := a.store.UpdateAlertRule(id, req)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "rule not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) listAlertEvents(w http.ResponseWriter, r *http.Request) {
	limit := sqlite.ParseIntOrDefault(r.URL.Query().Get("limit"), 200)
	events, err := a.store.ListAlertEvents(limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}
