import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, FileText, Wand2, PlusCircle, Kanban, X, ArrowRight } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    templates,
    documents,
    tasks,
    setActiveTab,
    setSelectedDocumentId,
    setSelectedTemplateId,
    theme
  } = useApp();

  const [query, setQuery] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()));
  const filteredDocuments = documents.filter(d => d.title.toLowerCase().includes(query.toLowerCase()) || d.clientName.toLowerCase().includes(query.toLowerCase()));
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.assigneeName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden divide-y ${
        isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
      }`}>
        <div className={`p-4 flex items-center space-x-3 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <Search className="w-5 h-5 text-blue-800" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates, documents, clients, lawyers, tasks..."
            className={`w-full text-sm font-medium focus:outline-none ${
              isDark ? 'bg-transparent text-slate-100 placeholder-slate-500' : 'bg-transparent text-slate-900 placeholder-slate-400'
            }`}
            autoFocus
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {!query && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quick Actions</p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('document_generator');
                    setIsCommandPaletteOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border border-transparent text-left flex items-center justify-between text-xs font-bold transition-all ${
                    isDark ? 'hover:bg-blue-900/10 text-slate-200' : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <PlusCircle className="w-4 h-4 text-blue-800" />
                    <span>Generate New AI Document</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('template_studio');
                    setIsCommandPaletteOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border border-transparent text-left flex items-center justify-between text-xs font-bold transition-all ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Wand2 className="w-4 h-4 text-indigo-500" />
                    <span>Upload & Extract New Legal Template</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {filteredTemplates.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Legal Templates ({filteredTemplates.length})</p>
              <div className="space-y-1">
                {filteredTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setActiveTab('document_generator');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border border-transparent text-left flex items-center justify-between text-xs transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Wand2 className="w-4 h-4 text-blue-800" />
                      <div>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{t.name}</p>
                        <p className="text-[10px] text-slate-500">{t.category} • {t.extractedVariables.length} variables</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-900/10 text-blue-900 dark:text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-800/20">Use Template</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredDocuments.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Legal Documents ({filteredDocuments.length})</p>
              <div className="space-y-1">
                {filteredDocuments.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDocumentId(d.id);
                      setActiveTab('document_editor');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border border-transparent text-left flex items-center justify-between text-xs transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{d.title}</p>
                        <p className="text-[10px] text-slate-500">Client: {d.clientName} • Status: {d.status.toUpperCase()}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/20">Open Editor</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workflow Tasks ({filteredTasks.length})</p>
              <div className="space-y-1">
                {filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab('workflow');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border border-transparent text-left flex items-center justify-between text-xs transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Kanban className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{t.title}</p>
                        <p className="text-[10px] text-slate-500">Assignee: {t.assigneeName} • Priority: {t.priority.toUpperCase()}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">View Board</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`p-2.5 flex items-center justify-between text-[11px] text-slate-400 px-4 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}>
          <span>Tip: Navigate with keyboard shortcuts</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
