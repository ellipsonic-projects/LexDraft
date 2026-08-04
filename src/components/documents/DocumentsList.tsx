import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Search,
  Trash2,
  PlusCircle,
  Edit3,
  ChevronLeft
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
    theme
  } = useApp();

  const isDark = theme === 'dark';
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeDoc = documents.find(d => d.id === selectedDocumentId);

  const statuses = ['All', 'draft', 'under_review', 'approved', 'rejected'];

  const filteredDocs = documents.filter(doc => {
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    const matchesSearch = doc.title.toLowerCase().includes(searchFilter.toLowerCase()) || doc.clientName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Approved & Sealed</span>;
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30">Under Review</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">Revisions Requested</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Draft</span>;
    }
  };

  // If a document is selected, render the Combined Vault Editor!
  if (activeDoc) {
    return (
      <div className="flex flex-col h-full">
        <div className={`p-3 border-b px-6 flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => setSelectedDocumentId(null)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 hover:bg-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Document Vault</span>
          </button>

          <span className="text-xs text-slate-500 font-semibold">
            Combined Vault & Rich Legal Editor • Version Snapshot Control
          </span>
        </div>

        <LegalDocumentEditor />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Combined Document Vault & Editor</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Firm Legal Document Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Select any agreement to open the integrated Rich Editor with version snapshots, line diffing, and partner review sign-off.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('document_generator')}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Generate New Document</span>
        </button>
      </div>

      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                statusFilter === st
                  ? 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/40 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents or clients..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 border focus:outline-none ${
              isDark ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-blue-800/50' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-800'
            }`}
          />
        </div>
      </div>

      <div className={`rounded-2xl border shadow-xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No documents match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <tr>
                  <th className="p-4">Document Title & Client</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Author Lawyer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                    <td className="p-4">
                      <div>
                        <p className={`font-bold hover:text-blue-900 dark:hover:text-blue-400 cursor-pointer ${
                          isDark ? 'text-slate-200' : 'text-slate-900'
                        }`} onClick={() => {
                          setSelectedDocumentId(doc.id);
                        }}>
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-slate-500">Client: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{doc.clientName}</strong></p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500">{doc.category}</td>
                    <td className="p-4 font-mono text-blue-900 dark:text-blue-400 font-bold">v{doc.currentVersion}</td>
                    <td className={`p-4 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{doc.authorName}</td>
                    <td className="p-4">{getStatusBadge(doc.status)}</td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDocumentId(doc.id);
                        }}
                        className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center space-x-1 inline-flex"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Open Editor</span>
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
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
