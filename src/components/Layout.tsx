import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Receipt, 
  Calendar as CalendarIcon, 
  BarChart, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X,
  Wallet
} from 'lucide-react';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, text: 'Painel', path: '/dashboard' },
    { icon: <Receipt size={20} />, text: 'Transações', path: '/transactions' },
    { icon: <CalendarIcon size={20} />, text: 'Calendário', path: '/calendar' },
    { icon: <BarChart size={20} />, text: 'Relatórios', path: '/reports' },
    { icon: <SettingsIcon size={20} />, text: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white shadow-md z-10">
        <div className="flex items-center justify-center h-16 px-4 bg-primary-500 text-white">
          <Wallet className="mr-2" size={24} />
          <h1 className="text-xl font-bold">Poupeon</h1>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-all ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.text}
              </button>
            ))}
          </nav>
          
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {user?.name.charAt(0)}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 mt-4 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white shadow-sm">
        <div className="px-4 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Wallet className="text-primary-500" size={24} />
            <h1 className="ml-2 text-xl font-bold text-gray-900">Poupeon</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-500"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-25">
          <div className="fixed inset-y-0 left-0 flex flex-col w-full max-w-xs bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center">
                <Wallet className="text-primary-500" size={24} />
                <h1 className="ml-2 text-xl font-bold text-gray-900">Poupeon</h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-all ${
                    location.pathname === item.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.text}
                </button>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                      {user?.name.charAt(0)}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 mt-4 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} className="mr-2" />
                  Sair
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64">
        <main className="flex-1 pt-16 md:pt-0 pb-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;