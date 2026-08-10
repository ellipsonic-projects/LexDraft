import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Search,
  Trash2,
  PlusCircle,
  Edit3,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { DocumentStatus } from '../../types';
import { LegalDocumentEditor } from '../editor/LegalDocumentEditor';

export const DocumentsList: React.FC = () => {
  const {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    setActiveTab,
    deleteDocument,
    theme,
    clients,
    currentUser,
    renewDocument,
    matters
  } = useApp();

  const isDark = theme === 'dark';
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClientId, setSelectedClientId] = useState<string>('All');
  const [selectedMatterId, setSelectedMatterId] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeDoc = documents.find(d => d.id === selectedDocumentId);

  const statuses = ['All', 'draft', 'under_review', 'approved', 'rejected'];

  const filteredDocs = documents.filter(doc => {
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    const matchesClient = selectedClientId === 'All' || doc.clientId === selectedClientId;
    const matchesMatter = selectedMatterId === 'All' || doc.matterId === selectedMatterId;
    const clientName = clients.find(c => c.id === doc.clientId)?.name || '';
    const matchesSearch = doc.title.toLowerCase().includes(searchFilter.toLowerCase()) || clientName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesClient && matchesMatter && matchesSearch;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Sealed</span>;
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach border border-sienna-brown/10 uppercase tracking-wider">In Review</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-500/20 uppercase tracking-wider">Revisions</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-500 uppercase tracking-wider">Draft</span>;
    }
  };

  // If a document is selected, render the Editor
  if (activeDoc) {
    return (
      <div className="flex flex-col h-full animate-page-fade">
        <div className={`p-3 border-b px-6 flex items-center justify-between ${
          isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'
        }`}>
          <button
            onClick={() => setSelectedDocumentId(null)}
            className="btn-ghost py-1.5 px-4 rounded-full text-xs flex items-center space-x-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>

          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            Rich Legal Editor • Version Snapshot Control
          </span>
        </div>

        <LegalDocumentEditor />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Firm Archives</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Secure Vault</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Vault, <span className="font-normal font-sohne not-italic text-slate-400">Legal Documents</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-505 font-light max-w-xl">
            Integrated Repository with version history, line diff comparisons, and partner approval sign-off.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('document_generator')}
          className="btn-filled rounded-full text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New AI Document</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {/* Status selector using raw text underlines for active */}
          <div className="flex items-center space-x-4">
            {statuses.map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs tracking-wider transition-colors cursor-pointer font-sohne uppercase ${
                  statusFilter === st
                    ? 'text-ink-black dark:text-white font-semibold underline underline-offset-4'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {st === 'All' ? 'All Status' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Client Filter Selector */}
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setSelectedMatterId('All');
            }}
            className="input-composer text-xs py-1 px-3"
          >
            <option value="All">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Matter Filter Selector */}
          <select
            value={selectedMatterId}
            onChange={(e) => setSelectedMatterId(e.target.value)}
            className="input-composer text-xs py-1 px-3"
          >
            <option value="All">All Matters</option>
            {matters.filter(m => selectedClientId === 'All' || m.clientId === selectedClientId).map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full input-composer text-xs pl-9 pr-3 py-2.5"
          />
        </div>
      </div>

      {/* Document Catalog Artifact */}
      <div className="floating-artifact p-0 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-light">No documents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-mist-gray/40 text-slate-505 border-slate-100'
              }`}>
                <tr>
                  <th className="p-4 pl-6">Document Title & Client</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Lawyer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-mist-gray/10'}`}>
                    <td className="p-4 pl-6">
                      <div className="space-y-0.5">
                        <p 
                          className={`font-semibold text-xs cursor-pointer ${
                            isDark ? 'text-slate-200 hover:text-white' : 'text-ink-black hover:text-slate-700'
                          }`} 
                          onClick={() => setSelectedDocumentId(doc.id)}
                        >
                          {doc.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-light">
                          Client: <span className="text-slate-500 font-normal">{clients.find(c => c.id === doc.clientId)?.name || 'Unknown'}</span>
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{doc.category}</td>
                    <td className="p-4 font-mono font-medium text-slate-550">v{doc.currentVersion}</td>
                    <td className="p-4 text-slate-500 font-medium">{doc.authorName}</td>
                    <td className="p-4">{getStatusBadge(doc.status)}</td>
                    <td className="p-4 text-slate-400 font-mono text-[10px]">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDocumentId(doc.id)}
                        className="px-3 py-1 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-[10px] font-semibold transition-transform active:scale-95 inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {doc.status === 'approved' && currentUser.role === 'boss' && (
                        <button
                          onClick={() => renewDocument(doc.id)}
                          className="px-3 py-1 bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach border border-sienna-brown/10 rounded-full text-[10px] font-semibold transition-transform active:scale-95 inline-flex items-center space-x-1 cursor-pointer"
                          title="Renew Document"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Renew</span>
                        </button>
                      )}

                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1.5 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer inline-flex"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
