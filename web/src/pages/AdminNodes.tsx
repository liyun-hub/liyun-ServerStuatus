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
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>后台节点管理</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void load()} disabled={loading}>
            刷新
          </button>
          <button type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </div>

      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}

      <form onSubmit={onCreateNode} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="nodeId (唯一)"
          value={newNodeId}
          onChange={(e) => setNewNodeId(e.target.value)}
          required
        />
        <input
          placeholder="displayName (可选)"
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
        />
        <button type="submit">新增节点</button>
      </form>

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">nodeId</th>
            <th align="left">displayName</th>
            <th align="left">状态</th>
            <th align="left">CPU</th>
            <th align="left">内存</th>
            <th align="left">硬盘</th>
            <th align="left">操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedNodes.map((node) => (
            <tr key={node.nodeId} style={{ borderTop: "1px solid #ddd" }}>
              <td>{node.nodeId}</td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={renameDraft[node.nodeId] ?? ""}
                    onChange={(e) =>
                      setRenameDraft((old) => ({
                        ...old,
                        [node.nodeId]: e.target.value,
                      }))
                    }
                  />
                  <button type="button" onClick={() => void onRename(node.nodeId)}>
                    重命名
                  </button>
                </div>
              </td>
              <td>{node.online ? "在线" : "离线"}</td>
              <td>{fmtPercent(node.latest?.cpuUsage)}</td>
              <td>{fmtPercent(node.latest?.memoryUsage)}</td>
              <td>{fmtPercent(node.latest?.diskUsage)}</td>
              <td>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void onResetToken(node.nodeId)}>
                    重置 token
                  </button>
                  <button type="button" onClick={() => void onInstallCommand(node.nodeId)}>
                    生成安装命令
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {sortedNodes.length === 0 && (
            <tr>
              <td colSpan={7} style={{ color: "#777", padding: 20 }}>
                暂无节点
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {resultBody && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>{resultTitle}</h3>
          <textarea
            value={resultBody}
            readOnly
            style={{ width: "100%", minHeight: 100, fontFamily: "monospace" }}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => void onCopyResult()}>
              复制
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
