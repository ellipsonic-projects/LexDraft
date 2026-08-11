import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Send,
  Save,
  HelpCircle,
  CheckCircle2,
  Home,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  HouseWizardState,
  WizardQuestion,
  DEFAULT_HOUSE_WIZARD_STATE,
  HouseTabId,
  UtilityResponsibility,
  YesNo,
  YesNoDns
} from '../../types/houseWizardTypes';
import {
  HOUSE_WIZARD_TABS,
  INDIAN_STATES,
  FAQ_CONTENT
} from '../../config/agreements/houseRentalConfig';
import {
  compileHouseAgreement,
  wizardStateToVariables
} from '../../utils/HouseAgreementCompiler';

// ─── Sub-components ───────────────────────────────────────────────────────────

const YesNoToggle: React.FC<{
  value: YesNo;
  onChange: (v: YesNo) => void;
}> = ({ value, onChange }) => (
  <div className="flex gap-2 mt-1">
    {(['yes', 'no'] as YesNo[]).map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`px-5 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
          value === opt
            ? 'bg-blue-600 text-white border-blue-600 shadow'
            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
        }`}
      >
        {opt === 'yes' ? 'Yes' : 'No'}
      </button>
    ))}
  </div>
);

const YesNoDnsToggle: React.FC<{
  value: YesNoDns;
  onChange: (v: YesNoDns) => void;
}> = ({ value, onChange }) => (
  <div className="flex gap-2 mt-1">
    {([
      { v: 'yes', l: 'Yes' },
      { v: 'no', l: 'No' },
      { v: 'dns', l: 'Do Not Specify' }
    ] as { v: YesNoDns; l: string }[]).map(opt => (
      <button
        key={opt.v}
        type="button"
        onClick={() => onChange(opt.v)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
          value === opt.v
            ? 'bg-blue-600 text-white border-blue-600 shadow'
            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
        }`}
      >
        {opt.l}
      </button>
    ))}
  </div>
);

const UtilityGrid: React.FC<{
  state: HouseWizardState;
  onUpdate: (updates: Partial<HouseWizardState>) => void;
}> = ({ state, onUpdate }) => {
  const utilities: { key: keyof HouseWizardState; label: string }[] = [
    { key: 'utilElectricity', label: 'Electricity' },
    { key: 'utilWater', label: 'Water' },
    { key: 'utilSanitation', label: 'Sanitation' },
    { key: 'utilDrainage', label: 'Drainage' },
    { key: 'utilAC', label: 'Air Conditioning' },
    { key: 'utilPropertyTax', label: 'Property Tax' },
    { key: 'utilStorage', label: 'Storage' },
    { key: 'utilOther', label: 'Other' },
  ];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Utility</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Landlord</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Tenant</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Do Not Specify</th>
          </tr>
        </thead>
        <tbody>
          {utilities.map((u, i) => {
            const currentVal = state[u.key] as UtilityResponsibility;
            return (
              <tr key={u.key} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="py-3 px-4 text-sm font-medium text-slate-700">{u.label}</td>
                {(['landlord', 'tenant', 'dns'] as UtilityResponsibility[]).map(opt => (
                  <td key={opt} className="py-3 px-4 text-center">
                    <input
                      type="radio"
                      name={u.key}
                      checked={currentVal === opt}
                      onChange={() => onUpdate({ [u.key]: opt })}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.utilOther !== 'dns' && (
        <div className="p-4 bg-blue-50/50 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1">Describe other utilities</label>
          <input
            type="text"
            value={state.listUtilOther}
            onChange={e => onUpdate({ listUtilOther: e.target.value })}
            placeholder="e.g. Generator, Cable TV, Internet"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

const RepeaterField: React.FC<{
  values: string[];
  label: string;
  addLabel: string;
  placeholder: string;
  onChange: (vals: string[]) => void;
}> = ({ values, label, addLabel, placeholder, onChange }) => (
  <div className="space-y-2">
    {values.map((val, i) => (
      <div key={i} className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={e => {
            const next = [...values];
            next[i] = e.target.value;
            onChange(next);
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {values.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...values, ''])}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
    >
      <Plus size={14} /> {addLabel}
    </button>
  </div>
);

// ─── Question Renderer ────────────────────────────────────────────────────────

const QuestionRenderer: React.FC<{
  question: WizardQuestion;
  state: HouseWizardState;
  onUpdate: (updates: Partial<HouseWizardState>) => void;
}> = ({ question, state, onUpdate }) => {
  const key = question.id as keyof HouseWizardState;
  const value = state[key];

  switch (question.type) {
    case 'readonly': {
      const stateInfo = INDIAN_STATES.find(s => s.value === state.governingLaw);
      return (
        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[38px]">
          {stateInfo ? `${stateInfo.courts} (${stateInfo.label})` : <span className="text-slate-400 italic">Auto-populated from state selection</span>}
        </div>
      );
    }

    case 'radio': {
      if (key === 'governingLaw') {
        return (
          <select
            value={state.governingLaw}
            onChange={e => {
              const selected = INDIAN_STATES.find(s => s.value === e.target.value);
              onUpdate({ governingLaw: e.target.value, governingLawLabel: selected?.label || '' });
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select state or union territory...</option>
            {INDIAN_STATES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        );
      }
      return (
        <div className="space-y-2 mt-1">
          {question.options?.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={String(value) === opt.value}
                onChange={() => onUpdate({ [key]: opt.value } as Partial<HouseWizardState>)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'yesno':
      return (
        <YesNoToggle
          value={value as YesNo}
          onChange={v => onUpdate({ [key]: v } as Partial<HouseWizardState>)}
        />
      );

    case 'yesnodns':
      return (
        <YesNoDnsToggle
          value={value as YesNoDns}
          onChange={v => onUpdate({ [key]: v } as Partial<HouseWizardState>)}
        />
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onUpdate({ [key]: e.target.checked } as Partial<HouseWizardState>)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-700">{question.label}</span>
        </label>
      );

    case 'text':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={e => onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>)}
          placeholder={question.placeholder}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={e => onUpdate({ [key]: Number(e.target.value) } as Partial<HouseWizardState>)}
          placeholder={question.placeholder || '0'}
          min={0}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={String(value ?? '')}
          onChange={e => onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={e => onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>)}
          placeholder={question.placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      );

    case 'repeater': {
      const arrKey = key as 'landlords' | 'tenants' | 'additionalClausesList';
      const arrVal = state[arrKey] as string[];
      const addLabels: Record<string, string> = {
        landlords: '+ Add another landlord',
        tenants: '+ Add another tenant',
        additionalClausesList: '+ Add another clause',
      };
      return (
        <RepeaterField
          values={arrVal}
          label={question.label}
          addLabel={addLabels[arrKey] || '+ Add another'}
          placeholder={question.placeholder || ''}
          onChange={vals => onUpdate({ [arrKey]: vals } as Partial<HouseWizardState>)}
        />
      );
    }

    case 'utility_grid':
      // Rendered at group level, not per-question
      return null;

    default:
      return null;
  }
};

// ─── Main Wizard Component ────────────────────────────────────────────────────

export const HouseRentalWizard: React.FC = () => {
  const {
    generateDocument,
    clients,
    matters,
    setActiveTab,
    setSelectedDocumentId,
    theme,
    showToast
  } = useApp();

  const isDark = theme === 'dark';

  const [state, setState] = useState<HouseWizardState>(DEFAULT_HOUSE_WIZARD_STATE);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [activeFaqKey, setActiveFaqKey] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client / matter selection for vault submission
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const tabs = HOUSE_WIZARD_TABS;
  const currentTab = tabs[currentTabIndex];
  const progress = ((currentTabIndex + 1) / tabs.length) * 100;

  // Live preview — recompiles on every state change
  const compiledHtml = useMemo(() => compileHouseAgreement(state), [state]);

  const updateState = useCallback((updates: Partial<HouseWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goNext = () => {
    if (currentTabIndex < tabs.length - 1) setCurrentTabIndex(i => i + 1);
  };
  const goBack = () => {
    if (currentTabIndex > 0) setCurrentTabIndex(i => i - 1);
  };

  const handleSaveToVault = async (submit = false) => {
    if (!selectedClientId) {
      showToast('Please select a client before saving.', 'error');
      return;
    }
    const availableMatters = matters.filter(m => m.clientId === selectedClientId && m.status === 'active');
    const mId = selectedMatterId || availableMatters[0]?.id;
    if (!mId) {
      showToast('Please select a matter for this document.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const variables = wizardStateToVariables(state);
      // Pass the compiled agreement HTML so the server's {{__content__}} placeholder is filled.
      variables['__content__'] = compiledHtml;

      const doc = await generateDocument(
        'tpl_house_rental',
        selectedClientId,
        mId,
        variables,
        'high',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      if (doc) {
        setSelectedDocumentId(doc.id);
        setActiveTab('document_editor');
        showToast(submit ? 'Agreement saved and submitted for Partner review!' : 'Agreement saved to Document Vault!', 'success');
      }
    } catch (err) {
      showToast('Failed to save agreement. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };


  const isLastTab = currentTabIndex === tabs.length - 1;
  const availableMatters = matters.filter(m => m.clientId === selectedClientId && m.status === 'active');

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* ── Top Navigation Header ── */}
      <div className="bg-slate-900 text-white shadow-lg flex-shrink-0">
        {/* Title bar */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Home size={16} />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">House</span>
            </div>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-sm font-semibold text-slate-200">Residential Rental Agreement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showPreview ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              <Eye size={13} /> {showPreview ? 'Hide' : 'Show'} Preview
            </button>
            <button
              onClick={() => setActiveTab('document_generator')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-all"
            >
              <X size={13} /> Exit Wizard
            </button>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="px-6 py-0 flex items-stretch overflow-x-auto scrollbar-none">
          {tabs.map((tab, i) => {
            const isDone = i < currentTabIndex;
            const isCurrent = i === currentTabIndex;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTabIndex(i)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'border-blue-400 text-blue-300'
                    : isDone
                    ? 'border-transparent text-green-400 hover:text-green-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {isDone && <CheckCircle2 size={14} className="text-green-400" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Questions Panel */}
        <div className={`flex-1 overflow-y-auto ${showPreview ? 'max-w-2xl' : 'max-w-3xl mx-auto w-full'}`}>
          <div className="px-8 py-8">

            {/* Tab heading */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {currentTab.label}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Step {currentTabIndex + 1} of {tabs.length}
              </p>
            </div>

            {/* Groups */}
            {currentTab.groups.map(group => {
              // Check if utility_grid group
              const hasUtilityGrid = group.questions.some(q => q.type === 'utility_grid');

              return (
                <div key={group.id} className="mb-8">
                  {/* Group header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-700 border-b border-slate-200 pb-2 flex-1">
                      {group.title}
                    </h3>
                    {group.faqKey && (
                      <button
                        onClick={() => setActiveFaqKey(activeFaqKey === group.faqKey ? null : group.faqKey!)}
                        className="ml-3 text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs font-medium"
                      >
                        <HelpCircle size={14} />
                        FAQ
                      </button>
                    )}
                  </div>

                  {/* FAQ panel */}
                  {activeFaqKey === group.faqKey && group.faqKey && FAQ_CONTENT[group.faqKey] && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: FAQ_CONTENT[group.faqKey] }}
                    />
                  )}

                  {/* Utility Grid (rendered at group level) */}
                  {hasUtilityGrid && (
                    <UtilityGrid state={state} onUpdate={updateState} />
                  )}

                  {/* Individual questions */}
                  {!hasUtilityGrid && group.questions.map(question => {
                    // Evaluate visibility
                    if (question.showIf && !question.showIf(state)) return null;
                    // Skip checkbox questions — rendered inline, not as separate rows
                    // (they have their own label in the renderer)
                    const isInline = question.type === 'checkbox';

                    return (
                      <div key={question.id} className="mb-5">
                        {!isInline && (
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            {question.label}
                            {question.required && <span className="text-rose-500 ml-1">*</span>}
                          </label>
                        )}
                        <QuestionRenderer
                          question={question}
                          state={state}
                          onUpdate={updateState}
                        />
                        {question.helpText && (
                          <p className="text-xs text-slate-400 mt-1">{question.helpText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Final Tab: Client/Matter selector + action buttons ── */}
            {isLastTab && (
              <div className="mt-8 p-6 border-2 border-blue-200 bg-blue-50 rounded-2xl">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Save to Document Vault
                </h3>

                {/* Client selector */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={e => {
                      setSelectedClientId(e.target.value);
                      setSelectedMatterId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Matter selector */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Matter</label>
                  <select
                    value={selectedMatterId || availableMatters[0]?.id || ''}
                    onChange={e => setSelectedMatterId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select matter...</option>
                    {availableMatters.map(m => <option key={m.id} value={m.id}>{m.title} ({m.matterCode})</option>)}
                  </select>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleSaveToVault(false)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60"
                  >
                    <Save size={14} />
                    Save Draft to Vault
                  </button>
                  <button
                    onClick={() => handleSaveToVault(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
                  >
                    <Send size={14} />
                    {isSubmitting ? 'Saving...' : 'Save & Submit for Partner Review'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Navigation Controls ── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={goBack}
                disabled={currentTabIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={currentTabIndex === 0}
                className="text-xs text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline transition-all"
              >
                {!isLastTab ? 'Skip this step for now' : ''}
              </button>

              {!isLastTab && (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Save and Continue <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className={`w-[480px] flex-shrink-0 border-l ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex flex-col`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Agreement Preview</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400">Real-time</span>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: compiledHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseRentalWizard;
