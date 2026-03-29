import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Activity, Bell, Server, Settings, LogOut, Shield, Globe } from 'lucide-react';
import { logout as apiLogout } from '../api';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { token, mustChangePassword, logout } = useAuthStore();
  const location = useLocation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch (e) {
      // Ignore
    } finally {
      logout();
    }
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: Activity },
    { name: t('nav.alerts'), path: '/alerts', icon: Bell },
  ];

  if (token && !mustChangePassword) {
    navItems.push({ name: t('nav.nodeManagement'), path: '/admin/nodes', icon: Server });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl tracking-tight text-gray-900">SysMonitor</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Toggle Language"
              >
                <Globe className="h-5 w-5 mr-1" />
                {i18n.language.startsWith('en') ? 'EN' : '中'}
              </button>
              
              {token ? (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
                </button>
              ) : (
                <Link
                  to="/admin/login"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('nav.admin')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
