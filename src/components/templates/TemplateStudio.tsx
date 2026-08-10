import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wand2,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { LegalTemplate, TemplateVariable, VariableType } from '../../types';

export const TemplateStudio: React.FC = () => {
  const {
    currentUser,
    templates,
    createTemplate,
    deleteTemplate,
    requestTemplateCustomization,
    approveTemplateCustomization,
    rejectTemplateCustomization,
    simulateAIVariableExtraction,
    setActiveTab,
    setSelectedTemplateId,
    theme,
    showToast
  } = useApp();

  const isBoss = currentUser.role === 'boss';
  const isDark = theme === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<'library' | 'ai_extract' | 'pending_approvals'>(
    isBoss ? 'library' : 'library'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState('');

  // AI Extraction Form State (Partner)
  const [rawText, setRawText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<LegalTemplate['category']>('Corporate');
  const [description, setDescription] = useState('');
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariable[]>([]);
  const [contentTemplate, setContentTemplate] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Lawyer Customization Request Modal State
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [targetTemplateForCustomization, setTargetTemplateForCustomization] = useState<LegalTemplate | null>(null);
  const [customVarKey, setCustomVarKey] = useState('');
  const [customVarLabel, setCustomVarLabel] = useState('');
  const [customVarType, setCustomVarType] = useState<VariableType>('text');
  const [customReason, setCustomReason] = useState('');

  const categories = ['All', 'Real Estate', 'Corporate', 'IP & Tech', 'Employment', 'Litigation', 'General'];

  const pendingCustomizationsList = templates.flatMap(t =>
    (t.pendingCustomizations || []).map(c => ({ ...c, parentTemplateName: t.name }))
  );

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchFilter.toLowerCase()) || t.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRunAIExtraction = async () => {
    if (!isBoss) {
      showToast('Only Partners can upload & extract master templates', 'warning');
      return;
    }
    if (!rawText.trim()) return;
    setIsExtracting(true);
    try {
      const res = await simulateAIVariableExtraction(rawText);
      setTemplateName(res.title);
      setCategory(res.category);
      setExtractedVariables(res.variables);
      setContentTemplate(res.templateHtml);
      setDescription('Extracted by LexDraft AI Legal Variable Engine.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!isBoss) {
      showToast('Only Partners can save master templates', 'warning');
      return;
    }
    if (!templateName || !contentTemplate) return;
    const newTpl = await createTemplate({
      name: templateName,
      category,
      description: description || 'AI Assisted Reusable Legal Template',
      originalFileName: `${templateName.replace(/\s+/g, '_')}.docx`,
      extractedVariables,
      contentTemplate,
      createdBy: currentUser.name,
      version: '1.0'
    });
    if (newTpl) {
      setSelectedTemplateId(newTpl.id);
    }
    setActiveSubTab('library');
    setRawText('');
    setExtractedVariables([]);
    setContentTemplate('');
  };

  const handleSubmitCustomizationRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTemplateForCustomization || !customVarKey || !customVarLabel) return;

    const newVar: TemplateVariable = {
      id: `v_custom_${Date.now()}`,
      key: customVarKey.replace(/\s+/g, '_'),
      label: customVarLabel,
      type: customVarType,
      required: false,
      defaultValue: ''
    };

    requestTemplateCustomization(
      targetTemplateForCustomization.id,
      [newVar],
      customReason || 'Custom clause variable requested by associate lawyer for specific client requirements.'
    );

    setShowCustomizationModal(false);
    setCustomVarKey('');
    setCustomVarLabel('');
    setCustomReason('');
  };

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Resource Library</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Master Documents</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Studio, <span className="font-normal font-sohne not-italic text-slate-400">Master Legal Templates</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-505 font-light max-w-xl">
            {isBoss
              ? 'Check, update, and approve custom variable additions requested by associate lawyers.'
              : 'Browse reusable agreements or request customized variables awaiting Partner sign-off.'}
          </p>
        </div>

        {/* Subtabs Switcher - Capsule Pill Style */}
        <div className={`flex items-center p-0.5 rounded-full border shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-mist-gray/60 border-slate-200/60'
        }`}>
          <button
            onClick={() => setActiveSubTab('library')}
            className={`px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'library'
                ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Templates Library ({templates.length})</span>
          </button>

          {isBoss && (
            <>
              <button
                onClick={() => setActiveSubTab('pending_approvals')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'pending_approvals'
                    ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approvals ({pendingCustomizationsList.filter(c => c.status === 'pending').length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('ai_extract')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'ai_extract'
                    ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload & Extract</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeSubTab === 'library' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category selection - ghost typographic labels */}
            <div className="flex items-center space-x-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs tracking-wider transition-colors cursor-pointer font-sohne uppercase ${
                    selectedCategory === cat
                      ? 'text-ink-black dark:text-white font-semibold underline underline-offset-4'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full input-composer text-xs pl-9 pr-3 py-2.5"
              />
            </div>
          </div>

          {/* Grid of Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="floating-artifact p-6 space-y-4 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-200"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] tracking-wider text-slate-400 uppercase font-semibold">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">v{tpl.version}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink-black dark:text-paper-white">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-405 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed font-light">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Variables snippet as nested list */}
                  <div className="p-3.5 rounded-2xl bg-mist-gray dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Extracted Fields:</span>
                      <span className="font-semibold text-slate-500">{tpl.extractedVariables.length} variables</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tpl.extractedVariables.slice(0, 3).map(v => (
                        <span key={v.id} className="text-[9px] font-mono bg-white dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-900 px-1.5 py-0.5 rounded-sm">
                          {v.key}
                        </span>
                      ))}
                      {tpl.extractedVariables.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-mono font-light">+{tpl.extractedVariables.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400 font-light">
                    <span>Used </span>
                    <strong className="font-semibold text-slate-500">{tpl.usageCount} times</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Partner deletion option */}
                    {isBoss && (
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        className="p-2 rounded-full hover:bg-rose-500/10 text-slate-405 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Lawyer request customization option */}
                    {!isBoss && (
                      <button
                        onClick={() => {
                          setTargetTemplateForCustomization(tpl);
                          setShowCustomizationModal(true);
                        }}
                        className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        Customize
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setActiveTab('document_generator');
                      }}
                      className="px-4 py-1.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-[11px] font-medium transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Draft</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner customization request reviewer */}
      {activeSubTab === 'pending_approvals' && isBoss && (
        <div className="floating-artifact space-y-6">
          <div>
            <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
              <ShieldCheck className="w-4.5 h-4.5 text-slate-400" />
              <span>Pending Customization Approvals ({pendingCustomizationsList.filter(c => c.status === 'pending').length})</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 font-light">
              Review custom variable requests submitted by associates. Approving merges them into the master template.
            </p>
          </div>

          {pendingCustomizationsList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-mist-gray dark:bg-slate-900/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-650 dark:text-slate-400">All pending approvals cleared</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingCustomizationsList.map((req) => (
                <div key={req.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-ink-black dark:text-paper-white">{req.parentTemplateName}</span>
                      <span className="px-2 py-0.5 text-[9px] font-semibold bg-mist-gray dark:bg-slate-850 text-slate-500 rounded-full uppercase tracking-wider">
                        {req.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-light">
                      Requested by associate: <strong className="font-normal text-slate-600 dark:text-slate-350">{req.requestedByLawyerName}</strong>
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-light italic">
                      Reason: "{req.reason}"
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Custom Variable:</span>
                      {req.customVariables.map(v => (
                        <span key={v.id} className="text-[9px] font-mono bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach px-2 py-0.5 rounded-sm">
                          {v.key} ({v.label})
                        </span>
                      ))}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => rejectTemplateCustomization(req.id)}
                        className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-semibold text-xs rounded-full border border-rose-500/20 flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Decline</span>
                      </button>
                      <button
                        onClick={() => approveTemplateCustomization(req.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-full flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Merge & Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Extraction Studio */}
      {activeSubTab === 'ai_extract' && isBoss && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="floating-artifact space-y-6">
            <div>
              <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                <UploadCloud className="w-4.5 h-4.5 text-slate-400" />
                <span>Upload Master Template</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-light font-sohne">
                Paste agreement text below to automatically extract dynamic fields using LexDraft AI.
              </p>
            </div>

            <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 bg-mist-gray/30 dark:bg-slate-900/30 rounded-2xl text-center space-y-3">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-ink-black dark:text-paper-white">Drag & Drop DOCX or PDF agreement</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Maximum size 25MB • Automated legal schema mapping</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Agreement Text</label>
              <textarea
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste contract text here..."
                className="w-full input-composer font-mono text-xs"
              />
            </div>

            <button
              onClick={handleRunAIExtraction}
              disabled={isExtracting || !rawText.trim()}
              className="w-full py-3 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isExtracting ? 'Extracting Variable Schema...' : 'Run Variable Extraction'}
            </button>
          </div>

          {/* AI Extraction Results */}
          <div className="floating-artifact space-y-6">
            <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white">
              Template Editor & Variables
            </h2>
            {extractedVariables.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-light">
                Results will display here after running variable extraction.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full input-composer text-xs py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Variables</label>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedVariables.map(v => (
                      <span key={v.id} className="text-[10px] font-mono bg-mist-gray dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-sm">
                        {v.key}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveTemplate}
                  className="w-full py-3 bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs rounded-full shadow-sm cursor-pointer"
                >
                  Save Master Template
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customization Request Modal Overlay */}
      {showCustomizationModal && targetTemplateForCustomization && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-slate-150 dark:border-slate-850 rounded-[24px] bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                Request Template Customization
              </h3>
              <button 
                onClick={() => setShowCustomizationModal(false)} 
                className="text-slate-400 hover:text-ink-black dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-light">
              Add custom variables for: <strong className="font-semibold text-slate-600 dark:text-slate-250">{targetTemplateForCustomization.name}</strong>.
            </p>

            <form onSubmit={handleSubmitCustomizationRequest} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Variable Name (Key)</label>
                <input
                  type="text"
                  required
                  value={customVarKey}
                  onChange={(e) => setCustomVarKey(e.target.value)}
                  placeholder="e.g. Exit_Clause_Notice_Days"
                  className="w-full input-composer font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Form Display Label</label>
                <input
                  type="text"
                  required
                  value={customVarLabel}
                  onChange={(e) => setCustomVarLabel(e.target.value)}
                  placeholder="e.g. Notice Period (Days)"
                  className="w-full input-composer text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Variable Type</label>
                <select
                  value={customVarType}
                  onChange={(e) => setCustomVarType(e.target.value as VariableType)}
                  className="w-full input-composer text-xs py-2"
                >
                  <option value="text">Text Input</option>
                  <option value="currency">Currency (₹)</option>
                  <option value="date">Date Picker</option>
                  <option value="number">Number</option>
                  <option value="multiline">Multi-line text</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client Requirement Notes</label>
                <textarea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this clause customization is needed..."
                  className="w-full input-composer text-xs h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizationModal(false)}
                  className="btn-ghost text-xs rounded-full flex-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-filled text-xs rounded-full flex-1 cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
