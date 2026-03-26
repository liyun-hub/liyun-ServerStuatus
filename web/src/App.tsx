import { NavLink, Route, Routes } from "react-router-dom";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";
import AdminLoginPage from "./pages/AdminLogin";
import AdminNodesPage from "./pages/AdminNodes";

const navClassName = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? " active" : ""}`;

export default function App() {
  return (
    <div className="app-shell">
      <h1 className="app-title">Server Status</h1>
      <nav className="app-nav">
        <NavLink to="/" className={navClassName} end>
          节点
        </NavLink>
        <NavLink to="/alert-rules" className={navClassName}>
          告警规则
        </NavLink>
        <NavLink to="/alert-events" className={navClassName}>
          告警事件
        </NavLink>
        <NavLink to="/admin/nodes" className={navClassName}>
          后台管理
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<NodesPage />} />
        <Route path="/nodes/:id" element={<NodeDetailPage />} />
        <Route path="/alert-rules" element={<AlertRulesPage />} />
        <Route path="/alert-events" element={<AlertEventsPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/nodes" element={<AdminNodesPage />} />
      </Routes>
    </div>
  );
}
