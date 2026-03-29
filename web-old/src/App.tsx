import type { ReactElement } from "react";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { auth } from "./api/client";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";
import AdminLoginPage from "./pages/AdminLogin";
import AdminNodesPage from "./pages/AdminNodes";
import AdminAlertRulesPage from "./pages/AdminAlertRules";
import AdminChangePasswordPage from "./pages/AdminChangePassword";

const navClassName = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? " active" : ""}`;

function resolveAdminHome() {
  if (!auth.isLoggedIn()) {
    return "/admin/login";
  }
  if (auth.mustChangePassword()) {
    return "/admin/change-password";
  }
  return "/admin/nodes";
}

function RequireAdminSession({ children }: { children: ReactElement }) {
  if (!auth.isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function RequireAdminBusiness({ children }: { children: ReactElement }) {
  if (!auth.isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  if (auth.mustChangePassword()) {
    return <Navigate to="/admin/change-password" replace />;
  }
  return children;
}

function UserLayout() {
  return (
    <div className="app-shell">
      <h1 className="app-title">Server Status</h1>
      <nav className="app-nav">
        <NavLink to="/" className={navClassName} end>
          节点
        </NavLink>
        <NavLink to="/alert-rules" className={navClassName}>
          告警监控
        </NavLink>
        <NavLink to="/alert-events" className={navClassName}>
          告警事件
        </NavLink>
        <NavLink to="/admin" className={navClassName}>
          管理端入口
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="app-shell">
      <h1 className="app-title">Server Status 管理端</h1>
      <nav className="app-nav">
        <NavLink to="/admin/nodes" className={navClassName}>
          管理端-节点
        </NavLink>
        <NavLink to="/admin/alert-rules" className={navClassName}>
          管理端-告警规则
        </NavLink>
        <NavLink to="/" className={navClassName} end>
          返回用户面板
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export default function App() {
  const isAdminLoggedIn = auth.isLoggedIn();
  const adminMustChangePassword = auth.mustChangePassword();

  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route path="/" element={<NodesPage />} />
        <Route path="/nodes/:id" element={<NodeDetailPage />} />
        <Route path="/alert-rules" element={<AlertRulesPage />} />
        <Route path="/alert-events" element={<AlertEventsPage />} />
      </Route>

      <Route
        path="/admin/login"
        element={
          isAdminLoggedIn ? <Navigate to={resolveAdminHome()} replace /> : <AdminLoginPage />
        }
      />
      <Route
        path="/admin/change-password"
        element={
          <RequireAdminSession>
            {adminMustChangePassword ? <AdminChangePasswordPage /> : <Navigate to="/admin/nodes" replace />}
          </RequireAdminSession>
        }
      />
      <Route path="/admin" element={<Navigate to={resolveAdminHome()} replace />} />

      <Route
        element={
          <RequireAdminBusiness>
            <AdminLayout />
          </RequireAdminBusiness>
        }
      >
        <Route path="/admin/nodes" element={<AdminNodesPage />} />
        <Route path="/admin/alert-rules" element={<AdminAlertRulesPage />} />
      </Route>

      <Route path="/admin/*" element={<Navigate to={resolveAdminHome()} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
