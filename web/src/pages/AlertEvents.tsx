import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AlertEvent } from "../types";

export default function AlertEventsPage() {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listAlertEvents();
        if (!cancelled) setEvents(data);
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
      <h2>告警事件</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">时间</th>
            <th align="left">节点</th>
            <th align="left">规则</th>
            <th align="left">状态</th>
            <th align="left">值</th>
            <th align="left">消息</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{new Date(event.createdAt * 1000).toLocaleString()}</td>
              <td>{event.nodeId}</td>
              <td>{event.ruleName}</td>
              <td>{event.status}</td>
              <td>{event.value.toFixed(2)}</td>
              <td>{event.message}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: "#777" }}>
                暂无告警事件
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
