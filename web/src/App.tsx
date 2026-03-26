import { NavLink, Route, Routes } from "react-router-dom";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";

const navStyle = ({ isActive }: { isActive: boolean }) => ({
  marginRight: 12,
  textDecoration: "none",
  color: isActive ? "#2563eb" : "#333",
  fontWeight: isActive ? 700 : 500,
});

export default function App() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Server Status</h1>
      <nav style={{ marginBottom: 16 }}>
        <NavLink to="/" style={navStyle} end>
          节点
        </NavLink>
        <NavLink to="/alert-rules" style={navStyle}>
          告警规则
        </NavLink>
        <NavLink to="/alert-events" style={navStyle}>
          告警事件
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<NodesPage />} />
        <Route path="/nodes/:id" element={<NodeDetailPage />} />
        <Route path="/alert-rules" element={<AlertRulesPage />} />
        <Route path="/alert-events" element={<AlertEventsPage />} />
      </Routes>
    </div>
  );
}
