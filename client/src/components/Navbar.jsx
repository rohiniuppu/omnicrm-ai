import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, Megaphone, Zap, Sun, Moon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Navbar({ onLogout, accountEmail, theme, onToggleTheme }) {
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState('connecting');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.databaseFallback ? 'fallback' : 'healthy');
        } else {
          setDbStatus('offline');
        }
      } catch {
        setDbStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Segments', path: '/segments', icon: UserSquare2 },
    { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/75 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-emerald-400 dark:bg-clip-text dark:text-transparent">
              OmniCRM{' '}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">AI</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800/60 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700/50'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-500' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {accountEmail && (
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
                {accountEmail}
              </div>
            )}

            <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  dbStatus === 'healthy' ? 'bg-emerald-400' :
                  dbStatus === 'fallback' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  dbStatus === 'healthy' ? 'bg-emerald-500' :
                  dbStatus === 'fallback' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {dbStatus === 'healthy' && 'API: Online (MySQL)'}
                {dbStatus === 'fallback' && 'API: Online (Mock DB)'}
                {dbStatus === 'connecting' && 'API: Connecting...'}
                {dbStatus === 'offline' && 'API: Offline'}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-slate-200 dark:border-slate-900 justify-around py-2 bg-white dark:bg-slate-950">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center py-1 px-3 rounded text-[10px] ${
                isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
