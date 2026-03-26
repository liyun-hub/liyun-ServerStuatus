package collector

import (
	"net"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"

	"server-status/agent/internal/model"
)

type SystemCollector struct{}

func NewSystemCollector() *SystemCollector {
	return &SystemCollector{}
}

func (c *SystemCollector) CollectRegister(nodeID string) (model.RegisterPayload, error) {
	hostInfo, err := host.Info()
	if err != nil {
		return model.RegisterPayload{}, err
	}
	cpuInfo, _ := cpu.Info()
	vm, _ := mem.VirtualMemory()
	totalDisk, _ := getTotalDisk()
	ip := firstIP()

	cpuModel := "unknown"
	cpuCores := 0
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
		cpuCores = int(cpuInfo[0].Cores)
		if cpuCores == 0 {
			cpuCores = len(cpuInfo)
		}
	}

	payload := model.RegisterPayload{
		NodeID:          nodeID,
		Hostname:        hostInfo.Hostname,
		OS:              hostInfo.OS,
		Platform:        hostInfo.Platform,
		PlatformVersion: hostInfo.PlatformVersion,
		Kernel:          hostInfo.KernelVersion,
		Arch:            hostInfo.KernelArch,
		CPUModel:        cpuModel,
		CPUCores:        cpuCores,
		TotalMemory:     float64(vm.Total),
		TotalDisk:       totalDisk,
		IP:              ip,
	}
	return payload, nil
}

func (c *SystemCollector) CollectMetrics(nodeID string, netStats NetStats) (model.MetricsPayload, error) {
	cpuUsage, _ := cpu.Percent(0, false)
	vm, _ := mem.VirtualMemory()
	diskUsed, diskTotal, diskUsage := getDiskUsage()

	cpuValue := 0.0
	if len(cpuUsage) > 0 {
		cpuValue = cpuUsage[0]
	}

	payload := model.MetricsPayload{
		NodeID:      nodeID,
		CPUUsage:    cpuValue,
		MemoryUsed:  float64(vm.Used),
		MemoryTotal: float64(vm.Total),
		MemoryUsage: vm.UsedPercent,
		DiskUsed:    diskUsed,
		DiskTotal:   diskTotal,
		DiskUsage:   diskUsage,
		NetRXRate:   netStats.RXRate,
		NetTXRate:   netStats.TXRate,
		NetRXTotal:  netStats.RXTotal,
		NetTXTotal:  netStats.TXTotal,
		Timestamp:   time.Now().Unix(),
	}
	return payload, nil
}

func getDiskUsage() (float64, float64, float64) {
	partitions, err := disk.Partitions(false)
	if err != nil || len(partitions) == 0 {
		usage, err := disk.Usage("/")
		if err != nil {
			return 0, 0, 0
		}
		return float64(usage.Used), float64(usage.Total), usage.UsedPercent
	}

	seen := map[string]struct{}{}
	var total, used uint64
	for _, p := range partitions {
		if _, ok := seen[p.Mountpoint]; ok {
			continue
		}
		seen[p.Mountpoint] = struct{}{}
		u, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		total += u.Total
		used += u.Used
	}
	if total == 0 {
		return 0, 0, 0
	}
	return float64(used), float64(total), float64(used) * 100 / float64(total)
}

func getTotalDisk() (float64, error) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return 0, err
	}
	seen := map[string]struct{}{}
	total := uint64(0)
	for _, p := range partitions {
		if _, ok := seen[p.Mountpoint]; ok {
			continue
		}
		seen[p.Mountpoint] = struct{}{}
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		total += usage.Total
	}
	return float64(total), nil
}

func firstIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() {
			continue
		}
		if ipNet.IP.To4() != nil {
			return ipNet.IP.String()
		}
	}
	return ""
}
