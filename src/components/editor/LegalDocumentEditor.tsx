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
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus
} from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';
import { FloatingAiToolbar } from './FloatingAiToolbar';
import { RewritePreviewModal } from './RewritePreviewModal';
import { InsertClauseModal } from './InsertClauseModal';
import { compileHouseAgreement, wrapDocument } from '../../utils/HouseAgreementCompiler';
import { DEFAULT_HOUSE_WIZARD_STATE } from '../../types/houseWizardTypes';
import { aiService, DocumentReviewResult, AIFinding, FindingCategory, FindingLocation, RewriteAction, RewriteResult } from '../../services/ai';

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

  // ── AI State (Module D: Review Engine + Module E: Rewrite Assistant) ─────────
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState<DocumentReviewResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCategoryFilter, setAiCategoryFilter] = useState<FindingCategory | 'ALL'>('ALL');
  // Rewrite state
  const [floatingToolbarVisible, setFloatingToolbarVisible] = useState(false);
  const [floatingSelectionRect, setFloatingSelectionRect] = useState<DOMRect | null>(null);
  const [floatingSelectedText, setFloatingSelectedText] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [isRewriteLoading, setIsRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  // Clause insertion state
  const [insertClauseData, setInsertClauseData] = useState<{ clauseHtml: string; findingTitle: string; findingDescription: string; locationMeta?: FindingLocation } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // ── Custom Undo / Redo History Stack (past[], present, future[]) ──────────────
  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryOperation = useRef(false);
  const lastHtmlRef = useRef<string>('');
  const typingTimerRef = useRef<any>(null);

  const syncUndoRedoButtons = () => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  };

  // Push snapshot to past stack, clearing future stack on user edits
  const pushSnapshot = useCallback((newHtml: string, isTyping = false) => {
    if (isHistoryOperation.current) {
      isHistoryOperation.current = false;
      return;
    }
    if (!newHtml) return;

    const currentPresent = lastHtmlRef.current;
    if (newHtml === currentPresent) return;

    if (isTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (currentPresent && currentPresent !== newHtml) {
          pastRef.current.push(currentPresent);
          if (pastRef.current.length > 100) pastRef.current.shift();
          futureRef.current = [];
          lastHtmlRef.current = newHtml;
          syncUndoRedoButtons();
        }
      }, 700);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (currentPresent) {
        pastRef.current.push(currentPresent);
        if (pastRef.current.length > 100) pastRef.current.shift();
      }
      futureRef.current = [];
      lastHtmlRef.current = newHtml;
      syncUndoRedoButtons();
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const currentPresent = editorRef.current?.innerHTML || contentHtml;
    const previousState = pastRef.current.pop()!;
    futureRef.current.push(currentPresent);

    isHistoryOperation.current = true;
    lastHtmlRef.current = previousState;
    setContentHtml(previousState);
    if (editorRef.current) {
      editorRef.current.innerHTML = previousState;
    }
    updateStats(previousState);
    syncUndoRedoButtons();
  }, [contentHtml]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const currentPresent = editorRef.current?.innerHTML || contentHtml;
    const nextState = futureRef.current.pop()!;
    pastRef.current.push(currentPresent);

    isHistoryOperation.current = true;
    lastHtmlRef.current = nextState;
    setContentHtml(nextState);
    if (editorRef.current) {
      editorRef.current.innerHTML = nextState;
    }
    updateStats(nextState);
    syncUndoRedoButtons();
  }, [contentHtml]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    const node = editorRef.current;
    if (node) {
      node.addEventListener('keydown', handleKeyDown);
      return () => node.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleUndo, handleRedo]);

  // Load document content on select / document change
  useEffect(() => {
    if (doc) {
      const resolved = resolveDocContent(doc.content, doc.variables);
      setContentHtml(resolved);
      lastHtmlRef.current = resolved;
      pastRef.current = [];
      futureRef.current = [];
      syncUndoRedoButtons();
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

    if (command === 'undo') {
      handleUndo();
      return;
    }
    if (command === 'redo') {
      handleRedo();
      return;
    }

    // Record state snapshot before applying formatting action
    pushSnapshot(editorRef.current.innerHTML, false);
    document.execCommand(command, false, value);
    handleEditorInput(false);
    handleSelection();
  };

  const handleEditorInput = (isTyping = true) => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setContentHtml(newHtml);
      updateStats(newHtml);
      pushSnapshot(newHtml, isTyping);
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
        } catch (e) {
          console.error('Print iframe error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }
      }, 300);
    }
  };

  // ── Module D: Real AI Review ─────────────────────────────────────────────────
  const handleRunAiAnalysis = async () => {
    if (!doc) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiReview(null);

    try {
      const versionId = doc.versions?.[0]?.id || 'latest';
      const result = await aiService.reviewDocument(doc.id, versionId);
      setAiReview(result);
      setAiCategoryFilter('ALL');
    } catch (err: any) {
      setAiError(err.message || 'AI analysis failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Module D: Insert Clause ─────────────────────────────────────────────────
  const sanitizeClauseHtml = (rawHtml: string) => {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  };

  // ── Module D: Apply Grammar Correction ─────────────────────────────────────
  const handleApplyGrammarCorrection = (finding: AIFinding) => {
    if (!editorRef.current || !finding.incorrectText || !finding.correctedText) return;
    const editor = editorRef.current;
    const currentHtml = editor.innerHTML;

    if (!currentHtml.includes(finding.incorrectText)) {
      alert(`Could not locate exact text "${finding.incorrectText}" in editor content.`);
      return;
    }

    pushSnapshot(currentHtml, false);
    const updatedHtml = currentHtml.replace(finding.incorrectText, finding.correctedText);
    editor.innerHTML = updatedHtml;
    handleEditorInput(false);

    if (doc) {
      saveDocumentDraft(doc.id, updatedHtml, doc.variables || {}, `Grammar correction applied: ${finding.incorrectText} -> ${finding.correctedText}`);
    }
  };

  const handleInsertClause = (clauseHtml: string, locationMeta?: FindingLocation, findingTitle?: string) => {
    if (!editorRef.current) return;
    const cleanHtml = sanitizeClauseHtml(clauseHtml);
    editorRef.current.focus();

    pushSnapshot(editorRef.current.innerHTML, false);

    const titleLower = (findingTitle || '').toLowerCase();
    const anchorKeyword = locationMeta?.insertionAnchor || locationMeta?.section || '';
    const anchorLower = anchorKeyword.toLowerCase();

    const editor = editorRef.current;
    let targetNode: HTMLElement | null = null;

    // Search all block elements (<p>, <div>, <li>, <h2>, <h3>, blockquote) inside editor
    const blockElements = Array.from(editor.querySelectorAll('p, div, li, h2, h3, blockquote')) as HTMLElement[];

    if (anchorLower) {
      for (const el of blockElements) {
        if (el.innerText.toLowerCase().includes(anchorLower)) {
          targetNode = el;
          break;
        }
      }
    }

    // Target Node Fallbacks based on title keywords
    if (!targetNode && (titleLower.includes('execution') || titleLower.includes('signature') || titleLower.includes('witness'))) {
      for (const el of blockElements) {
        if (el.innerText.toLowerCase().includes('in witness whereof') || el.innerText.toLowerCase().includes('signed by')) {
          targetNode = el;
          break;
        }
      }
      if (!targetNode && blockElements.length > 0) {
        targetNode = blockElements[blockElements.length - 1]; // End of document for execution block
      }
    } else if (!targetNode && (titleLower.includes('notice') || titleLower.includes('address'))) {
      for (const el of blockElements) {
        if (el.innerText.toLowerCase().includes('address for notice') || el.innerText.toLowerCase().includes('29.')) {
          targetNode = el;
          break;
        }
      }
    } else if (!targetNode && titleLower.includes('termination')) {
      for (const el of blockElements) {
        if (el.innerText.toLowerCase().includes('termination') || el.innerText.toLowerCase().includes('7.')) {
          targetNode = el;
          break;
        }
      }
    } else if (!targetNode && (titleLower.includes('dispute') || titleLower.includes('governing law') || titleLower.includes('jurisdiction'))) {
      for (const el of blockElements) {
        if (el.innerText.toLowerCase().includes('governing law') || el.innerText.toLowerCase().includes('28.')) {
          targetNode = el;
          break;
        }
      }
    }

    // Perform targeted insertion relative to targetNode
    if (targetNode && targetNode.parentNode) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cleanHtml.startsWith('<') ? cleanHtml : `<p class="legal-paragraph">${cleanHtml}</p>`;
      
      const newChild = wrapper.firstElementChild || wrapper;
      if (targetNode.getAttribute('style')) {
        newChild.setAttribute('style', targetNode.getAttribute('style') || '');
      }

      // Insert immediately after targetNode
      targetNode.parentNode.insertBefore(wrapper.firstElementChild || wrapper, targetNode.nextSibling);

      // Scroll target element into view smoothly
      (wrapper.firstElementChild || targetNode).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // If target node could not be matched with high confidence, ask user confirmation
      const confirmInsertAtEnd = window.confirm(
        `Suggested insertion location for "${findingTitle || 'clause'}" could not be determined confidently.\n\nWould you like to insert it at the end of the document?`
      );
      if (confirmInsertAtEnd) {
        const wrapper = document.createElement('p');
        wrapper.className = 'legal-paragraph';
        wrapper.innerHTML = cleanHtml;
        editor.appendChild(wrapper);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setInsertClauseData(null);
        return;
      }
    }

    handleEditorInput(false);
    if (doc) {
      saveDocumentDraft(doc.id, editorRef.current.innerHTML || contentHtml, doc.variables || {}, `AI recommended clause inserted: ${findingTitle || 'clause'}`);
    }
    setInsertClauseData(null);
  };

  // ── Module E: Floating Toolbar & Rewrite ──────────────────────────────────────
  // Listen for selection changes inside the editor canvas
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setFloatingToolbarVisible(false);
        return;
      }

      // Only show if selection is inside the editor
      if (!editorRef.current) return;
      const range = sel.getRangeAt(0);
      const editorNode = editorRef.current;
      if (!editorNode.contains(range.commonAncestorContainer)) return;

      const text = sel.toString().trim();
      if (text.length < 2) return;

      const rect = range.getBoundingClientRect();
      setFloatingSelectedText(text);
      setFloatingSelectionRect(rect);
      setFloatingToolbarVisible(true);

      // Save range so we can restore it before executing rewrite replacement
      setSavedRange(range.cloneRange());
    };

    const handleScrollOrResize = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          setFloatingSelectionRect(range.getBoundingClientRect());
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleRewriteAction = async (action: RewriteAction) => {
    if (!doc || !floatingSelectedText) return;
    setFloatingToolbarVisible(false);
    setIsRewriteLoading(true);

    try {
      const versionId = doc.versions?.[0]?.id || 'latest';

      // Grab ±200 chars of context around the selection from the editor
      const fullText = editorRef.current?.innerText || '';
      const idx = fullText.indexOf(floatingSelectedText);
      const context = idx >= 0
        ? fullText.slice(Math.max(0, idx - 200), idx + floatingSelectedText.length + 200)
        : undefined;

      const result = await aiService.rewriteText(doc.id, versionId, floatingSelectedText, action, context);
      setRewriteResult(result);
    } catch (err: any) {
      alert('AI rewrite failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRewriteLoading(false);
    }
  };

  const applyRewrite = (text: string, mode: 'replace' | 'insertBelow') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Push snapshot to history stack before applying AI rewrite
    pushSnapshot(editorRef.current.innerHTML, false);

    // Clean and normalize text to single line spaces (preventing multi-div paragraph destruction)
    const cleanText = text
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/ +/g, ' ');

    if (savedRange && mode === 'replace') {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }

      // Perform direct format-preserving DOM node replacement inside savedRange
      if (editorRef.current.contains(savedRange.commonAncestorContainer) || editorRef.current === savedRange.commonAncestorContainer) {
        const textNode = document.createTextNode(cleanText);
        savedRange.deleteContents();
        savedRange.insertNode(textNode);

        // Position cursor after inserted text node
        savedRange.setStartAfter(textNode);
        savedRange.setEndAfter(textNode);

        const parent = textNode.parentNode;
        if (parent) {
          parent.normalize();
        }
      } else {
        // Fallback: search and replace exact selected text in innerHTML
        const currentHtml = editorRef.current.innerHTML;
        if (floatingSelectedText && currentHtml.includes(floatingSelectedText)) {
          editorRef.current.innerHTML = currentHtml.replace(floatingSelectedText, cleanText);
        }
      }
    } else if (savedRange && mode === 'insertBelow') {
      // Find nearest block parent (P, DIV, LI, H1, H2, H3, BLOCKQUOTE) to inherit exact formatting
      let blockParent: HTMLElement | null = null;
      let curr: Node | null = savedRange.endContainer;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeType === Node.ELEMENT_NODE && ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes((curr as HTMLElement).tagName)) {
          blockParent = curr as HTMLElement;
          break;
        }
        curr = curr.parentNode;
      }

      const newPara = document.createElement('p');
      if (blockParent && blockParent.getAttribute('style')) {
        newPara.setAttribute('style', blockParent.getAttribute('style') || '');
      }
      if (blockParent && blockParent.className) {
        newPara.className = blockParent.className;
      }
      newPara.textContent = cleanText;

      if (blockParent && blockParent.parentNode) {
        blockParent.parentNode.insertBefore(newPara, blockParent.nextSibling);
      } else {
        savedRange.collapse(false);
        savedRange.insertNode(newPara);
      }
    }

    handleEditorInput(false);
    setRewriteResult(null);
    setSavedRange(null);
    setFloatingSelectedText('');

    // Save version and log acceptance
    if (doc) {
      saveDocumentDraft(doc.id, editorRef.current.innerHTML || contentHtml, doc.variables || {}, `AI rewrite applied: ${rewriteResult?.action}`);
      aiService.logRewriteAccepted(doc.id, rewriteResult!.action, doc.title).catch(() => {});
    }
  };

  // ── Module D: Locate / Highlight Finding in Editor ──────────────────────────
  const handleHighlightFinding = (finding: AIFinding) => {
    if (!editorRef.current) return;
    const targetText = finding.textExcerpt || finding.location || finding.title;
    if (!targetText) return;

    const editor = editorRef.current;
    const textNodes: Node[] = [];
    const walk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let n: Node | null;
    while ((n = walk.nextNode())) {
      textNodes.push(n);
    }

    const searchStr = targetText.trim().toLowerCase();
    const matchSnippet = searchStr.length > 20 ? searchStr.slice(0, 20) : searchStr;

    for (const node of textNodes) {
      const nodeText = (node.textContent || '').toLowerCase();
      const idx = nodeText.indexOf(matchSnippet);
      if (idx !== -1 && node.parentElement) {
        node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const range = document.createRange();
        const sel = window.getSelection();
        try {
          range.setStart(node, idx);
          range.setEnd(node, Math.min(nodeText.length, idx + matchSnippet.length));
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (_) {}

        const parentEl = node.parentElement;
        const originalBg = parentEl.style.backgroundColor;
        parentEl.style.transition = 'background-color 0.3s ease';
        parentEl.style.backgroundColor = 'rgba(251, 191, 36, 0.4)';
        setTimeout(() => {
          parentEl.style.backgroundColor = originalBg;
        }, 2000);
        return;
      }
    }
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
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
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
            className="flex-1 overflow-y-auto overflow-x-auto bg-[#c2c2c2] dark:bg-[#0c0d10] relative"
          >
            {/* ── Module E: Floating AI Rewrite Toolbar ───────────────────────────── */}
            <FloatingAiToolbar
              visible={floatingToolbarVisible || isRewriteLoading}
              selectedText={floatingSelectedText}
              selectionRect={floatingSelectionRect}
              editorContainer={canvasRef.current}
              isLoading={isRewriteLoading}
              onAction={handleRewriteAction}
              onClose={() => { setFloatingToolbarVisible(false); setSavedRange(null); }}
              isDark={isDark}
            />
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
                onInput={() => handleEditorInput(true)}
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
          <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-black dark:text-paper-white">AI Review Engine</h3>
                    <p className="text-[9px] text-slate-400 font-mono">Module D — Risk Analysis</p>
                  </div>
                </div>
                <button onClick={() => setShowAIDrawer(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleRunAiAnalysis}
                disabled={isAiLoading}
                className="btn-filled w-full py-2.5 text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-blush-peach dark:text-sienna-brown animate-pulse" />
                <span>{isAiLoading ? 'Analyzing Legal Provisions…' : 'Scan Clauses & Risks'}</span>
              </button>
            </div>

            {/* Error State */}
            {aiError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-red-700 dark:text-red-300">{aiError}</p>
              </div>
            )}

            {/* Risk Score Dashboard */}
            {aiReview && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Risk Score Gauge */}
                <div className={`p-4 rounded-2xl border ${
                  aiReview.riskScore.level === 'LOW' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                  aiReview.riskScore.level === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' :
                  aiReview.riskScore.level === 'HIGH' ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' :
                  'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk Score</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      aiReview.riskScore.level === 'LOW' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      aiReview.riskScore.level === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                      aiReview.riskScore.level === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                      'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}>{aiReview.riskScore.level} RISK</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-black ${
                      aiReview.riskScore.level === 'LOW' ? 'text-green-600 dark:text-green-400' :
                      aiReview.riskScore.level === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' :
                      aiReview.riskScore.level === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{aiReview.riskScore.score}</span>
                    <span className="text-xs text-slate-400 mb-1">/100</span>
                  </div>
                  {/* Score bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${
                        aiReview.riskScore.level === 'LOW' ? 'bg-green-500' :
                        aiReview.riskScore.level === 'MEDIUM' ? 'bg-amber-500' :
                        aiReview.riskScore.level === 'HIGH' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${aiReview.riskScore.score}%` }}
                    />
                  </div>
                  {/* Breakdown pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {aiReview.riskScore.breakdown.critical > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded font-bold">{aiReview.riskScore.breakdown.critical} Critical</span>
                    )}
                    {aiReview.riskScore.breakdown.high > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded font-bold">{aiReview.riskScore.breakdown.high} High</span>
                    )}
                    {aiReview.riskScore.breakdown.medium > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded font-bold">{aiReview.riskScore.breakdown.medium} Medium</span>
                    )}
                    {aiReview.riskScore.breakdown.low > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-bold">{aiReview.riskScore.breakdown.low} Low</span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{aiReview.summary}</p>

                {/* Provider label */}
                <p className="text-[9px] text-slate-400 italic">{aiReview.providerLabel}</p>

                {/* Category Filter Tabs */}
                {aiReview.findings.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(['ALL', 'HIGH_RISK', 'MISSING_CLAUSE', 'COMPLIANCE', 'GRAMMAR', 'STRUCTURAL'] as const).map(cat => {
                      const count = cat === 'ALL'
                        ? aiReview.findings.length
                        : aiReview.findings.filter(f => f.category === cat).length;
                      if (count === 0 && cat !== 'ALL') return null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setAiCategoryFilter(cat === 'ALL' ? 'ALL' : cat as FindingCategory)}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                            aiCategoryFilter === cat
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {cat === 'ALL' ? 'All' : cat.replace(/_/g, ' ')} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Findings */}
                <div className="space-y-3">
                  {(aiCategoryFilter === 'ALL'
                    ? aiReview.findings
                    : aiReview.findings.filter(f => f.category === aiCategoryFilter)
                  ).map((finding) => (
                    <div
                      key={finding.id}
                      onClick={() => handleHighlightFinding(finding)}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500/50 ${
                        finding.severity === 'CRITICAL' ? 'bg-red-50/50 dark:bg-red-950/40 border-red-200 dark:border-red-800' :
                        finding.severity === 'HIGH' ? 'bg-orange-50/50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' :
                        finding.severity === 'MEDIUM' ? 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' :
                        'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                      title="Click to locate and highlight this section in the document"
                    >
                      {/* Header badges & title */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            finding.severity === 'CRITICAL' ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200' :
                            finding.severity === 'HIGH' ? 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                            finding.severity === 'MEDIUM' ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                            finding.severity === 'LOW' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200' :
                            'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>{finding.severity}</span>

                          {finding.requirementType && (
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                              finding.requirementType === 'REQUIRED' ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' :
                              finding.requirementType === 'POTENTIAL_RISK' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            }`}>
                              {finding.requirementType === 'REQUIRED' ? 'Required' : finding.requirementType === 'POTENTIAL_RISK' ? 'Potential Risk' : 'Recommendation (0 Score Impact)'}
                            </span>
                          )}

                          {finding.source && (
                            <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {finding.source}
                            </span>
                          )}

                          {finding.confidence && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              {Math.round(finding.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">{finding.title}</h4>
                      </div>

                      {/* Location */}
                      {finding.locationMeta?.section && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          📍 <span className="font-semibold text-slate-700 dark:text-slate-300">{finding.locationMeta.section}</span> {finding.locationMeta.clauseNumber ? `(${finding.locationMeta.clauseNumber})` : ''}
                        </p>
                      )}

                      {/* Evidence */}
                      {(finding.textExcerpt || finding.evidence) && (
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Evidence Excerpt:</span>
                          <p className="text-[10px] font-mono italic text-slate-600 dark:text-slate-400 leading-snug">
                            "{finding.textExcerpt || finding.evidence}"
                          </p>
                        </div>
                      )}

                      {/* Description / What is wrong */}
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">{finding.description}</p>

                      {/* Legal Reason / Why it matters */}
                      {finding.reason && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                          ⚖️ <span className="font-semibold">Why:</span> {finding.reason}
                        </p>
                      )}

                      {/* Actionable Grammar Section */}
                      {finding.findingType === 'GRAMMAR' && (finding.incorrectText || finding.correctedText) && (
                        <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            ✨ Grammar Correction Detail
                          </div>
                          {finding.incorrectText && (
                            <p className="text-[10px] text-red-600 dark:text-red-400">
                              <span className="font-bold">Original:</span> <span className="line-through">{finding.incorrectText}</span>
                            </p>
                          )}
                          {finding.problem && (
                            <p className="text-[9px] text-slate-600 dark:text-slate-400">
                              <span className="font-semibold">Problem:</span> {finding.problem}
                            </p>
                          )}
                          {finding.correctedText && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="font-bold">Suggested:</span> {finding.correctedText}
                            </p>
                          )}
                          {finding.explanation && (
                            <p className="text-[9px] text-slate-500 italic">
                              <span className="font-semibold">Explanation:</span> {finding.explanation}
                            </p>
                          )}
                          {finding.incorrectText && finding.correctedText && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyGrammarCorrection(finding);
                              }}
                              className="w-full mt-1 py-1 px-2.5 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              ✓ Apply Correction
                            </button>
                          )}
                        </div>
                      )}

                      {/* Recommended Clause Insertion */}
                      {finding.suggestedClause && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInsertClauseData({
                              clauseHtml: finding.suggestedClause!,
                              findingTitle: finding.title,
                              findingDescription: finding.description,
                              locationMeta: finding.locationMeta,
                            });
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Insert Recommended Clause
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legal disclaimer */}
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    AI-generated analysis is assistive only and should be reviewed by a qualified legal professional before use in binding agreements.
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!aiReview && !aiError && !isAiLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-indigo-500" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ready to Analyze</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Click "Scan Clauses & Risks" to run an AI legal review of this document and generate a Risk Score.</p>
                <p className="text-[9px] text-indigo-500 dark:text-indigo-400 mt-3 font-medium">✦ Highlight text in the editor for AI rewrite options</p>
              </div>
            )}
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

      {/* ── Module E: Rewrite Preview Modal ──────────────────────────────────── */}
      {rewriteResult && (
        <RewritePreviewModal
          result={rewriteResult}
          onReplace={() => applyRewrite(rewriteResult.rewrittenText, 'replace')}
          onInsertBelow={() => applyRewrite(rewriteResult.rewrittenText, 'insertBelow')}
          onCancel={() => { setRewriteResult(null); setSavedRange(null); }}
          isDark={isDark}
        />
      )}

      {/* ── Module D: Insert Clause Confirmation Modal ────────────────────────── */}
      {insertClauseData && (
        <InsertClauseModal
          clauseHtml={insertClauseData.clauseHtml}
          findingTitle={insertClauseData.findingTitle}
          findingDescription={insertClauseData.findingDescription}
          onConfirm={() => handleInsertClause(insertClauseData.clauseHtml, insertClauseData.locationMeta, insertClauseData.findingTitle)}
          onCancel={() => setInsertClauseData(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
};
