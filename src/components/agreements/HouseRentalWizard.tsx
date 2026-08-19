import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
        className={`px-5 py-2 rounded-lg text-sm font-semibold border-2 transition-all cursor-pointer ${
          value === opt
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
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
        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all cursor-pointer ${
          value === opt.v
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
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
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Utility</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Landlord</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Tenant</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Do Not Specify</th>
          </tr>
        </thead>
        <tbody>
          {utilities.map((u, i) => {
            const currentVal = state[u.key] as UtilityResponsibility;
            return (
              <tr key={u.key} className={`border-b border-slate-100 dark:border-slate-800/80 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
                <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{u.label}</td>
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
        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Describe other utilities</label>
          <input
            type="text"
            value={state.listUtilOther}
            onChange={e => onUpdate({ listUtilOther: e.target.value })}
            placeholder="e.g. Generator, Cable TV, Internet"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {values.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...values, ''])}
      className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-1 cursor-pointer"
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
  onFocusField?: (fieldKey: string) => void;
}> = ({ question, state, onUpdate, onFocusField }) => {
  const key = question.id as keyof HouseWizardState;
  const value = state[key];

  const handleFocus = () => {
    if (onFocusField) onFocusField(key);
  };

  switch (question.type) {
    case 'readonly': {
      const stateInfo = INDIAN_STATES.find(s => s.value === state.governingLaw);
      return (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-300 min-h-[38px]">
          {stateInfo ? `${stateInfo.courts} (${stateInfo.label})` : <span className="text-slate-400 dark:text-slate-500 italic">Auto-populated from state selection</span>}
        </div>
      );
    }

    case 'radio': {
      if (key === 'governingLaw') {
        return (
          <select
            value={state.governingLaw}
            onFocus={handleFocus}
            onChange={e => {
              const selected = INDIAN_STATES.find(s => s.value === e.target.value);
              onUpdate({ governingLaw: e.target.value, governingLawLabel: selected?.label || '' });
              handleFocus();
            }}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onFocus={handleFocus}
                onChange={() => {
                  onUpdate({ [key]: opt.value } as Partial<HouseWizardState>);
                  handleFocus();
                }}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'yesno':
      return (
        <div onFocus={handleFocus} onClick={handleFocus}>
          <YesNoToggle
            value={value as YesNo}
            onChange={v => {
              onUpdate({ [key]: v } as Partial<HouseWizardState>);
              handleFocus();
            }}
          />
        </div>
      );

    case 'yesnodns':
      return (
        <div onFocus={handleFocus} onClick={handleFocus}>
          <YesNoDnsToggle
            value={value as YesNoDns}
            onChange={v => {
              onUpdate({ [key]: v } as Partial<HouseWizardState>);
              handleFocus();
            }}
          />
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer" onFocus={handleFocus}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onFocus={handleFocus}
            onChange={e => {
              onUpdate({ [key]: e.target.checked } as Partial<HouseWizardState>);
              handleFocus();
            }}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{question.label}</span>
        </label>
      );

    case 'text':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onFocus={handleFocus}
          onChange={e => {
            onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>);
            handleFocus();
          }}
          placeholder={question.placeholder}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={Number(value ?? 0)}
          onFocus={handleFocus}
          onChange={e => {
            onUpdate({ [key]: Number(e.target.value) } as Partial<HouseWizardState>);
            handleFocus();
          }}
          placeholder={question.placeholder || '0'}
          min={0}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={String(value ?? '')}
          onFocus={handleFocus}
          onChange={e => {
            onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>);
            handleFocus();
          }}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onFocus={handleFocus}
          onChange={e => {
            onUpdate({ [key]: e.target.value } as Partial<HouseWizardState>);
            handleFocus();
          }}
          placeholder={question.placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
        <div onFocus={handleFocus}>
          <RepeaterField
            values={arrVal}
            label={question.label}
            addLabel={addLabels[arrKey] || '+ Add another'}
            placeholder={question.placeholder || ''}
            onChange={vals => {
              onUpdate({ [arrKey]: vals } as Partial<HouseWizardState>);
              handleFocus();
            }}
          />
        </div>
      );
    }

    case 'utility_grid':
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
    tasks,
    selectedTaskId,
    setSelectedTaskId,
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

  useEffect(() => {
    if (selectedTaskId) {
      const activeTask = tasks.find(t => t.id === selectedTaskId);
      if (activeTask) {
        if (activeTask.clientId) {
          setSelectedClientId(activeTask.clientId);
        }
        if (activeTask.matterId) {
          setSelectedMatterId(activeTask.matterId);
        }
        const client = clients.find(c => c.id === activeTask.clientId);
        if (client) {
          setState(prev => ({
            ...prev,
            tenants: [client.name]
          }));
        }
      }
    }
  }, [selectedTaskId, tasks, clients]);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const lastFocusedFieldRef = useRef<string | null>(null);

  const tabs = HOUSE_WIZARD_TABS;
  const currentTab = tabs[currentTabIndex];
  const progress = ((currentTabIndex + 1) / tabs.length) * 100;

  // Live preview — recompiles on every state change
  const compiledHtml = useMemo(() => compileHouseAgreement(state), [state]);

  const updateState = useCallback((updates: Partial<HouseWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Map field key to agreement section for auto-scroll
  const scrollToFieldInPreview = useCallback((fieldKey: string, smooth = true, flash = true) => {
    lastFocusedFieldRef.current = fieldKey;
    if (!previewIframeRef.current?.contentWindow) return;

    const fieldMap: Record<string, { targetId?: string; targetText?: string }> = {
      // General / Dates
      governingLaw: { targetId: 'sec-governing-law', targetText: 'Governing Law' },
      leaseTermType: { targetId: 'sec-term', targetText: 'Term' },
      leaseStartDate: { targetId: 'sec-term', targetText: 'commences' },
      fixedEndDateEnd: { targetId: 'sec-term', targetText: 'ends' },
      possessionDate: { targetId: 'sec-term', targetText: 'commences' },
      renewalTermType: { targetId: 'sec-term', targetText: 'renewing automatically' },
      renewalTermOther: { targetId: 'sec-term', targetText: 'renewing automatically' },

      // Property
      propertyAddress: { targetId: 'sec-leased-property', targetText: 'municipally described as' },
      furnished: { targetId: 'sec-leased-property', targetText: 'furnishings' },
      furnishedList: { targetId: 'sec-leased-property', targetText: 'furnishings' },
      showFurnishedList: { targetId: 'sec-leased-property', targetText: 'furnishings' },
      pets: { targetId: 'sec-leased-property', targetText: 'pets' },
      smoking: { targetId: 'sec-leased-property', targetText: 'smoke' },
      otherOccupants: { targetId: 'sec-leased-property', targetText: 'occupy' },
      otherOccupantsList: { targetId: 'sec-leased-property', targetText: 'occupy' },

      // Parties
      landlords: { targetId: 'preamble-between', targetText: 'Landlord' },
      tenants: { targetId: 'preamble-between', targetText: 'Tenant' },
      landlordAddress: { targetId: 'sec-address-for-notice', targetText: 'Landlord' },
      landlordPhone: { targetId: 'sec-address-for-notice', targetText: 'Phone' },
      landlordEmail: { targetId: 'sec-address-for-notice', targetText: 'Email' },
      tenantPhone: { targetId: 'sec-address-for-notice', targetText: 'Tenant' },
      tenantEmail: { targetId: 'sec-address-for-notice', targetText: 'Email' },
      propertyManager: { targetId: 'sec-property-manager', targetText: 'Property Manager' },
      propertyManagerName: { targetId: 'sec-property-manager', targetText: 'Property Manager' },
      guarantorRequired: { targetId: 'sec-guarantor', targetText: 'Guarantor' },
      guarantorName: { targetId: 'sec-guarantor', targetText: 'Guarantor' },

      // Terms
      rent: { targetId: 'sec-rent', targetText: 'Rent' },
      rentPaymentPeriod: { targetId: 'sec-rent', targetText: 'per month' },
      rentPayDay: { targetId: 'sec-rent', targetText: 'on or before' },
      rentPaidByCheque: { targetId: 'sec-rent', targetText: 'Rent' },
      rentPaidByCash: { targetId: 'sec-rent', targetText: 'Rent' },
      rentPaidByBank: { targetId: 'sec-rent', targetText: 'bank transfer' },
      bankAccountName: { targetId: 'sec-rent', targetText: 'Account Name' },
      bankAccountNumber: { targetId: 'sec-rent', targetText: 'Account Number' },
      securityDeposit: { targetId: 'sec-rental-deposit', targetText: 'Security Deposit' },
      securityDepositAmount: { targetId: 'sec-rental-deposit', targetText: 'Security Deposit' },
      specifyDepositDeadline: { targetId: 'sec-rental-deposit', targetText: 'within the lesser' },
      specifySecurityDepositDeadline: { targetId: 'sec-rental-deposit', targetText: 'within the lesser' },
      subletting: { targetId: 'sec-assignment-and-subletting', targetText: 'Assignment and Subletting' },
      terminationNotice: { targetId: 'sec-term', targetText: 'terminate this Lease' },
      noticeToEnter: { targetId: 'sec-term', targetText: 'written notice prior to entering' },

      // Final details
      landlordImprovements: { targetId: 'sec-landlord-improvements', targetText: 'Landlord Improvements' },
      listLandlordImprovements: { targetId: 'sec-landlord-improvements', targetText: 'Landlord Improvements' },
      tenantAddressNotices: { targetId: 'sec-address-for-notice', targetText: 'Address for Notice' },
      tenantNoticeAddress: { targetId: 'sec-address-for-notice', targetText: 'Address for Notice' },
      inspectionReport: { targetId: 'sec-inspection-report', targetText: 'inspection report' },
      stampPaperSpace: { targetText: 'KARNATAKA NON-JUDICIAL STAMP PAPER' },
      additionalClauses: { targetId: 'sec-additional-provisions', targetText: 'Additional Provisions' },
      additionalClausesList: { targetId: 'sec-additional-provisions', targetText: 'Additional Provisions' },

      // Signing
      signingDateType: { targetText: 'IN WITNESS WHEREOF' },
      longformDate: { targetText: 'IN WITNESS WHEREOF' },
      signingCity: { targetText: 'IN WITNESS WHEREOF' },
    };

    const target = fieldMap[fieldKey];
    if (target) {
      previewIframeRef.current.contentWindow.postMessage({
        type: 'lexdraft-scroll-to',
        targetId: target.targetId,
        targetText: target.targetText,
        fieldKey,
        smooth,
        flash,
      }, '*');
    }
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

      const activeTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

      const doc = await generateDocument(
        'tpl_house_rental',
        selectedClientId,
        mId,
        variables,
        activeTask?.priority || 'high',
        activeTask?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selectedTaskId || undefined
      );
      if (doc) {
        setSelectedDocumentId(doc.id);
        setSelectedTaskId(null);
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
      <div className="flex-1 flex overflow-hidden w-full">

        {/* Questions Panel */}
        <div className={`overflow-y-auto ${showPreview ? 'w-[480px] lg:w-[540px] xl:w-[580px] flex-shrink-0' : 'max-w-3xl mx-auto w-full'}`}>
          <div className="px-8 py-8">

            {/* Tab heading */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {currentTab.label}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 flex-1">
                      {group.title}
                    </h3>
                    {group.faqKey && (
                      <button
                        onClick={() => setActiveFaqKey(activeFaqKey === group.faqKey ? null : group.faqKey!)}
                        className="ml-3 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-xs font-medium cursor-pointer"
                      >
                        <HelpCircle size={14} />
                        FAQ
                      </button>
                    )}
                  </div>

                  {/* FAQ panel */}
                  {activeFaqKey === group.faqKey && group.faqKey && FAQ_CONTENT[group.faqKey] && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-sm text-blue-900 dark:text-blue-200 leading-relaxed"
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
                    const isInline = question.type === 'checkbox';

                    return (
                      <div key={question.id} className="mb-5">
                        {!isInline && (
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {question.label}
                            {question.required && <span className="text-rose-500 ml-1">*</span>}
                          </label>
                        )}
                        <QuestionRenderer
                          question={question}
                          state={state}
                          onUpdate={updateState}
                          onFocusField={scrollToFieldInPreview}
                        />
                        {question.helpText && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{question.helpText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Final Tab: Client/Matter selector + action buttons ── */}
            {isLastTab && (
              <div className="mt-8 p-6 border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-slate-900/80 rounded-2xl">
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                  Save to Document Vault
                </h3>

                {/* Client selector */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={e => {
                      setSelectedClientId(e.target.value);
                      setSelectedMatterId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Matter selector */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Matter</label>
                  <select
                    value={selectedMatterId || availableMatters[0]?.id || ''}
                    onChange={e => setSelectedMatterId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select matter...</option>
                    {availableMatters.map(m => <option key={m.id} value={m.id}>{m.title} ({m.matterCode})</option>)}
                  </select>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleSaveToVault(false)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer"
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

        {/* Live Preview Panel — Expands cleanly to fill remaining screen width */}
        {showPreview && (
          <div className={`flex-1 min-w-[500px] border-l ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'} flex flex-col overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex items-center justify-between flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Live Agreement Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">Auto-scroll Sync</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Real-time</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-[#c8c8c8] dark:bg-[#121316] p-0 flex justify-center">
              <iframe
                ref={previewIframeRef}
                srcDoc={compiledHtml}
                title="Live Agreement Preview"
                onLoad={() => {
                  if (lastFocusedFieldRef.current) {
                    scrollToFieldInPreview(lastFocusedFieldRef.current, false, false);
                  }
                }}
                className="w-full h-full border-0 bg-transparent"
                style={{
                  display: 'block',
                  border: 'none',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseRentalWizard;
