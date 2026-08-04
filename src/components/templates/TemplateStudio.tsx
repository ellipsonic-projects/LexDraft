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

  const handleSaveTemplate = () => {
    if (!isBoss) {
      showToast('Only Partners can save master templates', 'warning');
      return;
    }
    if (!templateName || !contentTemplate) return;
    const newTpl = createTemplate({
      name: templateName,
      category,
      description: description || 'AI Assisted Reusable Legal Template',
      originalFileName: `${templateName.replace(/\s+/g, '_')}.docx`,
      extractedVariables,
      contentTemplate,
      createdBy: currentUser.name,
      version: '1.0'
    });
    setSelectedTemplateId(newTpl.id);
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 uppercase tracking-wider flex items-center space-x-1">
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isBoss ? 'Template Checker & Updater' : 'Legal Template Library'}</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {isBoss ? 'Template Checker & Master Updater' : 'Legal Templates & Customization Studio'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {isBoss
              ? 'Check, update, and approve template customization requests submitted by associate lawyers.'
              : 'Browse firm templates or request custom variable additions needing Senior Partner approval.'}
          </p>
        </div>

        <div className={`flex items-center p-1 rounded-xl border shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('library')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeSubTab === 'library'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Master Templates ({templates.length})</span>
          </button>

          {isBoss && (
            <>
              <button
                onClick={() => setActiveSubTab('pending_approvals')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
                  activeSubTab === 'pending_approvals'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Pending Approvals ({pendingCustomizationsList.filter(c => c.status === 'pending').length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('ai_extract')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
                  activeSubTab === 'ai_extract'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Upload & Extract</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeSubTab === 'library' && (
        <div className="space-y-6">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 border focus:outline-none ${
                  isDark ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-blue-800/50' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-800'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className={`rounded-2xl border transition-all p-6 space-y-4 flex flex-col justify-between group shadow-xl ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-800/40' : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 uppercase">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">v{tpl.version}</span>
                  </div>

                  <div>
                    <h3 className={`text-base font-bold group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}>
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Extracted Variables:</span>
                      <span className="font-bold text-blue-900 dark:text-blue-400">{tpl.extractedVariables.length} fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tpl.extractedVariables.slice(0, 4).map(v => (
                        <span key={v.id} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                        }`}>
                          &#123;&#123;{v.key}&#125;&#125;
                        </span>
                      ))}
                      {tpl.extractedVariables.length > 4 && (
                        <span className="text-[10px] text-slate-400 font-mono">+{tpl.extractedVariables.length - 4} more</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`pt-4 border-t flex items-center justify-between text-xs ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div className="text-[11px] text-slate-500">
                    <span>Used </span>
                    <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{tpl.usageCount} times</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Partner: Delete button */}
                    {isBoss && (
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Lawyer: Request Template Customization button */}
                    {!isBoss && (
                      <button
                        onClick={() => {
                          setTargetTemplateForCustomization(tpl);
                          setShowCustomizationModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all"
                      >
                        Request Customization
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setActiveTab('document_generator');
                      }}
                      className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/20 transition-all flex items-center space-x-1.5"
                    >
                      <span>Generate Doc</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner: Pending Customizations SubTab */}
      {activeSubTab === 'pending_approvals' && isBoss && (
        <div className={`rounded-2xl border p-6 shadow-xl space-y-6 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h2 className={`text-base font-extrabold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <ShieldCheck className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <span>Lawyer Template Customization Requests</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Associate lawyers can request customized variables or clause additions. Review and approve to merge into master templates.
            </p>
          </div>

          {pendingCustomizationsList.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No pending customization requests</p>
              <p className="text-[11px] text-slate-500">Associate lawyers will submit customization requests when client clauses differ.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCustomizationsList.map((req) => (
                <div key={req.id} className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{req.parentTemplateName}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        req.status === 'pending' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Requested by associate: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{req.requestedByLawyerName}</strong>
                    </p>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                      Reason: "{req.reason}"
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-[10px] text-slate-400">Custom Variable Key:</span>
                      {req.customVariables.map(v => (
                        <span key={v.id} className="text-[10px] font-mono bg-blue-900/10 text-blue-900 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-800/20">
                          &#123;&#123;{v.key}&#125;&#125; ({v.label})
                        </span>
                      ))}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => rejectTemplateCustomization(req.id)}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                      <button
                        onClick={() => approveTemplateCustomization(req.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Merge to Master</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Upload & Extract Studio (Partner) */}
      {activeSubTab === 'ai_extract' && isBoss && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`rounded-2xl border p-6 shadow-xl space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <UploadCloud className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                <span>Step 1: Upload or Paste Legal Document</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Paste an existing agreement text to automatically extract dynamic fields.
              </p>
            </div>

            <div className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-3 transition-colors ${
              isDark ? 'bg-slate-950/70 border-slate-800 hover:border-blue-800/40' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
            }`}>
              <UploadCloud className="w-10 h-10 text-blue-800 mx-auto" />
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Drag & Drop DOCX or PDF agreement</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Maximum file size 25MB • Automatic AI Legal Schema Detection</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Agreement Text</label>
              <textarea
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste agreement text here..."
                className={`w-full text-xs p-3 rounded-xl border focus:outline-none font-mono ${
                  isDark ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-blue-800/50' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-800'
                }`}
              />
            </div>

            <button
              onClick={handleRunAIExtraction}
              disabled={isExtracting || !rawText.trim()}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/20"
            >
              {isExtracting ? 'Extracting Variables with AI...' : 'Run AI Variable Extraction'}
            </button>
          </div>

          <div className={`rounded-2xl border p-6 shadow-xl space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Step 2: Save Reusable Template</h2>
            {extractedVariables.length > 0 && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border"
                />
                <button
                  onClick={handleSaveTemplate}
                  className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                >
                  Save Master Template
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lawyer Template Customization Modal */}
      {showCustomizationModal && targetTemplateForCustomization && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                <span>Request Template Customization</span>
              </h3>
              <button onClick={() => setShowCustomizationModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Target Template: <strong className="text-slate-800 dark:text-slate-200">{targetTemplateForCustomization.name}</strong>. Your requested variable will be sent to the Senior Partner for approval.
            </p>

            <form onSubmit={handleSubmitCustomizationRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Custom Variable Name (Key)</label>
                <input
                  type="text"
                  required
                  value={customVarKey}
                  onChange={(e) => setCustomVarKey(e.target.value)}
                  placeholder="e.g. Early_Exit_Penalty_Amount"
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Form Display Label</label>
                <input
                  type="text"
                  required
                  value={customVarLabel}
                  onChange={(e) => setCustomVarLabel(e.target.value)}
                  placeholder="e.g. Early Exit Penalty Fee (₹)"
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Variable Type</label>
                <select
                  value={customVarType}
                  onChange={(e) => setCustomVarType(e.target.value as VariableType)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1"
                >
                  <option value="text">Text Input</option>
                  <option value="currency">Currency (₹)</option>
                  <option value="date">Date Picker</option>
                  <option value="number">Number</option>
                  <option value="multiline">Multi-line Clause</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reason / Client Requirement Notes</label>
                <textarea
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this clause customization is needed..."
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all mt-2"
              >
                Submit Customization for Partner Approval
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
