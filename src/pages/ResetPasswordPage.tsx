import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Scale, Lock, Sparkles, Sun, Moon } from 'lucide-react';

interface ResetPasswordPageProps {
  token: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token }) => {
  const { theme, toggleTheme, showToast } = useApp();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        await api.get(`/auth/reset-password/validate/${token}`);
      } catch (err: any) {
        setError(err.message || 'Reset password link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setResetting(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      showToast('Password reset successfully! Redirecting you...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password. Please try again.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F8] text-ink-black'
    }`}>
      {/* Header */}
      <header className={`h-20 border-b px-8 md:px-12 flex items-center justify-between ${
        isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-[#E2E7ED]'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-ink-black dark:bg-paper-white flex items-center justify-center">
            <Scale className="w-4 h-4 text-paper-white dark:text-ink-black" />
          </div>
          <div>
            <span className="font-sohne font-bold text-base tracking-tight">
              Lex<span className="serif-display font-light italic text-sienna-brown dark:text-blush-peach">Draft</span>
            </span>
            <p className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">AI Legal Template & Workflow Platform</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-full border transition-colors cursor-pointer ${
            isDark ? 'bg-slate-900 border-slate-800 text-blush-peach hover:bg-slate-800' : 'bg-mist-gray/40 border-slate-200 text-slate-700 hover:bg-mist-gray/80 shadow-xs'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 animate-page-fade">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#E2E7ED] dark:border-slate-800 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-8 space-y-6 relative overflow-hidden">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-sienna-brown border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-light">Validating reset link...</p>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl serif-heading font-semibold text-ink-black dark:text-white">Link Expired or Invalid</h2>
                <p className="text-xs text-slate-450 dark:text-slate-555 leading-relaxed">
                  {error}
                </p>
              </div>
              <a
                href="/"
                className="inline-block px-6 py-2.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-xs transition-transform active:scale-98 cursor-pointer"
              >
                Go to Homepage
              </a>
            </div>
          )}

          {!loading && !error && success && (
            <div className="space-y-6 text-center py-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl serif-heading font-semibold text-ink-black dark:text-white">Password Updated!</h2>
                <p className="text-xs text-slate-450 dark:text-slate-555 leading-relaxed">
                  Your password has been successfully updated. Redirecting you to the workspace login...
                </p>
              </div>
            </div>
          )}

          {!loading && !error && !success && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <h2 className="text-2xl serif-heading font-normal text-ink-black dark:text-white pt-2">
                  Choose New Password
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-light">
                  Please choose a strong password that is at least 8 characters long.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full input-composer text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full input-composer text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full py-3.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                >
                  <span>{resetting ? 'Resetting Password...' : 'Save Password & Log In'}</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
