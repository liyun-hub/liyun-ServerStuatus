package model

type Node struct {
	ID              string  `json:"id"`
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
	CreatedAt       int64   `json:"createdAt"`
	UpdatedAt       int64   `json:"updatedAt"`
	LastSeenAt      int64   `json:"lastSeenAt"`
}

type MetricsSnapshot struct {
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

type NodeSummary struct {
	Node
	Latest *MetricsSnapshot `json:"latest"`
	Online bool             `json:"online"`
}

type AlertRule struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Metric      string  `json:"metric"`
	Operator    string  `json:"operator"`
	Threshold   float64 `json:"threshold"`
	Consecutive int     `json:"consecutive"`
	Enabled     bool    `json:"enabled"`
	CreatedAt   int64   `json:"createdAt"`
	UpdatedAt   int64   `json:"updatedAt"`
}

type AlertEvent struct {
	ID        int64   `json:"id"`
	RuleID    int64   `json:"ruleId"`
	RuleName  string  `json:"ruleName"`
	NodeID    string  `json:"nodeId"`
	Status    string  `json:"status"`
	Value     float64 `json:"value"`
	Message   string  `json:"message"`
	CreatedAt int64   `json:"createdAt"`
}
