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
    <section className="app-page">
      <div className="app-card">
        <h2 className="app-card-title">告警事件</h2>
        {error && <p className="app-error">{error}</p>}

        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>节点</th>
                <th>规则</th>
                <th>状态</th>
                <th>值</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.createdAt * 1000).toLocaleString()}</td>
                  <td>{event.nodeId}</td>
                  <td>{event.ruleName}</td>
                  <td>
                    <span className={`app-badge ${event.status === "firing" ? "app-badge-offline" : "app-badge-online"}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>{event.value.toFixed(2)}</td>
                  <td>{event.message}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="app-empty">
                    暂无告警事件
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
