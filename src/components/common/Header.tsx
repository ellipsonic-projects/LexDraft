import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scale,
  Search,
  Command,
  Bell,
  CheckCircle,
  ChevronDown,
  ShieldCheck,
  Briefcase,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    users,
    organization,
    notifications,
    theme,
    toggleTheme,
    quickLogin,
    logout,
    setIsCommandPaletteOpen,
    setActiveTab,
    setSelectedDocumentId,
    markNotificationRead,
    clearAllNotifications
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isDark = theme === 'dark';

  return (
    <header className={`h-16 border-b px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Left: Brand & Workspace */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab(currentUser.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-900/20 ring-1 ring-blue-500/30">
            <Scale className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-extrabold text-lg tracking-tight font-sans ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Lex<span className="text-blue-800 dark:text-blue-400">Draft</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-900/10 text-blue-800 dark:text-blue-400 border border-blue-800/20 rounded uppercase">
                v1.0 MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{organization.name}</p>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Trigger & Search */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`w-full h-9 border rounded-xl px-3.5 flex items-center justify-between text-xs transition-all duration-150 group ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-400'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
            <span>Search legal templates, documents, clients...</span>
          </div>
          <div className={`flex items-center space-x-1 border rounded px-1.5 py-0.5 text-[11px] font-mono ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Actions: Role Switcher, Theme Toggle & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Role Switcher Pills */}
        <div className={`hidden lg:flex items-center p-1 rounded-xl border shadow-xs ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => quickLogin('boss')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              currentUser.role === 'boss'
                ? 'bg-blue-900 text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Partner</span>
          </button>
          <button
            onClick={() => quickLogin('employee')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              currentUser.role === 'employee'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Lawyer</span>
          </button>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center relative transition-colors ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 border rounded-2xl shadow-2xl z-50 overflow-hidden divide-y ${
              isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
            }`}>
              <div className={`p-3.5 flex items-center justify-between ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-900/10 text-blue-800 dark:text-blue-400 font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-slate-500 hover:text-blue-700 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.linkId) {
                          if (n.type === 'review' || n.type === 'approval' || n.type === 'rejection') {
                            setSelectedDocumentId(n.linkId);
                            setActiveTab('documents');
                          } else if (n.type === 'customization') {
                            setActiveTab('template_studio');
                          } else {
                            setActiveTab('workflow');
                          }
                        }
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        !n.read ? 'bg-blue-50/80 dark:bg-blue-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu & Logout */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center space-x-2.5 p-1 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-blue-700/40 object-cover"
            />
            <div className="text-left hidden sm:block">
              <p className={`text-xs font-bold leading-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser.name}</p>
              <p className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold capitalize mt-0.5">{currentUser.role === 'boss' ? 'Senior Partner' : 'Associate Lawyer'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Switcher Dropdown */}
          {showUserDropdown && (
            <div className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-2xl z-50 overflow-hidden divide-y ${
              isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
            }`}>
              <div className={`p-3 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Switch Account</p>
                <p className="text-[11px] text-slate-500">Test partner vs lawyer features</p>
              </div>

              <div className="p-1.5 space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      quickLogin(u.role);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${
                      currentUser.id === u.id
                        ? 'bg-blue-900/10 border border-blue-800/30'
                        : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{u.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{u.role === 'boss' ? 'Senior Partner' : 'Associate Lawyer'}</p>
                      </div>
                    </div>
                    {currentUser.id === u.id && (
                      <CheckCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={logout}
                  className="w-full p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out to Landing Page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
