package transport

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"server-status/agent/internal/model"
)

type WSClient struct {
	url   string
	token string
	conn  *websocket.Conn
	mu    sync.Mutex
}

func NewWSClient(url, token string) *WSClient {
	return &WSClient{url: url, token: token}
}

func (c *WSClient) Connect() error {
	headers := http.Header{}
	headers.Set("Authorization", "Bearer "+c.token)
	conn, _, err := websocket.DefaultDialer.Dial(c.url, headers)
	if err != nil {
		return err
	}
	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()

	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
		return nil
	})
	_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	return nil
}

func (c *WSClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		return nil
	}
	err := c.conn.Close()
	c.conn = nil
	return err
}

func (c *WSClient) WriteEnvelope(msgType string, data any) error {
	payload := model.Envelope{Type: msgType, Data: data}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		return websocket.ErrCloseSent
	}
	return c.conn.WriteJSON(payload)
}

func (c *WSClient) ReadLoop(stop <-chan struct{}) {
	for {
		select {
		case <-stop:
			return
		default:
		}

		c.mu.Lock()
		conn := c.conn
		c.mu.Unlock()
		if conn == nil {
			return
		}

		_, message, err := conn.ReadMessage()
		if err != nil {
			return
		}
		_ = consumeAck(message)
	}
}

func consumeAck(message []byte) error {
	var v map[string]any
	return json.Unmarshal(message, &v)
}
