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
    theme,
    clients
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
  const filteredDocuments = documents.filter(d => {
    const clientName = clients.find(c => c.id === d.clientId)?.name || '';
    return d.title.toLowerCase().includes(query.toLowerCase()) || clientName.toLowerCase().includes(query.toLowerCase());
  });
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.assigneeName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4 animate-page-fade">
      <div className={`w-full max-w-2xl border border-slate-150 dark:border-slate-850 rounded-[24px] shadow-2xl overflow-hidden divide-y ${
        isDark ? 'bg-slate-900 divide-slate-800' : 'bg-white divide-slate-100'
      }`}>
        <div className={`p-4 flex items-center space-x-3 ${isDark ? 'bg-slate-950' : 'bg-mist-gray/20'}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type search terms..."
            className={`w-full text-sm font-medium focus:outline-none placeholder-slate-400 ${
              isDark ? 'text-slate-100' : 'text-ink-black'
            }`}
            autoFocus
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Actions</p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('document_generator');
                    setIsCommandPaletteOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-mist-gray/40 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Generate New AI Document</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('template_studio');
                    setIsCommandPaletteOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-mist-gray/40 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Wand2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload & Extract New Legal Template</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {filteredTemplates.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legal Templates ({filteredTemplates.length})</p>
              <div className="space-y-1">
                {filteredTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setActiveTab('document_generator');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-mist-gray/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Wand2 className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{t.name}</p>
                        <p className="text-[10px] text-slate-400">{t.category} • {t.extractedVariables.length} variables</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-mist-gray dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">Use</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredDocuments.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legal Documents ({filteredDocuments.length})</p>
              <div className="space-y-1">
                {filteredDocuments.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDocumentId(d.id);
                      setActiveTab('document_editor');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-mist-gray/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{d.title}</p>
                        <p className="text-[10px] text-slate-400">Client: {clients.find(c => c.id === d.clientId)?.name || 'Unknown'} • Status: {d.status}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-mist-gray dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-505 font-semibold uppercase tracking-wider">Open</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workflow Tasks ({filteredTasks.length})</p>
              <div className="space-y-1">
                {filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab('workflow');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-mist-gray/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Kanban className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-ink-black'}`}>{t.title}</p>
                        <p className="text-[10px] text-slate-400">Assignee: {t.assigneeName} • Priority: {t.priority}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-mist-gray dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-505 font-semibold uppercase tracking-wider">Board</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`p-3 flex items-center justify-between text-[10px] text-slate-400 px-5 ${
          isDark ? 'bg-slate-950' : 'bg-mist-gray/20'
        }`}>
          <span>Ctrl+K to toggle anywhere</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
