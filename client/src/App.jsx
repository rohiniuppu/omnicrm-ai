import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';
import Login from './pages/Login';

const AUTH_KEY = 'omnicrm.session.active';
const USER_KEY = 'omnicrm.session.email';
const THEME_KEY = 'omnicrm.theme';

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [accountEmail, setAccountEmail] = React.useState(() => localStorage.getItem(USER_KEY) || 'ops@omnicrm.ai');
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return saved;
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  React.useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, accountEmail);
    } else {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [accountEmail, isAuthenticated]);

  const handleLogin = ({ email }) => {
    setAccountEmail(email.trim() || 'ops@omnicrm.ai');
    setIsAuthenticated(true);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#050608]">
      {isAuthenticated && location.pathname !== '/login' && (
        <Navbar onLogout={handleLogout} accountEmail={accountEmail} theme={theme} onToggleTheme={toggleTheme} />
      )}
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/customers" element={isAuthenticated ? <Customers /> : <Navigate to="/login" replace />} />
          <Route path="/segments" element={isAuthenticated ? <Segments /> : <Navigate to="/login" replace />} />
          <Route path="/campaigns" element={isAuthenticated ? <Campaigns /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
