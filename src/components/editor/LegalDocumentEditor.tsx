import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Save,
  Send,
  History,
  Printer,
  Sparkles,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Highlighter,
  X,
  ShieldCheck,
  Edit3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';

export const LegalDocumentEditor: React.FC = () => {
  const {
    currentUser,
    documents,
    selectedDocumentId,
    saveDocumentDraft,
    restoreDocumentVersion,
    submitDocumentForReview,
    approveDocument,
    rejectDocument,
    addInlineComment,
    theme,
    clients,
    tasks,
    markDocumentDelivered,
    renewDocument,
    templates
  } = useApp();

  const doc = documents.find(d => d.id === selectedDocumentId) || documents[0];
  const linkedTask = tasks.find(t => t.documentId === doc?.id);
  const isDelivered = linkedTask ? linkedTask.status === 'completed' : false;
  const isApproved = doc?.status === 'approved';
  const template = templates.find(t => t.id === doc?.templateId);
  const isStale = template ? doc?.templateVersionAtGeneration !== template.version : false;

  const [contentHtml, setContentHtml] = useState(doc?.content || '');
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [changeNoteInput, setChangeNoteInput] = useState('Updated legal clauses and variable inputs.');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  const [selectedTone, setSelectedTone] = useState<'strict' | 'balanced' | 'plain'>('strict');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (doc) {
      setContentHtml(doc.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = doc.content;
      }
    }
  }, [doc?.id, doc?.content]);

  if (!doc) {
    return <div className="p-12 text-center text-slate-500">No document selected.</div>;
  }

  const isBoss = currentUser.role === 'boss';

  const format = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleConfirmSave = () => {
    saveDocumentDraft(doc.id, contentHtml, doc.variables, changeNoteInput);
    setShowSaveModal(false);
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    addInlineComment(doc.id, selectedText || 'Selected clause', commentInput);
    setCommentInput('');
    setSelectedText('');
    setShowCommentsDrawer(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRunAiAnalysis = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      setAiSuggestions([
        'Risk Flag: Notice period clause (Section 3) lacks indemnification protection for breach.',
        'Ambiguity Flag: Severability clause missing. Recommended to insert standard severability text.',
        'Tone Suggestion: Clause 2 (Security Deposit) can be converted to Strict Protective tone.'
      ]);
      setIsAiLoading(false);
    }, 800);
  };

  const handleInsertClause = (clauseHtml: string) => {
    setContentHtml(prev => prev + clauseHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = editorRef.current.innerHTML + clauseHtml;
    }
    setShowAIDrawer(false);
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] overflow-hidden select-none transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Document Action Bar */}
      <div className={`border-b px-6 py-3 flex items-center justify-between z-20 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-900/10 border border-blue-800/20 text-blue-900 dark:text-blue-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.title}</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 rounded">
                v{doc.currentVersion}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${
                doc.status === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : doc.status === 'under_review'
                  ? 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {doc.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Client: <strong className="text-slate-700 dark:text-slate-300">{clients.find(c => c.id === doc.clientId)?.name || 'Unknown Client'}</strong> • Author: {doc.authorName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVersionModal(true)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
            <span>Version History ({doc.versions.length})</span>
          </button>

          <button
            onClick={() => setShowAIDrawer(!showAIDrawer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              showAIDrawer
                ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                : isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Legal Assistant</span>
          </button>

          <button
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center space-x-1.5 ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Comments ({doc.comments.filter(c => !c.resolved).length})</span>
          </button>

          <button
            onClick={handlePrint}
            className={`p-2 border rounded-xl text-xs ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Print or Export PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          {!isApproved && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save Draft Version</span>
            </button>
          )}

          {isApproved ? (
            isBoss ? (
              <div className="flex items-center space-x-2">
                {!isDelivered ? (
                  <button
                    onClick={() => markDocumentDelivered(doc.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 animate-bounce"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Mark as Delivered</span>
                  </button>
                ) : (
                  <div className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sealed & Delivered</span>
                  </div>
                )}
                
                <button
                  onClick={() => renewDocument(doc.id)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew Agreement</span>
                </button>
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sealed & Approved</span>
              </div>
            )
          ) : !isBoss ? (
            <button
              onClick={() => submitDocumentForReview(doc.id)}
              className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Partner Review</span>
            </button>
          ) : (
            doc.status === 'under_review' && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 flex items-center space-x-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Partner Review Action</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Editor Formatting Toolbar */}
      <div className={`border-b px-6 py-2 flex items-center space-x-2 z-10 shrink-0 text-xs overflow-x-auto no-print ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
      }`}>
        <select
          onChange={(e) => format('formatBlock', e.target.value)}
          className={`text-xs p-1.5 rounded-lg border focus:outline-none ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <option value="P">Paragraph Text</option>
          <option value="H1">Title Header (H1)</option>
          <option value="H2">Section Header (H2)</option>
          <option value="H3">Subhead (H3)</option>
        </select>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        <button onClick={() => format('bold')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('italic')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('underline')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('strikeThrough')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        <button onClick={() => format('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><AlignLeft className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><AlignCenter className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('justifyRight')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><AlignRight className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('justifyFull')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><AlignJustify className="w-3.5 h-3.5" /></button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        <button onClick={() => format('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><List className="w-3.5 h-3.5" /></button>
        <button onClick={() => format('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"><ListOrdered className="w-3.5 h-3.5" /></button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        <button
          onClick={() => {
            if (selectedText) {
              setShowCommentsDrawer(true);
            }
          }}
          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
            selectedText ? 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30' : 'text-slate-400'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Comment Selection</span>
        </button>
      </div>

      {isStale && (
        <div className={`px-6 py-3 border-b flex items-center space-x-2.5 text-xs font-semibold ${
          isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 animate-pulse" />
          <span>Warning: This document was generated using template v{doc.templateVersionAtGeneration}, but the master template is now at v{template?.version}. Variables or clauses may be out of date.</span>
        </div>
      )}

      {/* Main Editor Paper Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-8 overflow-y-auto flex justify-center bg-slate-100 dark:bg-slate-950">
          <div
            ref={editorRef}
            contentEditable={!isApproved}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: doc.content }}
            className="legal-document-paper w-full max-w-4xl min-h-[85vh] p-12 rounded-xl focus:outline-none leading-relaxed text-sm shadow-xl"
          />
        </div>

        {/* AI Assistant Drawer */}
        {showAIDrawer && (
          <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Legal Copilot</h3>
                </div>
                <button onClick={() => setShowAIDrawer(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAiLoading}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  {isAiLoading ? 'Scanning Document...' : 'Scan Legal Risks & Gaps'}
                </button>

                {aiSuggestions.map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <p className="leading-snug">{s}</p>
                    <button
                      onClick={() => handleInsertClause(`<h2>SEVERABILITY</h2><p>If any provision of this Agreement is held to be unenforceable, the remaining provisions shall continue in full force.</p>`)}
                      className="text-[10px] font-bold text-blue-800 dark:text-blue-400 hover:underline"
                    >
                      + Insert Recommended Severability Clause
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments Drawer */}
        {showCommentsDrawer && (
          <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Inline Review Comments</h3>
                </div>
                <button onClick={() => setShowCommentsDrawer(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Selected Text: <span className="text-blue-800 dark:text-blue-400 italic">"{selectedText || 'General Note'}"</span>
                </p>
                <textarea
                  rows={2}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Type comment or change request..."
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleAddComment}
                  className="w-full py-1.5 bg-blue-900 text-white font-bold text-xs rounded-lg"
                >
                  Post Comment
                </button>
              </div>

              <div className="space-y-3">
                {doc.comments.filter(c => !c.parentCommentId).map((cmt) => {
                  const replies = doc.comments.filter(r => r.parentCommentId === cmt.id);
                  return (
                    <div key={cmt.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cmt.authorName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(cmt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {cmt.selectedText && cmt.selectedText !== 'Selected clause' && cmt.selectedText !== 'General Note' && (
                        <p className="text-[11px] bg-blue-50 dark:bg-slate-900 text-blue-900 dark:text-blue-300 p-1.5 rounded border border-blue-200 dark:border-slate-800 font-mono">
                          "{cmt.selectedText}"
                        </p>
                      )}
                      <p className="text-slate-700 dark:text-slate-300">{cmt.commentText}</p>

                      {replies.length > 0 && (
                        <div className="pl-3 mt-2 space-y-2 border-l border-indigo-500/20 dark:border-slate-800">
                          {replies.map(reply => (
                            <div key={reply.id} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{reply.authorName}</span>
                                <span className="text-slate-400">{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px]">{reply.commentText}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        {replyTargetId === cmt.id ? (
                          <div className="w-full space-y-2">
                            <input
                              type="text"
                              value={replyInput}
                              onChange={(e) => setReplyInput(e.target.value)}
                              placeholder="Type reply..."
                              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                            />
                            <div className="flex justify-end space-x-1.5">
                              <button
                                onClick={() => setReplyTargetId(null)}
                                className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!replyInput.trim()) return;
                                  addInlineComment(doc.id, '', replyInput, cmt.id);
                                  setReplyInput('');
                                  setReplyTargetId(null);
                                }}
                                className="px-2 py-1 text-[10px] bg-indigo-650 hover:bg-indigo-750 text-white rounded font-semibold"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyTargetId(cmt.id);
                              setReplyInput('');
                            }}
                            className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Draft Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
                <Save className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Save Version Snapshot (v{doc.currentVersion + 1})
              </h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Version Change Description</label>
              <textarea
                rows={3}
                value={changeNoteInput}
                onChange={(e) => setChangeNoteInput(e.target.value)}
                placeholder="Detail changes made in this draft checkpoint..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none mt-1 font-medium"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
              >
                Save Version v{doc.currentVersion + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Approval Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <span>Partner Review Sign-Off</span>
            </h3>

            <p className="text-xs text-slate-500">
              Reviewing "{doc.title}" submitted by associate <strong className="text-slate-800 dark:text-slate-200">{doc.authorName}</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Partner Notes / Instructions</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter feedback notes or sign-off instructions..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  rejectDocument(doc.id, reviewNotes);
                  setShowReviewModal(false);
                }}
                className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-xs rounded-xl border border-rose-500/30"
              >
                Request Revisions
              </button>
              <button
                onClick={() => {
                  approveDocument(doc.id, reviewNotes);
                  setShowReviewModal(false);
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20"
              >
                Approve & Seal Document
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionModal && (
        <VersionHistoryModal
          document={doc}
          onClose={() => setShowVersionModal(false)}
          onRestore={(vNum) => restoreDocumentVersion(doc.id, vNum)}
        />
      )}
    </div>
  );
};
