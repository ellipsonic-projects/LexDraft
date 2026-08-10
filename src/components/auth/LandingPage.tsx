import React, { useState, useEffect, useRef } from 'react';
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
  Moon,
  ChevronDown,
  ChevronUp
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

  const loginSectionRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isWorkspaceFocus, setIsWorkspaceFocus] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
        } else if (entry.boundingClientRect.top > 0) {
          setIsRevealed(false);
        }
      },
      { threshold: 0.1 }
    );
    if (loginSectionRef.current) {
      observer.observe(loginSectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const handleScrollToLogin = () => {
    setIsWorkspaceFocus(true);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(emailInput, selectedRole);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors selection:bg-blue-900/10 selection:text-ink-black ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F8] text-ink-black'
    }`}>
      {/* Header Bar */}
      <header className={`h-20 border-b px-8 md:px-12 flex items-center justify-between sticky top-0 z-30 ${
        isDark ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-[#E2E7ED] text-ink-black'
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

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-full border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-800 text-blush-peach hover:bg-slate-800' : 'bg-mist-gray/40 border-slate-200 text-slate-700 hover:bg-mist-gray/80 shadow-xs'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
            className="btn-filled text-xs rounded-full cursor-pointer flex items-center space-x-1"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Expanded Hero Section */}
      <main className="flex-grow w-full px-8 md:px-16 lg:px-24 py-16 md:py-24 flex flex-col items-center justify-center text-center space-y-12 md:space-y-16 animate-page-fade">
        <div className="space-y-6 w-full max-w-5xl">
          <span className="px-3.5 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach uppercase tracking-widest inline-flex items-center space-x-1.5 border border-sienna-brown/10 shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Built for Modern Law Firms</span>
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl serif-display font-light italic text-ink-black dark:text-paper-white leading-tight">
            Convert Documents into <span className="font-normal font-sohne not-italic text-sienna-brown dark:text-blush-peach">AI Reusable Templates</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-slate-450 dark:text-slate-500 font-light max-w-3xl mx-auto">
            Eliminate repetitive legal drafting. Populate client agreements with automated variable extraction, partner review workflows, and system versioning.
          </p>

          {/* Cue Button */}
          <div className="pt-6 animate-pulse duration-3000">
            <button
              onClick={handleScrollToLogin}
              className="group inline-flex flex-col items-center space-y-2 text-xs md:text-sm text-sienna-brown dark:text-blush-peach hover:opacity-80 transition-opacity cursor-pointer font-medium"
            >
              <span>Continue to Workspace</span>
              <ChevronDown className="w-4 h-4 transform group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 1-Click Quick Demo Accounts Box - Full width expansion for normal scroll option */}
        <div 
          ref={loginSectionRef}
          className={`floating-artifact p-8 md:p-12 max-w-5xl w-full space-y-10 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isRevealed 
              ? 'opacity-100 blur-none translate-y-0 scale-100' 
              : 'opacity-30 blur-sm translate-y-8 scale-98 pointer-events-none'
          }`}
        >
          <div className="text-center space-y-2">
            <h3 className="text-base md:text-lg font-semibold serif-heading text-ink-black dark:text-paper-white flex items-center justify-center space-x-2">
              <Lock className="w-4 h-4 text-slate-450" />
              <span>Demarcated Role Access Demo Sign-In</span>
            </h3>
            <p className="text-[11px] md:text-xs text-slate-400 dark:text-slate-550 font-light">
              Test isolated senior partner reviewer vs associate lawyer workbench permissions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Senior Partner Card */}
            <div className="p-6 md:p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[9px] font-bold bg-[#F3D6C4] text-sienna-brown uppercase tracking-wider">
                    Partner
                  </span>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-semibold text-ink-black dark:text-white">Rajesh Varma</h4>
                  <p className="text-[11px] md:text-xs font-mono text-slate-400">partner@apexlegal.in</p>
                </div>
                <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/60 pt-4 text-xs text-slate-450 dark:text-slate-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Admin Command Dashboard</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Template Checker & Updater</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Draft Review & Sign-Off</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => quickLogin('boss')}
                className="w-full mt-6 py-3.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-semibold shadow-xs flex items-center justify-center space-x-1 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Partner Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Associate Lawyer Card */}
            <div className="p-6 md:p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[9px] font-bold bg-[#EEF4FA] text-[#6F8FB8] uppercase tracking-wider">
                    Lawyer
                  </span>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-semibold text-ink-black dark:text-white">Ananya Roy</h4>
                  <p className="text-[11px] md:text-xs font-mono text-slate-400">lawyer@apexlegal.in</p>
                </div>
                <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/60 pt-4 text-xs text-slate-450 dark:text-slate-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Draft Document Generator</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Rich Layout Workspace Editor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Custom Variable Requests</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => quickLogin('employee')}
                className="w-full mt-6 py-3.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-semibold shadow-xs flex items-center justify-center space-x-1 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Lawyer Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Back to top option */}
        <div className={`text-center pt-6 transition-all duration-[600ms] ease-out ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
          <button
            onClick={handleScrollToTop}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-sienna-brown dark:hover:text-[#6F8FB8] transition-colors cursor-pointer font-medium uppercase tracking-widest text-[9px]"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Back to Top</span>
          </button>
        </div>
      </main>

      {/* Hybrid Focused Rising Login Panel overlay when cue is clicked */}
      {/* Blurred & Dimmed Backdrop Layer */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isWorkspaceFocus
            ? 'bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md opacity-100'
            : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsWorkspaceFocus(false)}
      />

      {/* Centered Rising Login Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-center p-4 md:p-8 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isWorkspaceFocus
            ? 'translate-y-[-10vh] opacity-100 scale-100'
            : 'translate-y-full opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Out-of-bounds Click Area to close */}
        <div className="absolute inset-0 -z-10" onClick={() => setIsWorkspaceFocus(false)} />

        <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-[#E2E7ED] dark:border-slate-800 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-8 md:p-12 space-y-8 text-center relative">
          
          {/* Close Header button inside Card */}
          <div className="flex justify-between items-center border-b border-[#E2E7ED] dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <h3 className="text-base md:text-lg font-semibold serif-heading text-ink-black dark:text-paper-white text-left">
                Demarcated Role Access Demo Sign-In
              </h3>
            </div>
            <button
              onClick={() => setIsWorkspaceFocus(false)}
              className="text-slate-400 hover:text-ink-black dark:hover:text-white px-3 py-1.5 border border-[#E2E7ED] dark:border-slate-800 rounded-full text-xs font-semibold cursor-pointer transition-colors"
            >
              ✕ Close View
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Senior Partner Card */}
            <div className="p-6 md:p-8 rounded-[24px] border border-[#E2E7ED] dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[9px] font-bold bg-[#F3D6C4] text-sienna-brown uppercase tracking-wider">
                    Partner
                  </span>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-semibold text-ink-black dark:text-white">Rajesh Varma</h4>
                  <p className="text-[11px] md:text-xs font-mono text-slate-400">partner@apexlegal.in</p>
                </div>
                <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/60 pt-4 text-xs text-slate-450 dark:text-slate-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Admin Command Dashboard</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Template Checker & Updater</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Draft Review & Sign-Off</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => quickLogin('boss')}
                className="w-full mt-6 py-3.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-semibold shadow-xs flex items-center justify-center space-x-1 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Partner Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Associate Lawyer Card */}
            <div className="p-6 md:p-8 rounded-[24px] border border-[#E2E7ED] dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[9px] font-bold bg-[#EEF4FA] text-[#6F8FB8] uppercase tracking-wider">
                    Lawyer
                  </span>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-semibold text-[#172033] dark:text-white">Ananya Roy</h4>
                  <p className="text-[11px] md:text-xs font-mono text-slate-400">lawyer@apexlegal.in</p>
                </div>
                <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/60 pt-4 text-xs text-slate-450 dark:text-slate-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Draft Document Generator</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Rich Layout Workspace Editor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18A77A]" />
                    <span>Custom Variable Requests</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => quickLogin('employee')}
                className="w-full mt-6 py-3.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-semibold shadow-xs flex items-center justify-center space-x-1 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Lawyer Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Auth Credentials Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-slate-150 dark:border-slate-850 rounded-[24px] bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-slate-400" />
                <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                  {authMode === 'login' ? 'Workspace Sign In' : 'Register Workspace'}
                </h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-450 hover:text-ink-black dark:hover:text-white p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Active Workspace Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('boss');
                      setEmailInput('partner@apexlegal.in');
                    }}
                    className={`py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedRole === 'boss' ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black' : 'bg-mist-gray dark:bg-slate-800 text-slate-500'
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
                    className={`py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedRole === 'employee' ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black' : 'bg-mist-gray dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    Associate Lawyer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Firm Email Address</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full input-composer text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full input-composer text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer"
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
