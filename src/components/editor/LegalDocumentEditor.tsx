import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  AlertCircle,
  Undo2,
  Redo2,
  Table as TableIcon,
  Minus,
  Calendar,
  RemoveFormatting,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  Palette,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';
import { compileHouseAgreement, wrapDocument } from '../../utils/HouseAgreementCompiler';
import { DEFAULT_HOUSE_WIZARD_STATE } from '../../types/houseWizardTypes';

// Helper to extract editable body HTML from full HTML documents
function extractEditableHtml(rawHtml?: string): string {
  if (!rawHtml) return '';
  const trimmed = rawHtml.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<!-- WIZARD_GENERATED')) {
    const pageMatch = trimmed.match(/<div class="page">([\s\S]*?)<\/div>\s*(?:<script[\s\S]*?<\/script>|<\/body>|$)/i);
    if (pageMatch && pageMatch[1]) {
      return pageMatch[1].trim();
    }
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
    }
  }
  return trimmed;
}

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
    templates,
    sendAgreementToClient
  } = useApp();

  const [isSendingClient, setIsSendingClient] = useState(false);
  const doc = documents.find(d => d.id === selectedDocumentId) || documents[0];
  const linkedTask = tasks.find(t => t.documentId === doc?.id);
  const isDelivered = linkedTask ? linkedTask.status === 'completed' : false;
  const isApproved = doc?.status === 'approved';
  const template = templates.find(t => t.id === doc?.templateId);
  const isStale = template ? doc?.templateVersionAtGeneration !== template.version : false;

  const resolveDocContent = useCallback((rawContent?: string, variables?: Record<string, any>) => {
    if (!rawContent) return '';
    const trimmed = rawContent.trim();
    if (trimmed === '{{__content__}}' || trimmed === '{{ __content__ }}' || trimmed === '' || trimmed.startsWith('<!-- WIZARD_GENERATED')) {
      const state = { ...DEFAULT_HOUSE_WIZARD_STATE };
      if (variables?.Tenant_Name || variables?.tenantName) {
        state.tenants = [variables.Tenant_Name || variables.tenantName];
      }
      if (variables?.Landlord_Name || variables?.landlordName) {
        state.landlords = [variables.Landlord_Name || variables.landlordName];
      }
      if (variables?.Property_Address || variables?.propertyAddress) {
        state.propertyAddress = variables.Property_Address || variables.propertyAddress;
      }
      if (variables?.Monthly_Rent || variables?.monthlyRent || variables?.rent) {
        state.rent = Number(variables.Monthly_Rent || variables.monthlyRent || variables.rent) || 45000;
      }
      if (variables?.Security_Deposit || variables?.securityDeposit || variables?.securityDepositAmount) {
        state.securityDepositAmount = Number(variables.Security_Deposit || variables.securityDeposit || variables.securityDepositAmount) || 270000;
      }
      return extractEditableHtml(compileHouseAgreement(state));
    }
    return extractEditableHtml(rawContent);
  }, []);

  const [contentHtml, setContentHtml] = useState<string>(() => resolveDocContent(doc?.content, doc?.variables));
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [changeNoteInput, setChangeNoteInput] = useState('Updated legal clauses and terms.');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Active format state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [currentFont, setCurrentFont] = useState('Times New Roman');
  const [currentFontSize, setCurrentFontSize] = useState('12pt');
  const [currentBlock, setCurrentBlock] = useState('P');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Word count stats
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  // Zoom level: 75 | 100 | 125 | 150 | 175 | 200
  const [zoomLevel, setZoomLevel] = useState(100);

  // AI State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Load document content on select / document change
  useEffect(() => {
    if (doc) {
      const resolved = resolveDocContent(doc.content, doc.variables);
      setContentHtml(resolved);
      if (editorRef.current) {
        editorRef.current.innerHTML = resolved;
        updateStats(resolved);
      }
    }
  }, [doc?.id, doc?.content, doc?.variables, resolveDocContent]);

  // Compute word and character count
  const updateStats = (html: string) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const characters = text.length;
    setStats({ words, characters });
  };

  // Selection change listener to update active toolbar states
  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }

    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));
    } catch (_) {}
  };

  // Execute rich text command on the contentEditable surface
  const exec = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
    handleSelection();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setContentHtml(newHtml);
      updateStats(newHtml);
    }
  };

  const handleConfirmSave = () => {
    if (!doc) return;
    const finalHtml = editorRef.current?.innerHTML || contentHtml;
    saveDocumentDraft(doc.id, finalHtml, doc.variables || {}, changeNoteInput);
    setShowSaveModal(false);
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !doc) return;
    addInlineComment(doc.id, selectedText || 'Selected clause', commentInput);
    setCommentInput('');
    setSelectedText('');
    setShowCommentsDrawer(true);
  };

  const handlePrint = () => {
    const currentContent = editorRef.current?.innerHTML || contentHtml || '';
    const fullHtml = wrapDocument(currentContent);

    // Create a dedicated, isolated print iframe to print ONLY the legal agreement
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const docWriter = iframe.contentWindow?.document;
    if (docWriter) {
      docWriter.open();
      docWriter.write(fullHtml);
      docWriter.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Print iframe execution failed:', err);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 300);
    }
  };

  const handleRunAiAnalysis = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      setAiSuggestions([
        'Notice period clause: Recommend adding a 30-day minimum advance written notice specification.',
        'Jurisdiction & Arbitration: Ensure standard dispute escalation mechanism is explicitly defined.',
        'Indemnification provision: Strongly recommend adding mutual liability exclusion for third-party damages.'
      ]);
      setIsAiLoading(false);
    }, 800);
  };

  const handleInsertClause = (clauseHtml: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertHTML', false, clauseHtml);
    handleEditorInput();
    setShowAIDrawer(false);
  };

  const insertTable = (rows = 2, cols = 2) => {
    let html = '<table style="width:100%; border-collapse:collapse; margin:12pt 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #94a3b8; padding:6pt 10pt; min-width:80px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p>&nbsp;</p>';
    exec('insertHTML', html);
  };

  const insertDate = () => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    exec('insertHTML', `<strong>${today}</strong>`);
  };

  // Keyboard shortcut listener (Ctrl+S, Ctrl+B, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSaveModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!doc) {
    return <div className="p-12 text-center text-slate-500 font-light">No document selected.</div>;
  }

  const isBoss = currentUser.role === 'boss';

  const textColors = [
    { label: 'Black', value: '#000000', color: '#000000' },
    { label: 'Navy', value: '#1e3a8a', color: '#1e3a8a' },
    { label: 'Dark Slate', value: '#334155', color: '#334155' },
    { label: 'Crimson', value: '#991b1b', color: '#991b1b' },
    { label: 'Forest Green', value: '#166534', color: '#166534' },
    { label: 'Purple', value: '#581c87', color: '#581c87' },
  ];

  const highlightColors = [
    { label: 'Yellow', value: '#fef08a', color: '#fef08a' },
    { label: 'Peach', value: '#fed7aa', color: '#fed7aa' },
    { label: 'Mint', value: '#bbf7d0', color: '#bbf7d0' },
    { label: 'Sky Blue', value: '#bfdbfe', color: '#bfdbfe' },
    { label: 'Soft Rose', value: '#fecdd3', color: '#fecdd3' },
    { label: 'None', value: 'transparent', color: '#ffffff' },
  ];

  return (
    <div className={`flex flex-col flex-1 h-full overflow-hidden transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Document Action Bar */}
      <div className={`border-b px-6 py-2.5 flex items-center justify-between z-20 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="text-xs font-bold text-ink-black dark:text-white leading-none">{doc.title}</h1>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-mist-gray dark:bg-slate-800 text-slate-500 rounded">
                v{doc.currentVersion}
              </span>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach">
                {doc.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-light">
              Client: <span className="font-normal text-slate-600 dark:text-slate-300">{clients.find(c => c.id === doc.clientId)?.name || 'Unknown'}</span> • Associate: {doc.authorName} • {stats.words} words
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVersionModal(true)}
            className="btn-ghost py-1.5 px-3 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer"
            title="View revision versions and compare diffs"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Versions ({doc.versions.length})</span>
          </button>

          <button
            onClick={() => setShowAIDrawer(!showAIDrawer)}
            className={`btn-ghost py-1.5 px-3 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer ${
              showAIDrawer ? 'bg-blush-peach dark:bg-sienna-brown border-transparent text-sienna-brown dark:text-blush-peach font-semibold' : ''
            }`}
            title="AI Legal Drafting Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className={`btn-ghost py-1.5 px-3 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer ${
              showCommentsDrawer ? 'bg-blush-peach dark:bg-sienna-brown border-transparent text-sienna-brown dark:text-blush-peach font-semibold' : ''
            }`}
            title="View & add clause comments"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Comments ({doc.comments.filter(c => !c.resolved).length})</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Print or Export PDF (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
          </button>

          {!isApproved && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="btn-filled py-1.5 px-4 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Save Version Snapshot (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
          )}

          {isApproved ? (
            isBoss ? (
              <div className="flex items-center space-x-2">
                {!isDelivered ? (
                  <button
                    onClick={() => markDocumentDelivered(doc.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] rounded-full flex items-center space-x-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Deliver</span>
                  </button>
                ) : (
                  <div className="px-4 py-1.5 bg-mist-gray dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold text-[11px] rounded-full border border-slate-200 dark:border-slate-800 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Delivered</span>
                  </div>
                )}
                
                <button
                  onClick={() => renewDocument(doc.id)}
                  className="px-4 py-1.5 bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach border border-sienna-brown/10 rounded-full text-[11px] font-semibold transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew</span>
                </button>
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] rounded-full border border-emerald-500/20 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sealed & Final</span>
              </div>
            )
          ) : !isBoss ? (
            <button
              onClick={() => submitDocumentForReview(doc.id)}
              className="btn-filled py-1.5 px-4 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Review</span>
            </button>
          ) : (
            <>
              {/* Send to Client for Review button */}
              {linkedTask && linkedTask.status !== 'completed' && !isApproved && (
                <button
                  onClick={async () => {
                    if (linkedTask && doc) {
                      setIsSendingClient(true);
                      try {
                        await sendAgreementToClient(linkedTask.id, doc.id);
                      } catch {
                        // Handled in context
                      } finally {
                        setIsSendingClient(false);
                      }
                    }
                  }}
                  disabled={isSendingClient}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingClient ? 'Sending...' : 'Send to Client for Review'}</span>
                </button>
              )}

              {doc.status === 'under_review' && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="btn-filled py-1.5 px-4 rounded-full text-[11px] flex items-center space-x-1.5 cursor-pointer bg-sienna-brown text-blush-peach dark:bg-blush-peach dark:text-sienna-brown border-0 hover:opacity-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sign-off Action</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Microsoft Word-Style Comprehensive Formatting Ribbon */}
      <div className={`border-b px-6 py-1.5 flex items-center space-x-1 z-10 shrink-0 text-xs overflow-x-auto no-print ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
      }`}>
        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button onClick={() => exec('undo')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Undo (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('redo')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Redo (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Font Family Selector */}
        <select
          value={currentFont}
          onChange={(e) => {
            setCurrentFont(e.target.value);
            exec('fontName', e.target.value);
          }}
          className="input-composer text-[11px] py-1 px-2 font-serif"
          title="Font Family"
        >
          <option value="Times New Roman">Times New Roman (Legal Standard)</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Calibri">Calibri</option>
          <option value="Garamond">Garamond</option>
          <option value="Courier New">Courier New</option>
        </select>

        {/* Font Size Selector */}
        <select
          value={currentFontSize}
          onChange={(e) => {
            setCurrentFontSize(e.target.value);
            exec('fontSize', e.target.value === '10pt' ? '2' : e.target.value === '12pt' ? '3' : e.target.value === '14pt' ? '4' : e.target.value === '16pt' ? '5' : '6');
          }}
          className="input-composer text-[11px] py-1 px-2 w-18"
          title="Font Size"
        >
          <option value="10pt">10 pt</option>
          <option value="11pt">11 pt</option>
          <option value="12pt">12 pt</option>
          <option value="13pt">13 pt</option>
          <option value="14pt">14 pt</option>
          <option value="16pt">16 pt</option>
          <option value="18pt">18 pt</option>
          <option value="24pt">24 pt</option>
        </select>

        {/* Paragraph Block Style */}
        <select
          value={currentBlock}
          onChange={(e) => {
            setCurrentBlock(e.target.value);
            exec('formatBlock', e.target.value);
          }}
          className="input-composer text-[11px] py-1 px-2 font-medium"
          title="Paragraph Style"
        >
          <option value="P">Paragraph Text</option>
          <option value="H1">Title Header (H1)</option>
          <option value="H2">Section Header (H2)</option>
          <option value="H3">Subhead (H3)</option>
          <option value="BLOCKQUOTE">Blockquote</option>
          <option value="PRE">Code / Preformatted</option>
        </select>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Basic Inline Text Styles */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => exec('bold')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${isBold ? 'bg-slate-300 dark:bg-slate-700 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exec('italic')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${isItalic ? 'bg-slate-300 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exec('underline')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${isUnderline ? 'bg-slate-300 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exec('strikeThrough')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${isStrike ? 'bg-slate-300 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => exec('subscript')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Subscript"><SubscriptIcon className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('superscript')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Superscript"><SuperscriptIcon className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Text & Highlight Colors */}
        <div className="relative flex items-center space-x-1">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer flex items-center space-x-1"
            title="Text Color"
          >
            <Palette className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
          </button>

          {showColorPicker && (
            <div className="absolute top-8 left-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex items-center space-x-1.5">
              {textColors.map(c => (
                <button
                  key={c.value}
                  onClick={() => {
                    exec('foreColor', c.value);
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer flex items-center space-x-1"
            title="Highlight Color"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-8 left-6 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex items-center space-x-1.5">
              {highlightColors.map(c => (
                <button
                  key={c.value}
                  onClick={() => {
                    exec('hiliteColor', c.value);
                    setShowHighlightPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center text-[8px]"
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  {c.value === 'transparent' && '×'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Alignment */}
        <div className="flex items-center space-x-0.5">
          <button onClick={() => exec('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('justifyRight')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('justifyFull')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Justify (Full)"><AlignJustify className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Lists & Indent */}
        <div className="flex items-center space-x-0.5">
          <button onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('outdent')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Decrease Indent"><OutdentIcon className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('indent')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Increase Indent"><IndentIcon className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Insert Objects */}
        <div className="flex items-center space-x-0.5">
          <button onClick={() => insertTable(2, 2)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Insert 2x2 Table"><TableIcon className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('insertHorizontalRule')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Insert Horizontal Rule"><Minus className="w-3.5 h-3.5" /></button>
          <button onClick={insertDate} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Insert Today's Date"><Calendar className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('removeFormat')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Clear Formatting"><RemoveFormatting className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Comment Action */}
        <button
          onClick={() => {
            if (selectedText) {
              setShowCommentsDrawer(true);
            }
          }}
          className={`px-3 py-1 rounded-full text-[10px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
            selectedText ? 'bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach font-bold' : 'text-slate-400'
          }`}
          title="Add Comment on Selected Text"
        >
          <MessageSquare className="w-3 h-3" />
          <span>Comment Selection</span>
        </button>
      </div>

      {isStale && (
        <div className={`px-6 py-2 border-b flex items-center space-x-2 text-xs font-semibold ${
          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Notice: This document template version is stale. The master template has been updated.</span>
        </div>
      )}

      {/* Main Document Canvas + Side Drawers */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Scrollable canvas + status bar column */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Scrollable canvas area */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-y-auto overflow-x-auto bg-[#c2c2c2] dark:bg-[#0c0d10]"
          >
          {/* Inner centering wrapper — grows to accommodate scaled paper */}
          <div
            style={{
              padding: '32px 24px',
              display: 'flex',
              justifyContent: 'center',
              // Make container tall enough so scrollbar accounts for scaled height
              minHeight: `${Math.round(1056 * (zoomLevel / 100) + 64)}px`,
            }}
          >
            {/* Paper with CSS transform zoom — origin top-center so it anchors correctly */}
            <div
              style={{
                transformOrigin: 'top center',
                transform: `scale(${zoomLevel / 100})`,
                // Width stays A4 page width; scale handles the rest
                width: '820px',
                flexShrink: 0,
                alignSelf: 'flex-start',
              }}
            >
              <div
                ref={editorRef}
                contentEditable={!isApproved}
                suppressContentEditableWarning
                onMouseUp={handleSelection}
                onKeyUp={handleSelection}
                onInput={handleEditorInput}
                className="legal-document-paper focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-shadow"
                style={{
                  cursor: isApproved ? 'default' : 'text',
                  width: '820px',
                  minHeight: '1056px',
                  margin: '0 auto',
                }}
              />
            </div>
          </div>
        </div>

        {/* Professional Bottom Status Bar with Zoom Controls */}
        <div className={`shrink-0 border-t flex items-center justify-between px-5 py-1.5 text-[10px] select-none ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500'
        }`}>
          {/* Left: doc info */}
          <div className="flex items-center space-x-3">
            <span className="font-mono">{stats.words.toLocaleString()} words</span>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono">{stats.characters.toLocaleString()} characters</span>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
            <span className={`font-semibold uppercase tracking-wide ${
              doc.status === 'approved' ? 'text-emerald-600' :
              doc.status === 'under_review' ? 'text-amber-600' :
              doc.status === 'rejected' ? 'text-rose-600' : 'text-slate-400'
            }`}>{doc.status.replace('_', ' ')}</span>
          </div>

          {/* Right: Zoom control group */}
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-400 dark:text-slate-500">Zoom</span>

            {/* Preset step buttons */}
            {[75, 100, 125, 150, 175].map(pct => (
              <button
                key={pct}
                onClick={() => setZoomLevel(pct)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  zoomLevel === pct
                    ? 'bg-ink-black dark:bg-white text-white dark:text-ink-black font-bold'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title={`Zoom to ${pct}%`}
              >
                {pct}%
              </button>
            ))}

            <span className="w-px h-3 bg-slate-300 dark:bg-slate-700" />

            {/* Zoom Out button */}
            <button
              onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
              disabled={zoomLevel <= 50}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Zoom slider */}
            <input
              type="range"
              min={50}
              max={200}
              step={25}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-20 h-1.5 accent-slate-700 dark:accent-slate-300 cursor-pointer"
              title={`Zoom: ${zoomLevel}%`}
            />

            {/* Zoom In button */}
            <button
              onClick={() => setZoomLevel(z => Math.min(200, z + 25))}
              disabled={zoomLevel >= 200}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Numeric display */}
            <span className={`w-9 text-center font-mono font-semibold rounded px-1 py-0.5 ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}>
              {zoomLevel}%
            </span>
          </div>
        </div>

        </div>
        {/* end canvas+status column */}

        {/* AI Assistant Drawer */}
        {showAIDrawer && (
          <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black dark:text-paper-white">AI Legal Assistant</h3>
                </div>
                <button onClick={() => setShowAIDrawer(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAiLoading}
                  className="w-full py-2.5 bg-ink-black hover:opacity-90 dark:bg-paper-white dark:text-ink-black text-paper-white font-semibold text-xs rounded-full shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAiLoading ? 'Analyzing Legal Provisions...' : 'Scan Clauses & Risks'}</span>
                </button>

                {aiSuggestions.map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
                    <p className="leading-relaxed font-light">{s}</p>
                    <button
                      onClick={() => handleInsertClause(`<h2>SEVERABILITY & ARBITRATION</h2><p>If any provision of this Lease is held to be invalid or unenforceable, such provision shall be severed and the remaining provisions shall continue in full force and effect. Any disputes arising hereunder shall be subject to arbitration in accordance with applicable laws.</p>`)}
                      className="text-[10px] font-bold text-sienna-brown dark:text-blush-peach hover:underline block"
                    >
                      + Insert Recommended Protective Clause
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments Drawer */}
        {showCommentsDrawer && (
          <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black dark:text-paper-white">Inline Comments</h3>
                </div>
                <button onClick={() => setShowCommentsDrawer(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Selection: <span className="text-sienna-brown dark:text-blush-peach italic font-medium">"{selectedText || 'Document Note'}"</span>
                </p>
                <textarea
                  rows={2}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Type legal revision comment..."
                  className="w-full input-composer text-xs h-16 resize-none"
                />
                <button
                  onClick={handleAddComment}
                  className="w-full py-2 bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full cursor-pointer"
                >
                  Post Comment
                </button>
              </div>

              <div className="space-y-3">
                {doc.comments.filter(c => !c.parentCommentId).map((cmt) => {
                  const replies = doc.comments.filter(r => r.parentCommentId === cmt.id);
                  return (
                    <div key={cmt.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink-black dark:text-paper-white">{cmt.authorName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(cmt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {cmt.selectedText && cmt.selectedText !== 'Selected clause' && cmt.selectedText !== 'Document Note' && (
                        <p className="text-[10px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 p-2 rounded-xl border border-slate-100 dark:border-slate-800 font-mono">
                          "{cmt.selectedText}"
                        </p>
                      )}
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-light">{cmt.commentText}</p>

                      {replies.length > 0 && (
                        <div className="pl-3 mt-2 space-y-2 border-l-2 border-slate-200 dark:border-slate-800">
                          {replies.map(reply => (
                            <div key={reply.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{reply.authorName}</span>
                                <span className="text-slate-400 font-mono">{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed font-light">{reply.commentText}</p>
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
                              className="w-full input-composer text-xs"
                            />
                            <div className="flex justify-end space-x-1.5">
                              <button
                                onClick={() => setReplyTargetId(null)}
                                className="px-2 py-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-semibold"
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
                                className="px-2.5 py-1 text-[9px] bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black rounded font-semibold"
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
                            className="text-[9px] font-bold text-sienna-brown dark:text-blush-peach hover:underline"
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
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 animate-page-fade">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Save className="w-4 h-4 text-slate-400" />
              <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                Save Version Snapshot
              </h3>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Version Commit Description</label>
              <textarea
                rows={3}
                value={changeNoteInput}
                onChange={(e) => setChangeNoteInput(e.target.value)}
                placeholder="Detail clauses edited in this draft checkpoint..."
                className="w-full input-composer text-xs h-16 resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn-ghost text-xs rounded-full flex-1 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="btn-filled text-xs rounded-full flex-1 cursor-pointer"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Review Action Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 animate-page-fade">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                Partner Review Decision
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-light">
              Reviewing "{doc.title}" draft agreement.
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Feedback Notes / Instructions</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter feedback notes or approval comments..."
                className="w-full input-composer text-xs h-16 resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  rejectDocument(doc.id, reviewNotes);
                  setShowReviewModal(false);
                }}
                className="btn-ghost text-xs rounded-full flex-1 cursor-pointer border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white"
              >
                Request Revisions
              </button>
              <button
                onClick={() => {
                  approveDocument(doc.id, reviewNotes);
                  setShowReviewModal(false);
                }}
                className="btn-filled text-xs rounded-full flex-1 cursor-pointer bg-emerald-600 text-white border-0 hover:bg-emerald-500"
              >
                Seal & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionModal && (
        <VersionHistoryModal
          document={doc}
          onClose={() => setShowVersionModal(false)}
          onRestore={(vNum) => {
            restoreDocumentVersion(doc.id, vNum);
            setShowVersionModal(false);
          }}
        />
      )}
    </div>
  );
};
