import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Settings, Shield, Users, Building, Plus, Briefcase, Mail, Phone, CheckCircle2, UserX, Clock, Check, RefreshCw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { organization, showToast, theme, clients, matters, createClient, createMatter, users } = useApp();
  const isDark = theme === 'dark';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'boss' | 'employee'>('employee');
  const [isInviting, setIsInviting] = useState(false);

  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Client addition modal / form
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [initialMatter, setInitialMatter] = useState('');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const res = await api.get('/invitations');
      setInvitations(res.data.invitations || []);
    } catch (err: any) {
      console.error('Failed to fetch workspace invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      showToast('Client name is required', 'warning');
      return;
    }
    setIsSubmittingClient(true);
    try {
      const email = clientEmail.trim() || `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`;
      const phone = clientPhone.trim() || '+91 9800000000';
      const created = await createClient(clientName.trim(), email, phone);
      if (created) {
        const mTitle = initialMatter.trim() || `${clientName.trim()} - General Legal Matter`;
        const mCode = `MAT-${Date.now().toString().slice(-4)}`;
        await createMatter(created.id, mTitle, mCode);
        setShowAddClient(false);
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setInitialMatter('');
        showToast(`Client "${created.name}" created successfully!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create client', 'error');
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setIsInviting(true);
    try {
      const res = await api.post('/invitations', {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole === 'boss' ? 'BOSS' : 'EMPLOYEE',
      });
      showToast(res.message || 'Invitation sent successfully.', 'success');
      setInviteEmail('');
      setInviteName('');
      fetchInvitations();
    } catch (err: any) {
      showToast(err.message || 'Failed to send invitation.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await api.delete(`/invitations/${id}`);
      showToast('Invitation revoked successfully.', 'success');
      fetchInvitations();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke invitation.', 'error');
    }
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
                disabled={isInviting}
                className="w-full py-3 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </form>

            {/* Workspace Directory (Pending Invitations & Active Members) */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-6">
              
              {/* Active Workspace Members */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Firm Members ({users.length})</h4>
                <div className="grid grid-cols-1 gap-2">
                  {users.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                    >
                      <div className="flex items-center space-x-3">
                        <img src={member.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div>
                          <div className="text-xs font-semibold text-ink-black dark:text-white flex items-center gap-1.5">
                            {member.name}
                            {member.id === users[0]?.id && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">Owner</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-light font-mono">{member.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          member.role === 'boss' ? 'bg-[#F3D6C4] text-sienna-brown' : 'bg-[#EEF4FA] text-[#6F8FB8]'
                        }`}>
                          {member.role === 'boss' ? 'Partner' : 'Lawyer'}
                        </span>
                        <div className="text-[10px] text-slate-405 mt-0.5">{member.title || 'Legal Professional'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Workspace Invitations */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invitations ({invitations.filter(i => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()).length})</h4>
                  <button
                    type="button"
                    onClick={fetchInvitations}
                    disabled={loadingInvites}
                    className="text-[10px] text-slate-450 hover:text-ink-black dark:hover:text-white flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingInvites ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingInvites && invitations.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-450">Loading invitations...</div>
                ) : invitations.filter(i => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()).length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 font-light border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No pending invitations.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {invitations.filter(i => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()).map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-ink-black dark:text-white">{invite.name}</div>
                          <div className="text-[10px] text-slate-400 font-light font-mono">{invite.email}</div>
                          <div className="flex items-center space-x-1.5 text-[9px] text-slate-450 pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Expires {new Date(invite.expiresAt).toLocaleDateString()} {new Date(invite.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              invite.role === 'BOSS' ? 'bg-[#F3D6C4] text-sienna-brown' : 'bg-[#EEF4FA] text-[#6F8FB8]'
                            }`}>
                              {invite.role === 'BOSS' ? 'Partner' : 'Lawyer'}
                            </span>
                            <div className="text-[9px] text-slate-450 mt-0.5 font-light">By {invite.invitedByUser?.name || 'Partner'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvitation(invite.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full transition-colors cursor-pointer"
                            title="Revoke Invitation"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Clients & Retainers Directory */}
          <div className="floating-artifact space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-slate-450" />
                <span>Firm Clients & Retainers ({clients.length})</span>
              </h3>
              <button
                onClick={() => setShowAddClient(true)}
                className="btn-filled text-xs rounded-full cursor-pointer flex items-center space-x-1 py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Client</span>
              </button>
            </div>

            {/* List of Clients */}
            <div className="space-y-3">
              {clients.map(c => {
                const clientMatters = matters.filter(m => m.clientId === c.id);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-ink-black dark:text-white">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          {clientMatters.length} {clientMatters.length === 1 ? 'Matter' : 'Matters'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-light">
                        {c.contactEmail && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.contactEmail}</span>
                          </span>
                        )}
                        {c.contactPhone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.contactPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-light">
                      {clientMatters.map(m => (
                        <div key={m.id} className="text-slate-600 dark:text-slate-300 font-medium">
                          {m.title} <span className="font-mono text-[10px] text-slate-400">({m.matterCode})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Client Modal */}
          {showAddClient && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md border border-slate-150 dark:border-slate-850 rounded-[24px] bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                      Add New Law Firm Client
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddClient(false)}
                    className="text-slate-400 hover:text-ink-black dark:hover:text-white p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Client / Entity Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Ramesh Enterprises Pvt Ltd"
                      className="w-full input-composer text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="contact@ramesh.in"
                      className="w-full input-composer text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full input-composer text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Primary Matter Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={initialMatter}
                      onChange={(e) => setInitialMatter(e.target.value)}
                      placeholder="e.g. Commercial Lease Diligence"
                      className="w-full input-composer text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddClient(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingClient}
                      className="px-4 py-2 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingClient ? 'Creating...' : 'Create Client'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
