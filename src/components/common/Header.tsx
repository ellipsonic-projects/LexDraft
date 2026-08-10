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
    <header className={`h-16 border-b px-6 flex items-center justify-between sticky top-0 z-30 transition-all ${
      isDark 
        ? 'bg-slate-900 border-slate-800 text-slate-100' 
        : 'bg-white border-[#E2E7ED] text-ink-black shadow-[0_1px_3px_0_rgba(15,23,42,0.01)]'
    }`}>
      {/* Left: Brand & Workspace */}
      <div className="flex items-center space-x-4">
        <div 
          className="flex items-center space-x-3 cursor-pointer" 
          onClick={() => setActiveTab(currentUser.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-ink-black dark:bg-paper-white flex items-center justify-center transition-transform hover:scale-105">
            <Scale className="w-4 h-4 text-paper-white dark:text-ink-black stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-sohne font-bold text-base tracking-tight">
                Lex<span className="serif-display font-light italic text-sienna-brown dark:text-blush-peach">Draft</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-mist-gray dark:bg-slate-800 text-slate-500 rounded-full uppercase tracking-wider">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{organization.name}</p>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Trigger & Search */}
      <div className="flex-1 max-w-sm mx-8 hidden md:block">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`w-full h-9 border rounded-xl px-3.5 flex items-center justify-between text-xs transition-all duration-150 group ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-400'
              : 'bg-mist-gray/40 hover:bg-mist-gray/80 border-slate-200/60 text-slate-500'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-ink-black dark:group-hover:text-white transition-colors" />
            <span className="font-sohne font-light">Search templates, vault, logs...</span>
          </div>
          <div className={`flex items-center space-x-1 border rounded px-1.5 py-0.5 text-[10px] font-mono ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200/80 text-slate-400'
          }`}>
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Actions: Role Switcher, Theme Toggle & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Role Switcher Pills */}
        <div className={`hidden lg:flex items-center p-0.5 rounded-full border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-mist-gray/60 border-slate-200/60'
        }`}>
          <button
            onClick={() => quickLogin('boss')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center space-x-1 transition-all ${
              currentUser.role === 'boss'
                ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Partner</span>
          </button>
          <button
            onClick={() => quickLogin('employee')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center space-x-1 transition-all ${
              currentUser.role === 'employee'
                ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>Lawyer</span>
          </button>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full border transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-blush-peach hover:bg-slate-800' : 'bg-mist-gray/40 border-slate-200 text-slate-700 hover:bg-mist-gray/80'
          }`}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Notifications Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center relative transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800' : 'bg-mist-gray/40 border-slate-200 text-slate-700 hover:bg-mist-gray/80'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-sienna-brown text-white font-bold text-[8px] flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 border rounded-2xl shadow-xl z-50 overflow-hidden divide-y ${
              isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-150 divide-slate-100'
            }`}>
              <div className={`p-3.5 flex items-center justify-between ${isDark ? 'bg-slate-950' : 'bg-mist-gray/20'}`}>
                <div className="flex items-center space-x-2">
                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                  <span className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-ink-black'}`}>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-blush-peach text-sienna-brown font-semibold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-[10px] text-slate-400 hover:text-ink-black dark:hover:text-white transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-light">No notifications yet</div>
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
                      className={`p-3.5 hover:bg-mist-gray/40 dark:hover:bg-slate-850/50 cursor-pointer transition-colors ${
                        !n.read ? 'bg-mist-gray/10 dark:bg-slate-850/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{n.title}</span>
                        <span className="text-[9px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal font-light">{n.message}</p>
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
            className={`flex items-center space-x-2 p-1 rounded-full transition-colors ${
              isDark ? 'hover:bg-slate-900' : 'hover:bg-mist-gray/30'
            }`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
            />
            <div className="text-left hidden sm:block">
              <p className={`text-[11px] font-semibold leading-none ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{currentUser.name}</p>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {currentUser.role === 'boss' ? 'Partner' : 'Lawyer'}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* User Switcher Dropdown */}
          {showUserDropdown && (
            <div className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-xl z-50 overflow-hidden divide-y ${
              isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-150 divide-slate-100'
            }`}>
              <div className={`p-3 ${isDark ? 'bg-slate-950' : 'bg-mist-gray/20'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Account</p>
                <p className="text-[10px] text-slate-500 font-light">Test partner vs lawyer features</p>
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
                        ? 'bg-mist-gray dark:bg-slate-950 border border-slate-200 dark:border-slate-800'
                        : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{u.name}</p>
                        <p className="text-[9px] text-slate-400 capitalize">{u.role === 'boss' ? 'Senior Partner' : 'Associate Lawyer'}</p>
                      </div>
                    </div>
                    {currentUser.id === u.id && (
                      <CheckCircle className="w-3.5 h-3.5 text-slate-650" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={logout}
                  className="w-full p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
