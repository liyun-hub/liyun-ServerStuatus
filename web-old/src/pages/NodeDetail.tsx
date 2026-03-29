import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { MetricLineChart } from "../components/charts/MetricLineChart";
import type { MetricsSnapshot, NodeSummary } from "../types";

function toSeries(data: MetricsSnapshot[], pick: (row: MetricsSnapshot) => number) {
  return data.map((item) => ({ timestamp: item.timestamp, value: pick(item) }));
}

export default function NodeDetailPage() {
  const { id = "" } = useParams();
  const [node, setNode] = useState<NodeSummary | null>(null);
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const [nodeRes, historyRes] = await Promise.all([
          api.getNode(id),
          api.getNodeHistory(id, now - 3600, now, 2000),
        ]);
        if (!cancelled) {
          setNode(nodeRes);
          setHistory(historyRes);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    if (id) {
      load();
      const timer = setInterval(load, 5000);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }
  }, [id]);

  const cpuSeries = useMemo(() => toSeries(history, (r) => r.cpuUsage), [history]);
  const memSeries = useMemo(() => toSeries(history, (r) => r.memoryUsage), [history]);
  const diskSeries = useMemo(() => toSeries(history, (r) => r.diskUsage), [history]);
  const rxSeries = useMemo(() => toSeries(history, (r) => r.netRxRate), [history]);
  const txSeries = useMemo(() => toSeries(history, (r) => r.netTxRate), [history]);

  return (
    <section className="app-page">
      <div className="app-card">
        <h2 className="app-card-title">节点详情</h2>
        {error && <p className="app-error">{error}</p>}

        {node && (
          <div className="app-node-grid">
            <div className="app-node-meta">
              <div>
                <strong>{node.hostname}</strong> <span className="app-muted">({node.id})</span>
              </div>
              <div>
                {node.os} / {node.platform} {node.platformVersion} / {node.arch}
              </div>
              <div>
                CPU: {node.cpuModel} x {node.cpuCores}
              </div>
              <div>
                <span className={`app-badge ${node.online ? "app-badge-online" : "app-badge-offline"}`}>
                  {node.online ? "在线" : "离线"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="app-card">
        <h3 className="app-subtitle">CPU 使用率 (%)</h3>
        <MetricLineChart data={cpuSeries} color="#2563eb" unit="%" />
      </div>

      <div className="app-card">
        <h3 className="app-subtitle">内存使用率 (%)</h3>
        <MetricLineChart data={memSeries} color="#16a34a" unit="%" />
      </div>

      <div className="app-card">
        <h3 className="app-subtitle">硬盘使用率 (%)</h3>
        <MetricLineChart data={diskSeries} color="#9333ea" unit="%" />
      </div>

      <div className="app-card">
        <h3 className="app-subtitle">下行速率 (B/s)</h3>
        <MetricLineChart data={rxSeries} color="#ea580c" unit="" />
      </div>

      <div className="app-card">
        <h3 className="app-subtitle">上行速率 (B/s)</h3>
        <MetricLineChart data={txSeries} color="#dc2626" unit="" />
      </div>
    </section>
  );
}
