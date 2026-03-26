import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
import type { AdminNodeItem } from "../types";

function parseError(error: unknown) {
  const message = (error as Error)?.message ?? "请求失败";
  try {
    const data = JSON.parse(message) as { error?: string };
    if (data.error) return data.error;
  } catch {
    return message;
  }
  return message;
}

function fmtPercent(v?: number) {
  if (v === undefined) return "-";
  return `${v.toFixed(1)}%`;
}

export default function AdminNodesPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<AdminNodeItem[]>([]);
  const [renameDraft, setRenameDraft] = useState<Record<string, string>>({});
  const [newNodeId, setNewNodeId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [resultBody, setResultBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const syncDraft = (items: AdminNodeItem[]) => {
    setRenameDraft((old) => {
      const next: Record<string, string> = {};
      for (const item of items) {
        next[item.nodeId] = old[item.nodeId] ?? item.displayName;
      }
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminListNodes();
      setNodes(data);
      syncDraft(data);
    } catch (e) {
      const message = parseError(e);
      if (message.includes("unauthorized")) {
        auth.clearToken();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isLoggedIn()) {
      navigate("/admin/login", { replace: true });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => Number(b.online) - Number(a.online) || a.nodeId.localeCompare(b.nodeId)),
    [nodes]
  );

  const onCreateNode = async (event: FormEvent) => {
    event.preventDefault();
    const nodeId = newNodeId.trim();
    const displayName = newDisplayName.trim();
    if (!nodeId) {
      setError("nodeId 不能为空");
      return;
    }

    setError("");
    try {
      const res = await api.adminCreateNode({ nodeId, displayName });
      setResultTitle(`节点 ${res.nodeId} 已创建，token 仅显示一次`);
      setResultBody(res.token);
      setNewNodeId("");
      setNewDisplayName("");
      await load();
    } catch (e) {
      setError(parseError(e));
    }
  };

  const onRename = async (nodeId: string) => {
    const displayName = (renameDraft[nodeId] ?? "").trim();
    if (!displayName) {
      setError("displayName 不能为空");
      return;
    }
    setError("");
    try {
      await api.adminUpdateNodeDisplayName(nodeId, { displayName });
      await load();
    } catch (e) {
      setError(parseError(e));
    }
  };

  const onResetToken = async (nodeId: string) => {
    setError("");
    try {
      const res = await api.adminResetNodeToken(nodeId);
      setResultTitle(`节点 ${res.nodeId} 新 token（仅显示一次）`);
      setResultBody(res.token);
    } catch (e) {
      setError(parseError(e));
    }
  };

  const onInstallCommand = async (nodeId: string) => {
    setError("");
    try {
      const res = await api.adminInstallCommand(nodeId);
      setResultTitle(`节点 ${res.nodeId} 安装命令`);
      setResultBody(res.command);
      await load();
    } catch (e) {
      setError(parseError(e));
    }
  };

  const onCopyResult = async () => {
    if (!resultBody) return;
    try {
      await navigator.clipboard.writeText(resultBody);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  const onLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    }
    auth.clearToken();
    navigate("/admin/login", { replace: true });
  };

  return (
    <section className="app-page">
      <div className="app-card">
        <div className="app-toolbar">
          <h2 className="app-card-title" style={{ marginBottom: 0 }}>
            后台节点管理
          </h2>
          <div className="app-actions">
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              刷新
            </button>
            <button type="button" className="app-button app-button-secondary" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>

        {error && <p className="app-error">{error}</p>}

        <form onSubmit={onCreateNode} className="app-form-inline">
          <input
            className="app-input"
            placeholder="nodeId (唯一)"
            value={newNodeId}
            onChange={(e) => setNewNodeId(e.target.value)}
            required
          />
          <input
            className="app-input"
            placeholder="displayName (可选)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
          />
          <button type="submit" className="app-button">
            新增节点
          </button>
        </form>
      </div>

      <div className="app-card">
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>nodeId</th>
                <th>displayName</th>
                <th>状态</th>
                <th>CPU</th>
                <th>内存</th>
                <th>硬盘</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedNodes.map((node) => (
                <tr key={node.nodeId}>
                  <td>{node.nodeId}</td>
                  <td>
                    <div className="app-actions">
                      <input
                        className="app-input"
                        value={renameDraft[node.nodeId] ?? ""}
                        onChange={(e) =>
                          setRenameDraft((old) => ({
                            ...old,
                            [node.nodeId]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="app-button app-button-secondary"
                        onClick={() => void onRename(node.nodeId)}
                      >
                        重命名
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`app-badge ${node.online ? "app-badge-online" : "app-badge-offline"}`}>
                      {node.online ? "在线" : "离线"}
                    </span>
                  </td>
                  <td>{fmtPercent(node.latest?.cpuUsage)}</td>
                  <td>{fmtPercent(node.latest?.memoryUsage)}</td>
                  <td>{fmtPercent(node.latest?.diskUsage)}</td>
                  <td>
                    <div className="app-actions">
                      <button
                        type="button"
                        className="app-button app-button-warning"
                        onClick={() => void onResetToken(node.nodeId)}
                      >
                        重置 token
                      </button>
                      <button
                        type="button"
                        className="app-button app-button-secondary"
                        onClick={() => void onInstallCommand(node.nodeId)}
                      >
                        生成安装命令
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedNodes.length === 0 && (
                <tr>
                  <td colSpan={7} className="app-empty">
                    暂无节点
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resultBody && (
        <div className="app-card">
          <h3 className="app-subtitle">{resultTitle}</h3>
          <textarea className="app-textarea" value={resultBody} readOnly />
          <div className="app-actions" style={{ marginTop: 8 }}>
            <button type="button" className="app-button app-button-secondary" onClick={() => void onCopyResult()}>
              复制
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
