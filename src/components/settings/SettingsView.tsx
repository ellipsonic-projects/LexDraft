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
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-455 font-bold">Admin Portal</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Firm Scope Controls</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Settings, <span className="font-normal font-sohne not-italic text-slate-400">Firm Profile & Team Invite</span>
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 font-light max-w-xl">
            Manage law firm organization profile parameters, subscription settings, and lawyer account invites.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Workspace info */}
          <div className="floating-artifact space-y-6">
            <h3 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-slate-450" />
              <span>Law Firm Workspace Info</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 p-5 rounded-[20px] bg-mist-gray/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-light">Firm Name:</span>
                <p className="font-semibold text-ink-black dark:text-white mt-0.5">{organization.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-light">Service Tier:</span>
                <p className="font-semibold text-sienna-brown dark:text-blush-peach mt-0.5">{organization.plan} Edition</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-light">Seat Allocations:</span>
                <p className="font-semibold text-ink-black dark:text-white mt-0.5">{organization.totalMembers} Members</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-light">Sandbox Status:</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-450 mt-0.5">Active Isolation Sandbox</p>
              </div>
            </div>
          </div>

          {/* Invitation Form */}
          <div className="floating-artifact space-y-6">
            <h3 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-450" />
              <span>Invite Lawyer to Workspace</span>
            </h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lawyer Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Vikramaditya Seth"
                    className="w-full input-composer text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="vikram@apexlegal.in"
                    className="w-full input-composer text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full input-composer text-xs py-2"
                >
                  <option value="employee">Associate Lawyer (Draft & Edit Access)</option>
                  <option value="boss">Boss / Senior Partner (Full Command Review Access)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer"
              >
                Send Invitation
              </button>
            </form>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="card-neutral h-fit space-y-6">
          <h3 className="text-base font-semibold text-ink-black dark:text-paper-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-slate-405" />
            <span>Firm Role Matrix</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-sienna-brown dark:text-blush-peach uppercase text-[10px] tracking-wider">Senior Partner</span>
              <ul className="text-[11px] text-slate-450 dark:text-slate-500 list-disc pl-4 space-y-1 font-light leading-relaxed">
                <li>Manage master legal templates</li>
                <li>Assign and review workbench tasks</li>
                <li>Approve & seal drafts</li>
                <li>Access performance logs & analytics</li>
              </ul>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
              <span className="font-bold text-slate-650 dark:text-slate-350 uppercase text-[10px] tracking-wider">Associate Lawyer</span>
              <ul className="text-[11px] text-slate-455 dark:text-slate-500 list-disc pl-4 space-y-1 font-light leading-relaxed">
                <li>Draft new agreements</li>
                <li>Edit documents in workspace editor</li>
                <li>Manage save history checkpoints</li>
                <li>Submit drafts for review</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
