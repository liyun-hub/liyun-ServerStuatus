import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth';

import Layout from './layouts/Layout';
import Home from './pages/Home';
import NodeDetail from './pages/NodeDetail';
import Alerts from './pages/Alerts';
import Login from './pages/admin/Login';
import ChangePassword from './pages/admin/ChangePassword';
import NodeManagement from './pages/admin/NodeManagement';

function ProtectedRoute({ children, requireAuth = true, requireNoAuth = false, requireChangePassword = false }: { children: React.ReactNode, requireAuth?: boolean, requireNoAuth?: boolean, requireChangePassword?: boolean }) {
  const { token, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (requireNoAuth && token && !mustChangePassword) {
    return <Navigate to="/admin/nodes" />;
  }

  if (requireAuth && !token) {
    return <Navigate to="/admin/login" state={{ from: location }} />;
  }

  if (requireAuth && token && mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" />;
  }

  if (requireChangePassword && (!token || !mustChangePassword)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public routes */}
          <Route index element={<Home />} />
          <Route path="nodes/:id" element={<NodeDetail />} />
          <Route path="alerts" element={<Alerts />} />

          {/* Admin routes */}
          <Route 
            path="admin/login" 
            element={
              <ProtectedRoute requireNoAuth>
                <Login />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/change-password" 
            element={
              <ProtectedRoute requireChangePassword>
                <ChangePassword />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/nodes" 
            element={
              <ProtectedRoute requireAuth>
                <NodeManagement />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
