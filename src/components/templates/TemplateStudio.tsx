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
  X,
  History,
  Clock,
  User,
  AlertCircle,
  Calendar,
  Tag,
  Sliders,
  HelpCircle,
  Home
} from 'lucide-react';
import { LegalTemplate, TemplateVariable, VariableType } from '../../types';

// Preset suggested customizations for legal templates (especially House Rental Agreement)
const SUGGESTED_CUSTOMIZATIONS = [
  {
    key: 'Lockin_Period_Months',
    label: 'Lock-in Minimum Period (Months)',
    type: 'number' as VariableType,
    defaultValue: '11',
    reason: 'Client standard clause requiring minimum mandatory occupancy period before termination notice.'
  },
  {
    key: 'Pet_Deposit_Amount',
    label: 'Pet Damage Security Deposit (₹)',
    type: 'currency' as VariableType,
    defaultValue: '15000',
    reason: 'Clause addition for pet-friendly tenancy with refundable pet damage deposit.'
  },
  {
    key: 'Society_Maintenance_Charges',
    label: 'Monthly Society Maintenance (₹)',
    type: 'currency' as VariableType,
    defaultValue: '3500',
    reason: 'Explicitly demarcates RWA / society maintenance separate from base rental.'
  },
  {
    key: 'Painting_Deduction_Cap',
    label: 'Painting Cost Deduction Cap (₹)',
    type: 'currency' as VariableType,
    defaultValue: '10000',
    reason: 'Standardized wear-and-tear painting deduction at tenancy conclusion.'
  },
  {
    key: 'Commercial_Usage_Prohibition',
    label: 'Commercial & Subletting Restrictions',
    type: 'text' as VariableType,
    defaultValue: 'Strictly prohibited without prior written consent',
    reason: 'Enforces strict residential zoning compliance under local state tenancy laws.'
  }
];

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

  const [activeSubTab, setActiveSubTab] = useState<'library' | 'ai_extract' | 'pending_approvals' | 'my_requests'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState('');

  // AI Extraction Form State (Partner)
  const [rawText, setRawText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<LegalTemplate['category']>('Real Estate');
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
  const [customVarDefault, setCustomVarDefault] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Version History Modal State
  const [selectedTemplateForHistory, setSelectedTemplateForHistory] = useState<LegalTemplate | null>(null);

  const categories = ['All', 'Real Estate', 'Corporate', 'IP & Tech', 'Employment', 'Litigation', 'General'];

  // All pending requests (for Partner)
  const allCustomizationsList = templates.flatMap(t =>
    (t.pendingCustomizations || []).map(c => ({
      ...c,
      parentTemplateName: t.name,
      parentTemplateVersion: t.version,
      parentTemplateCategory: t.category
    }))
  );

  const pendingApprovalsList = allCustomizationsList.filter(c => c.status === 'pending');

  // Lawyer's own requests
  const myRequestsList = allCustomizationsList.filter(c =>
    c.requestedByLawyerId === currentUser.id || c.requestedByLawyerName === currentUser.name
  );

  const filteredTemplates = templates.filter(t => t.status === 'active').filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
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

  const handleApplyPreset = (preset: typeof SUGGESTED_CUSTOMIZATIONS[0]) => {
    setCustomVarKey(preset.key);
    setCustomVarLabel(preset.label);
    setCustomVarType(preset.type);
    setCustomVarDefault(preset.defaultValue);
    setCustomReason(preset.reason);
  };

  const handleSubmitCustomizationRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTemplateForCustomization || !customVarKey || !customVarLabel) return;

    const newVar: TemplateVariable = {
      id: `v_custom_${Date.now()}`,
      key: customVarKey.trim().replace(/\s+/g, '_'),
      label: customVarLabel.trim(),
      type: customVarType,
      required: false,
      defaultValue: customVarDefault.trim() || undefined
    };

    requestTemplateCustomization(
      targetTemplateForCustomization.id,
      [newVar],
      customReason || `Custom clause variable requested by associate lawyer for ${targetTemplateForCustomization.name}.`
    );

    setShowCustomizationModal(false);
    setCustomVarKey('');
    setCustomVarLabel('');
    setCustomVarDefault('');
    setCustomReason('');
  };

  const handleDraftFromTemplate = (tpl: LegalTemplate) => {
    // If Residential House Rental Agreement, route directly to the rich HouseRentalWizard
    if (tpl.name.toLowerCase().includes('rental') || tpl.name.toLowerCase().includes('house') || tpl.id === 'tpl_house_rental') {
      setActiveTab('house_rental_wizard');
    } else {
      setSelectedTemplateId(tpl.id);
      setActiveTab('document_generator');
    }
  };

  const calculateNextVersion = (currentVer: string) => {
    const [major, minor] = currentVer.split('.').map(Number);
    return `${major || 1}.${(minor ?? 0) + 1}`;
  };

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Resource Library</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Master Legal Blueprints</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Studio, <span className="font-normal font-sohne not-italic text-slate-400">Master Legal Templates</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-505 font-light max-w-xl">
            {isBoss
              ? 'Review custom variable additions requested by associates, approve updates, and maintain template versions.'
              : 'Browse reusable agreements or request custom clause variables awaiting Senior Partner approval.'}
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

          {isBoss ? (
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
                <span>Approvals</span>
                {pendingApprovalsList.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full animate-pulse">
                    {pendingApprovalsList.length}
                  </span>
                )}
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
          ) : (
            <button
              onClick={() => setActiveSubTab('my_requests')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubTab === 'my_requests'
                  ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>My Requests ({myRequestsList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SUBTAB 1: TEMPLATES LIBRARY ── */}
      {activeSubTab === 'library' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category selection */}
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
            {filteredTemplates.map((tpl) => {
              const isHouseRental = tpl.name.toLowerCase().includes('rental') || tpl.name.toLowerCase().includes('house') || tpl.id === 'tpl_house_rental';
              return (
                <div
                  key={tpl.id}
                  className="floating-artifact p-6 space-y-4 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-200 group"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] tracking-wider text-slate-400 uppercase font-semibold">
                          {tpl.category}
                        </span>
                        {isHouseRental && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Guided Wizard
                          </span>
                        )}
                      </div>

                      {/* Clickable Version Pill */}
                      <button
                        onClick={() => setSelectedTemplateForHistory(tpl)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-mist-gray dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300 font-mono font-medium transition-colors cursor-pointer"
                        title="View Version History Snapshots"
                      >
                        <History className="w-2.5 h-2.5" />
                        <span>v{tpl.version}</span>
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-ink-black dark:text-paper-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-slate-405 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-light">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Variables snippet as nested list */}
                    <div className="p-3.5 rounded-2xl bg-mist-gray dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Extracted Fields:</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{tpl.extractedVariables.length} variables</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tpl.extractedVariables.slice(0, 4).map(v => (
                          <span key={v.id} className="text-[9px] font-mono bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded-sm">
                            {v.key}
                          </span>
                        ))}
                        {tpl.extractedVariables.length > 4 && (
                          <span className="text-[9px] text-slate-400 font-mono font-light">+{tpl.extractedVariables.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400 font-light">
                      <span>Used </span>
                      <strong className="font-semibold text-slate-500 dark:text-slate-300">{tpl.usageCount} times</strong>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Partner deletion option */}
                      {isBoss && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete template "${tpl.name}"?`)) {
                              deleteTemplate(tpl.id);
                            }
                          }}
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
                          className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                        >
                          Customize
                        </button>
                      )}

                      <button
                        onClick={() => handleDraftFromTemplate(tpl)}
                        className="px-4 py-1.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-[11px] font-medium transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer shadow-sm"
                      >
                        <span>Draft</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: PARTNER APPROVALS ── */}
      {activeSubTab === 'pending_approvals' && isBoss && (
        <div className="floating-artifact space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                <span>Pending Customization Approvals ({pendingApprovalsList.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-light">
                Review proposed variables and clause customizations submitted by associate lawyers. Approving automatically merges them and increments the master template version.
              </p>
            </div>
          </div>

          {pendingApprovalsList.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-mist-gray/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">All Customization Approvals Cleared</p>
              <p className="text-xs text-slate-400 font-light max-w-sm mx-auto">
                No associate lawyer has submitted pending variable requests. All master legal templates are current.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingApprovalsList.map((req) => {
                const nextVer = calculateNextVersion(req.parentTemplateVersion || '1.0');
                return (
                  <div key={req.id} className="py-6 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <span className="text-sm font-bold text-ink-black dark:text-paper-white">{req.parentTemplateName}</span>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-mist-gray dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                          Current v{req.parentTemplateVersion || '1.0'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">→</span>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                          Will Bump to v{nextVer}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach rounded-full">
                          {req.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-[11px] text-slate-400 font-light">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Associate: <strong className="font-medium text-slate-700 dark:text-slate-300">{req.requestedByLawyerName}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1 font-mono text-[10px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(req.timestamp).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed font-light">
                          "{req.reason}"
                        </p>
                      </div>

                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Proposed Variables & Clauses:</span>
                        <div className="flex flex-wrap gap-2">
                          {req.customVariables.map((v, i) => (
                            <div key={i} className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs flex items-center space-x-2">
                              <span className="font-mono font-bold text-ink-black dark:text-paper-white">{v.key}</span>
                              <span className="text-slate-400 text-[10px]">({v.label})</span>
                              <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] rounded font-semibold uppercase">{v.type}</span>
                              {v.defaultValue && (
                                <span className="text-slate-400 font-mono text-[10px]">Default: "{v.defaultValue}"</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        onClick={() => rejectTemplateCustomization(req.id)}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-semibold text-xs rounded-full border border-rose-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>

                      <button
                        onClick={() => approveTemplateCustomization(req.id)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-full flex items-center space-x-1.5 shadow-sm transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Bump to v{nextVer}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB 3: LAWYER'S MY REQUESTS ── */}
      {activeSubTab === 'my_requests' && !isBoss && (
        <div className="floating-artifact space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
              <Sliders className="w-4.5 h-4.5 text-slate-400" />
              <span>My Customization Requests ({myRequestsList.length})</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 font-light">
              Track the approval status of custom variables and clauses you submitted to Senior Partners for master legal templates.
            </p>
          </div>

          {myRequestsList.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-mist-gray/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Customization Requests Yet</p>
              <p className="text-xs text-slate-400 font-light max-w-sm mx-auto">
                Need to add client-specific variables (like custom lock-in clauses or pet deposits)? Go to Templates Library and click "Customize".
              </p>
              <button
                onClick={() => setActiveSubTab('library')}
                className="btn-filled text-xs rounded-full px-5 py-2 mt-2 cursor-pointer"
              >
                Browse Templates
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myRequestsList.map((req) => {
                const parentTemplate = templates.find(t => t.id === req.templateId);
                return (
                  <div key={req.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink-black dark:text-paper-white">{req.parentTemplateName}</span>
                        {req.status === 'approved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            ✓ Approved & Merged
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase tracking-wider">
                            Declined
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                            Pending Partner Review
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        "{req.reason}"
                      </p>

                      <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Requested Variables:</span>
                        {req.customVariables.map((v, i) => (
                          <span key={i} className="text-[10px] font-mono bg-mist-gray dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-sm">
                            {v.key} ({v.label})
                          </span>
                        ))}
                      </div>
                    </div>

                    {req.status === 'approved' && parentTemplate && (
                      <button
                        onClick={() => handleDraftFromTemplate(parentTemplate)}
                        className="px-4 py-2 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-medium flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                      >
                        <span>Draft Agreement</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB 4: AI EXTRACTION STUDIO ── */}
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
                      <span key={v.id} className="text-[10px] font-mono bg-mist-gray dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-sm">
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

      {/* ── MODAL 1: LAWYER CUSTOMIZATION REQUEST ── */}
      {showCustomizationModal && targetTemplateForCustomization && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl border border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                  Request Template Customization
                </h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">
                  Propose custom variables or clauses for <strong className="text-slate-700 dark:text-slate-200">{targetTemplateForCustomization.name}</strong> (v{targetTemplateForCustomization.version}).
                </p>
              </div>
              <button
                onClick={() => setShowCustomizationModal(false)}
                className="text-slate-400 hover:text-ink-black dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets for 1-Click Addition */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Preset Legal Clauses (Click to populate):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CUSTOMIZATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-mist-gray dark:bg-slate-800 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitCustomizationRequest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Variable Key (Identifier) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customVarKey}
                    onChange={(e) => setCustomVarKey(e.target.value)}
                    placeholder="e.g. Lockin_Period_Months"
                    className="w-full input-composer font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Form Display Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customVarLabel}
                    onChange={(e) => setCustomVarLabel(e.target.value)}
                    placeholder="e.g. Lock-in Period (Months)"
                    className="w-full input-composer text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Variable Data Type</label>
                  <select
                    value={customVarType}
                    onChange={(e) => setCustomVarType(e.target.value as VariableType)}
                    className="w-full input-composer text-xs py-2"
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency (₹)</option>
                    <option value="date">Date Picker</option>
                    <option value="multiline">Multi-line Clause Text</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Default Fallback Value</label>
                  <input
                    type="text"
                    value={customVarDefault}
                    onChange={(e) => setCustomVarDefault(e.target.value)}
                    placeholder="e.g. 11 or 15000"
                    className="w-full input-composer text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Client Requirement Rationale / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this clause customization is needed for client matters (e.g. Specific landlord requirement for 11 months lock-in period)..."
                  className="w-full input-composer text-xs h-20 resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 font-light flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Upon Senior Partner approval, this variable will be added to the master template and bump version to v{calculateNextVersion(targetTemplateForCustomization.version)}.</span>
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
                  className="btn-filled text-xs rounded-full flex-1 cursor-pointer shadow-sm"
                >
                  Submit for Partner Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: VERSION HISTORY SNAPSHOTS ── */}
      {selectedTemplateForHistory && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg border border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white flex items-center space-x-2">
                  <History className="w-4 h-4 text-blue-500" />
                  <span>Version Snapshots History</span>
                </h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">
                  {selectedTemplateForHistory.name} • Current Version: <strong className="text-slate-700 dark:text-slate-200">v{selectedTemplateForHistory.version}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedTemplateForHistory(null)}
                className="text-slate-400 hover:text-ink-black dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {selectedTemplateForHistory.versionHistory && selectedTemplateForHistory.versionHistory.length > 0 ? (
                selectedTemplateForHistory.versionHistory.map((ver, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-ink-black text-white dark:bg-paper-white dark:text-ink-black">
                          {ver.version.startsWith('v') ? ver.version : `v${ver.version}`}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {idx === 0 ? 'Latest Master Release' : 'Historical Snapshot'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ver.editedAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-light">
                      {ver.changeSummary}
                    </p>

                    <div className="text-[10px] text-slate-400 font-light flex items-center space-x-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Approved / Signed-off by: <strong className="font-normal text-slate-600 dark:text-slate-300">{ver.editedBy}</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-light">
                  Initial v1.0 master template release.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedTemplateForHistory(null)}
                className="btn-filled text-xs rounded-full px-6 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
