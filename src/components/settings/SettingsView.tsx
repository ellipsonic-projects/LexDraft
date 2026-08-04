import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Shield, Users, Building, Plus } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { organization, showToast, theme } = useApp();
  const isDark = theme === 'dark';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'boss' | 'employee'>('employee');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    showToast(`Invitation sent to ${inviteName} (${inviteEmail})`, 'success');
    setInviteEmail('');
    setInviteName('');
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <Settings className="w-3.5 h-3.5" />
              <span>Workspace Administration</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Organization Settings & Team Roles
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Manage law firm organization profile, subscription tier, and role-based security permissions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Building className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>Law Firm Workspace</span>
            </h3>

            <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border text-xs ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-slate-500">Organization Name:</span>
                <p className={`font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{organization.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Subscription Tier:</span>
                <p className="font-bold text-blue-900 dark:text-blue-400 mt-0.5">{organization.plan} Plan</p>
              </div>
              <div>
                <span className="text-slate-500">Active Lawyers:</span>
                <p className={`font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{organization.totalMembers} Members</p>
              </div>
              <div>
                <span className="text-slate-500">Workspace Status:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Isolated Security Sandbox</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Invite Lawyer to Workspace</span>
            </h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Lawyer Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Adv. Vikramaditya Seth"
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 ${
                      isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="vikram@apexlegal.in"
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 ${
                      isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 capitalize ${
                    isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <option value="employee">Associate Lawyer (Generator & Editor Access)</option>
                  <option value="boss">Boss / Senior Partner (Full Firm Review & Analytics)</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/20 transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Send Firm Workspace Invitation</span>
              </button>
            </form>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Role Permissions Matrix</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/70 border-blue-800/30' : 'bg-blue-50/60 border-blue-200'
            }`}>
              <span className="font-bold text-blue-900 dark:text-blue-400">Boss / Senior Partner</span>
              <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
                <li>Upload & edit master AI templates</li>
                <li>View all lawyer documents & work tasks</li>
                <li>Review, comment, approve, or reject drafts</li>
                <li>View firm productivity analytics & logs</li>
                <li>Restore historic document versions</li>
              </ul>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/70 border-indigo-500/30' : 'bg-indigo-50/60 border-indigo-200'
            }`}>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">Associate Lawyer</span>
              <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
                <li>Generate legal documents from templates</li>
                <li>Edit assigned drafts in Rich Editor</li>
                <li>Save versions and auto-save drafts</li>
                <li>Submit completed drafts for review</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
