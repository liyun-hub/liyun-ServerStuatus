package model

type Envelope struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type RegisterPayload struct {
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

type HeartbeatPayload struct {
	NodeID    string `json:"nodeId"`
	Timestamp int64  `json:"timestamp"`
}

type MetricsPayload struct {
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
