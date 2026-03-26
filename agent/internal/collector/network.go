package collector

import (
	"time"

	"github.com/shirou/gopsutil/v4/net"
)

type NetStats struct {
	RXRate  float64
	TXRate  float64
	RXTotal float64
	TXTotal float64
}

type NetCollector struct {
	lastRX uint64
	lastTX uint64
	lastAt time.Time
}

func NewNetCollector() *NetCollector {
	return &NetCollector{}
}

func (c *NetCollector) Collect() NetStats {
	ioCounters, err := net.IOCounters(false)
	if err != nil || len(ioCounters) == 0 {
		return NetStats{}
	}
	current := ioCounters[0]
	now := time.Now()

	stats := NetStats{
		RXTotal: float64(current.BytesRecv),
		TXTotal: float64(current.BytesSent),
	}

	if !c.lastAt.IsZero() {
		seconds := now.Sub(c.lastAt).Seconds()
		if seconds > 0 {
			rxDiff := int64(current.BytesRecv - c.lastRX)
			txDiff := int64(current.BytesSent - c.lastTX)
			if rxDiff < 0 {
				rxDiff = 0
			}
			if txDiff < 0 {
				txDiff = 0
			}
			stats.RXRate = float64(rxDiff) / seconds
			stats.TXRate = float64(txDiff) / seconds
		}
	}

	c.lastRX = current.BytesRecv
	c.lastTX = current.BytesSent
	c.lastAt = now
	return stats
}
