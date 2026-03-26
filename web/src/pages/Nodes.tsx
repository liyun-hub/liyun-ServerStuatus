import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { NodeSummary } from "../types";

function fmtPercent(v?: number) {
  if (v === undefined) return "-";
  return `${v.toFixed(1)}%`;
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listNodes();
        if (!cancelled) setNodes(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section>
      <h2>节点总览</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">节点</th>
            <th align="left">状态</th>
            <th align="left">CPU</th>
            <th align="left">内存</th>
            <th align="left">硬盘</th>
            <th align="left">流量</th>
            <th align="left">操作</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>
                <div>{node.hostname}</div>
                <small>{node.id}</small>
              </td>
              <td>{node.online ? "在线" : "离线"}</td>
              <td>{fmtPercent(node.latest?.cpuUsage)}</td>
              <td>{fmtPercent(node.latest?.memoryUsage)}</td>
              <td>{fmtPercent(node.latest?.diskUsage)}</td>
              <td>
                ↓{(node.latest?.netRxRate ?? 0).toFixed(0)} B/s / ↑
                {(node.latest?.netTxRate ?? 0).toFixed(0)} B/s
              </td>
              <td>
                <Link to={`/nodes/${node.id}`}>查看详情</Link>
              </td>
            </tr>
          ))}
          {nodes.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 20, color: "#777" }}>
                暂无节点，请先启动 agent。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
