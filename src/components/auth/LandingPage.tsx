import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scale,
  ShieldCheck,
  Briefcase,
  Wand2,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { UserRole } from '../../types';

export const LandingPage: React.FC = () => {
  const { login, quickLogin, theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('boss');
  const [emailInput, setEmailInput] = useState('partner@apexlegal.in');
  const [passwordInput, setPasswordInput] = useState('password123');

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(emailInput, selectedRole);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors selection:bg-blue-900/30 selection:text-blue-900 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Bar */}
      <header className={`h-20 border-b px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-900/20 ring-1 ring-blue-500/30">
            <Scale className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <span className={`font-extrabold text-xl tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Lex<span className="text-blue-800 dark:text-blue-400">Draft</span>
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">AI Legal Template & Workflow Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2"
          >
            <span>Sign In to Firm Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-8 py-12 flex flex-col items-center justify-center text-center space-y-12">
        <div className="space-y-4 max-w-3xl">
          <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider inline-flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Built for Modern Law Firms & Advocates</span>
          </span>

          <h1 className={`text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Convert Legal Documents into <span className="text-blue-900 dark:text-blue-400">AI Reusable Templates</span> & Workflows
          </h1>

          <p className={`text-base sm:text-lg leading-relaxed font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Eliminate repetitive drafting. Generate client agreements in minutes with smart variable extraction, partner approval sign-offs, and automatic version control.
          </p>
        </div>

        {/* 1-Click Quick Demo Accounts Box */}
        <div className={`p-8 rounded-3xl border-2 shadow-2xl max-w-2xl w-full space-y-6 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-center space-y-1">
            <h3 className={`text-lg font-extrabold flex items-center justify-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Lock className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <span>Select Sample Account for Demo Sign-In</span>
            </h3>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Test LexDraft with pre-configured Senior Partner and Associate Lawyer workspaces
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Senior Partner Demo Login Card */}
            <div
              onClick={() => quickLogin('boss')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all space-y-4 group text-left shadow-lg ${
                isDark
                  ? 'bg-slate-950 border-blue-800/50 hover:border-blue-400'
                  : 'bg-white border-slate-300 hover:border-blue-900 hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-blue-900 text-white shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-900 text-white uppercase shadow-xs">
                  Senior Partner
                </span>
              </div>

              <div>
                <h4 className={`text-lg font-extrabold transition-colors ${
                  isDark ? 'text-slate-100 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-900'
                }`}>
                  Adv. Rajesh Varma
                </h4>
                <p className="text-xs font-mono font-extrabold text-blue-900 dark:text-blue-400 mt-0.5">partner@apexlegal.in</p>
              </div>

              <ul className={`text-xs font-semibold space-y-2 pt-3 border-t ${
                isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
              }`}>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" /><span>Full Employee Workload Dashboard</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" /><span>Template Checker & Updater</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" /><span>Review & Approve Lawyer Drafts</span></li>
              </ul>

              <button className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2">
                <span>Sign In as Senior Partner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Associate Lawyer Demo Login Card */}
            <div
              onClick={() => quickLogin('employee')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all space-y-4 group text-left shadow-lg ${
                isDark
                  ? 'bg-slate-950 border-indigo-500/50 hover:border-indigo-400'
                  : 'bg-white border-slate-300 hover:border-indigo-600 hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md">
                  <Briefcase className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-600 text-white uppercase shadow-xs">
                  Associate Lawyer
                </span>
              </div>

              <div>
                <h4 className={`text-lg font-extrabold transition-colors ${
                  isDark ? 'text-slate-100 group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'
                }`}>
                  Adv. Ananya Roy
                </h4>
                <p className="text-xs font-mono font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">lawyer@apexlegal.in</p>
              </div>

              <ul className={`text-xs font-semibold space-y-2 pt-3 border-t ${
                isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
              }`}>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /><span>Case Requirements & Urgency</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /><span>Step-by-step Document Generator</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /><span>Request Template Customizations</span></li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2">
                <span>Sign In as Associate Lawyer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Features Highlights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left pt-4">
          <div className={`p-6 rounded-2xl border-2 shadow-lg transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 border border-blue-800/30 flex items-center justify-center mb-4">
              <Wand2 className="w-6 h-6 text-blue-900 dark:text-blue-400" />
            </div>
            <h4 className={`text-lg font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              AI Variable Extraction
            </h4>
            <p className={`text-xs font-semibold mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Upload existing DOCX agreements to automatically convert dynamic fields into reusable master templates.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border-2 shadow-lg transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 border border-blue-800/30 flex items-center justify-center mb-4">
              <FileCheck2 className="w-6 h-6 text-blue-900 dark:text-blue-400" />
            </div>
            <h4 className={`text-lg font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Partner Sign-Off & Review
            </h4>
            <p className={`text-xs font-semibold mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Lawyers submit drafts to Senior Partners for review, inline comments, revision requests, or 1-click official sealing.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border-2 shadow-lg transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 border border-blue-800/30 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-900 dark:text-blue-400" />
            </div>
            <h4 className={`text-lg font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Live Kanban Workflow
            </h4>
            <p className={`text-xs font-semibold mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Track case urgency, due dates, and document preparation stages with live real-time dashboard updates.
            </p>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md border rounded-3xl shadow-2xl p-8 space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {authMode === 'login' ? 'Firm Workspace Login' : 'Create Firm Workspace Account'}
                </h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('boss');
                      setEmailInput('partner@apexlegal.in');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedRole === 'boss' ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Senior Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('employee');
                      setEmailInput('lawyer@apexlegal.in');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedRole === 'employee' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Associate Lawyer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Firm Email Address</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono mt-1 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono mt-1 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/20 transition-all"
              >
                Sign In to LexDraft
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
