import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.adminLogin(username.trim(), password);
      auth.setToken(res.token);
      navigate("/admin/nodes", { replace: true });
    } catch (e) {
      setError((e as Error).message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>后台登录</h2>
      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>用户名</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </section>
  );
}
