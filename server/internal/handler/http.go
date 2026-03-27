package handler

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"server-status/server/internal/config"
	"server-status/server/internal/model"
	"server-status/server/internal/store/sqlite"
)

type API struct {
	store             *sqlite.Store
	heartbeatTimeout  time.Duration
	adminSessionTTL   time.Duration
	installAgentImage string
	installWSURL      string
}

type adminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type adminLoginResponse struct {
	Token              string `json:"token"`
	ExpiresAt          int64  `json:"expiresAt"`
	MustChangePassword bool   `json:"mustChangePassword"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type createNodeRequest struct {
	NodeID      string `json:"nodeId"`
	DisplayName string `json:"displayName"`
}

type createNodeResponse struct {
	NodeID      string `json:"nodeId"`
	DisplayName string `json:"displayName"`
	Token       string `json:"token"`
}

type updateNodeDisplayNameRequest struct {
	DisplayName string `json:"displayName"`
}

type resetNodeTokenResponse struct {
	NodeID string `json:"nodeId"`
	Token  string `json:"token"`
}

type nodeAdminItem struct {
	NodeID      string                 `json:"nodeId"`
	DisplayName string                 `json:"displayName"`
	Online      bool                   `json:"online"`
	Latest      *model.MetricsSnapshot `json:"latest"`
}

type installCommandResponse struct {
	NodeID      string `json:"nodeId"`
	DisplayName string `json:"displayName"`
	Token       string `json:"token"`
	Command     string `json:"command"`
}

type adminContextKey string

const adminUsernameContextKey adminContextKey = "adminUsername"

func RegisterRoutes(mux *http.ServeMux, store *sqlite.Store, cfg config.Config) {
	api := &API{
		store:             store,
		heartbeatTimeout:  cfg.HeartbeatTimeout,
		adminSessionTTL:   cfg.AdminSessionTTL,
		installAgentImage: cfg.InstallAgentImage,
		installWSURL:      cfg.InstallWSURL,
	}

	mux.HandleFunc("GET /api/health", api.health)
	mux.HandleFunc("POST /api/admin/login", api.adminLogin)
	mux.HandleFunc("POST /api/admin/logout", api.requireAdminSession(api.adminLogout))
	mux.HandleFunc("POST /api/admin/change-password", api.requireAdminSession(api.adminChangePassword))
	mux.HandleFunc("GET /api/nodes", api.listNodes)
	mux.HandleFunc("GET /api/nodes/{id}", api.getNode)
	mux.HandleFunc("GET /api/nodes/{id}/history", api.getNodeHistory)
	mux.HandleFunc("GET /api/admin/nodes", api.requireAdminBusiness(api.adminListNodes))
	mux.HandleFunc("POST /api/admin/nodes", api.requireAdminBusiness(api.adminCreateNode))
	mux.HandleFunc("PUT /api/admin/nodes/{id}/display-name", api.requireAdminBusiness(api.adminUpdateNodeDisplayName))
	mux.HandleFunc("POST /api/admin/nodes/{id}/token/reset", api.requireAdminBusiness(api.adminResetNodeToken))
	mux.HandleFunc("POST /api/admin/nodes/{id}/install-command", api.requireAdminBusiness(api.adminInstallCommand))
	mux.HandleFunc("GET /api/alert-rules", api.listAlertRules)
	mux.HandleFunc("POST /api/alert-rules", api.requireAdminBusiness(api.createAlertRule))
	mux.HandleFunc("PUT /api/alert-rules/{id}", api.requireAdminBusiness(api.updateAlertRule))
	mux.HandleFunc("GET /api/alert-events", api.listAlertEvents)
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ts": time.Now().Unix()})
}

func (a *API) adminLogin(w http.ResponseWriter, r *http.Request) {
	var req adminLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	if username == "" || password == "" {
		writeError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	hash, err := a.store.ValidateAdminPasswordHash(username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if hash == "" || bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	mustChangePassword, err := a.store.GetAdminMustChangePassword(username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, tokenHash, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	expiresAt := time.Now().Add(a.adminSessionTTL).Unix()
	if err := a.store.UpsertAdminSession(tokenHash, username, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, adminLoginResponse{Token: token, ExpiresAt: expiresAt, MustChangePassword: mustChangePassword})
}

func (a *API) adminLogout(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	_ = a.store.DeleteAdminSession(sha256Hex(token))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *API) adminChangePassword(w http.ResponseWriter, r *http.Request) {
	username := adminUsernameFromContext(r.Context())
	if username == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	currentPassword := strings.TrimSpace(req.CurrentPassword)
	newPassword := strings.TrimSpace(req.NewPassword)
	if currentPassword == "" || newPassword == "" {
		writeError(w, http.StatusBadRequest, "currentPassword and newPassword are required")
		return
	}
	if currentPassword == newPassword {
		writeError(w, http.StatusBadRequest, "new password must be different from current password")
		return
	}
	if err := validateNewPassword(newPassword); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := a.store.ValidateAdminPasswordHash(username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if hash == "" || bcrypt.CompareHashAndPassword([]byte(hash), []byte(currentPassword)) != nil {
		writeError(w, http.StatusBadRequest, "currentPassword is incorrect")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(newPassword)) == nil {
		writeError(w, http.StatusBadRequest, "new password must be different from current password")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update password")
		return
	}
	if err := a.store.UpdateAdminPasswordHashAndClearMustChange(username, string(newHash)); err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.store.DeleteAdminSessionsByUsername(username); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, tokenHash, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	expiresAt := time.Now().Add(a.adminSessionTTL).Unix()
	if err := a.store.UpsertAdminSession(tokenHash, username, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, adminLoginResponse{Token: token, ExpiresAt: expiresAt, MustChangePassword: false})
}

func (a *API) listNodes(w http.ResponseWriter, _ *http.Request) {
	summaries, err := a.store.ListNodeSummaries()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	now := time.Now().Unix()
	for i := range summaries {
		summaries[i].Online = now-summaries[i].LastSeenAt <= int64(a.heartbeatTimeout.Seconds())
	}
	writeJSON(w, http.StatusOK, summaries)
}

func (a *API) getNode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	summary, err := a.store.GetNodeSummary(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if summary == nil {
		writeError(w, http.StatusNotFound, "node not found")
		return
	}
	summary.Online = time.Now().Unix()-summary.LastSeenAt <= int64(a.heartbeatTimeout.Seconds())
	writeJSON(w, http.StatusOK, summary)
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

func (a *API) adminListNodes(w http.ResponseWriter, _ *http.Request) {
	summaries, err := a.store.ListNodeSummaries()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	now := time.Now().Unix()
	result := make([]nodeAdminItem, 0, len(summaries))
	for _, s := range summaries {
		result = append(result, nodeAdminItem{
			NodeID:      s.ID,
			DisplayName: s.DisplayName,
			Online:      now-s.LastSeenAt <= int64(a.heartbeatTimeout.Seconds()),
			Latest:      s.Latest,
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) adminCreateNode(w http.ResponseWriter, r *http.Request) {
	var req createNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	nodeID := strings.TrimSpace(req.NodeID)
	displayName := strings.TrimSpace(req.DisplayName)
	if nodeID == "" {
		writeError(w, http.StatusBadRequest, "nodeId is required")
		return
	}
	if displayName == "" {
		displayName = nodeID
	}

	token, tokenHash, err := randomToken(24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	if err := a.store.CreateNodeWithToken(nodeID, displayName, tokenHash); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, createNodeResponse{NodeID: nodeID, DisplayName: displayName, Token: token})
}

func (a *API) adminUpdateNodeDisplayName(w http.ResponseWriter, r *http.Request) {
	nodeID := strings.TrimSpace(r.PathValue("id"))
	if nodeID == "" {
		writeError(w, http.StatusBadRequest, "invalid node id")
		return
	}
	var req updateNodeDisplayNameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		writeError(w, http.StatusBadRequest, "displayName is required")
		return
	}
	if err := a.store.UpdateNodeDisplayName(nodeID, displayName); err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "node not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"nodeId": nodeID, "displayName": displayName})
}

func (a *API) adminResetNodeToken(w http.ResponseWriter, r *http.Request) {
	nodeID := strings.TrimSpace(r.PathValue("id"))
	if nodeID == "" {
		writeError(w, http.StatusBadRequest, "invalid node id")
		return
	}
	token, tokenHash, err := randomToken(24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	if err := a.store.UpdateNodeTokenHash(nodeID, tokenHash); err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "node not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resetNodeTokenResponse{NodeID: nodeID, Token: token})
}

func (a *API) adminInstallCommand(w http.ResponseWriter, r *http.Request) {
	nodeID := strings.TrimSpace(r.PathValue("id"))
	if nodeID == "" {
		writeError(w, http.StatusBadRequest, "invalid node id")
		return
	}
	metadata, err := a.store.GetNodeMetadata(nodeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if metadata == nil {
		writeError(w, http.StatusNotFound, "node metadata not found")
		return
	}
	token, tokenHash, err := randomToken(24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	if err := a.store.UpdateNodeTokenHash(nodeID, tokenHash); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	wsURL := strings.TrimSpace(a.installWSURL)
	if wsURL == "" {
		wsURL = defaultWSURL(r)
	}
	command := fmt.Sprintf(
		"docker run -d --name 'server-status-agent' --restart unless-stopped --network host -e NODE_ID='%s' -e AGENT_TOKEN='%s' -e SERVER_WS_URL='%s' '%s'",
		escapeSingleQuote(nodeID),
		escapeSingleQuote(token),
		escapeSingleQuote(wsURL),
		escapeSingleQuote(a.installAgentImage),
	)

	writeJSON(w, http.StatusOK, installCommandResponse{
		NodeID:      nodeID,
		DisplayName: metadata.DisplayName,
		Token:       token,
		Command:     command,
	})
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

func (a *API) requireAdminSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		tokenHash := sha256Hex(token)
		now := time.Now().Unix()
		_ = a.store.DeleteExpiredAdminSessions(now)
		username, expiresAt, err := a.store.GetAdminSession(tokenHash)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if username == "" || expiresAt == 0 || expiresAt <= now {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), adminUsernameContextKey, username)))
	}
}

func (a *API) requireAdminBusiness(next http.HandlerFunc) http.HandlerFunc {
	return a.requireAdminSession(func(w http.ResponseWriter, r *http.Request) {
		username := adminUsernameFromContext(r.Context())
		mustChange, err := a.store.GetAdminMustChangePassword(username)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if mustChange {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error": "password change required",
				"code":  "PASSWORD_CHANGE_REQUIRED",
			})
			return
		}
		next(w, r)
	})
}

func adminUsernameFromContext(ctx context.Context) string {
	username, _ := ctx.Value(adminUsernameContextKey).(string)
	return username
}

func validateNewPassword(password string) error {
	length := len([]rune(password))
	if length < 8 || length > 72 {
		return fmt.Errorf("new password must be 8-72 characters")
	}
	if strings.EqualFold(password, "admin") {
		return fmt.Errorf("new password cannot be admin")
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		default:
			hasSpecial = true
		}
	}
	kinds := 0
	if hasUpper {
		kinds++
	}
	if hasLower {
		kinds++
	}
	if hasDigit {
		kinds++
	}
	if hasSpecial {
		kinds++
	}
	if kinds < 3 {
		return fmt.Errorf("new password must include at least 3 character types")
	}
	return nil
}

func bearerToken(r *http.Request) string {
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if auth == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(auth, prefix) {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(auth, prefix))
}

func sha256Hex(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

func randomToken(byteLen int) (plain string, hash string, err error) {
	buf := make([]byte, byteLen)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	plain = hex.EncodeToString(buf)
	hash = sha256Hex(plain)
	return plain, hash, nil
}

func defaultWSURL(r *http.Request) string {
	scheme := "ws"
	if r.TLS != nil {
		scheme = "wss"
	}
	host := r.Host
	if host == "" {
		host = "localhost:8080"
	}
	return fmt.Sprintf("%s://%s/ws/agent", scheme, host)
}

func escapeSingleQuote(input string) string {
	return strings.ReplaceAll(input, "'", `"'"'`)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}
