import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wand2,
  FileText,
  Sparkles,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { TaskPriority } from '../../types';

export const DocumentGenerator: React.FC = () => {
  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    generateDocument,
    setActiveTab,
    setSelectedDocumentId,
    theme,
    clients,
    matters,
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    showToast
  } = useApp();

  const isDark = theme === 'dark';
  const [step, setStep] = useState<1 | 2 | 3>(selectedTemplateId ? 2 : 1);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(selectedTemplateId || (templates[0]?.id || ''));
  const [clientId, setClientId] = useState<string>('');
  const [matterId, setMatterId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedTaskId) {
      const activeTask = tasks.find(t => t.id === selectedTaskId);
      if (activeTask) {
        setClientId(activeTask.clientId);
        setMatterId(activeTask.matterId);
        setPriority(activeTask.priority);
        setDueDate(activeTask.dueDate);
      }
    } else {
      if (clients.length > 0) {
        setClientId(clients[0].id);
        const matching = matters.filter(m => m.clientId === clients[0].id && m.status === 'active');
        setMatterId(matching[0]?.id || '');
      }
    }
  }, [selectedTaskId, tasks, clients, matters]);

  const selectedTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, any> = {};
      selectedTemplate.extractedVariables.forEach(v => {
        initial[v.key] = v.defaultValue || '';
      });
      setFormValues(initial);
    }
  }, [activeTemplateId, selectedTemplate]);

  const handleInputChange = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAutofillPreset = () => {
    if (!selectedTemplate) return;
    const presets: Record<string, Record<string, any>> = {
      tpl_rental: {
        Landlord_Name: 'Adv. Suresh Oberoi',
        Tenant_Name: 'Karan Johar Enterprises',
        Property_Address: 'Penthouse 1201, Prestige Lakeside, Indiranagar, Bengaluru',
        Monthly_Rent: '85000',
        Security_Deposit: '510000',
        Lease_Start_Date: '2026-10-01',
        Notice_Period_Months: '3',
        Jurisdiction_City: 'Bengaluru'
      },
      tpl_nda: {
        Party_A_Name: 'Apex Legal Innovations',
        Party_B_Name: 'Quantum AI Systems LLC',
        Purpose: 'Technical diligence for patent licensing and core model deployment',
        Confidentiality_Years: '5',
        Effective_Date: new Date().toISOString().split('T')[0]
      }
    };

    const preset = presets[selectedTemplate.id];
    if (preset) {
      setFormValues(preset);
    } else {
      const filled: Record<string, any> = {};
      selectedTemplate.extractedVariables.forEach(v => {
        filled[v.key] = v.defaultValue || `Sample ${v.label}`;
      });
      setFormValues(filled);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !clientId || !matterId) {
      showToast('Please select a client and matter.', 'warning');
      return;
    }
    const doc = await generateDocument(
      selectedTemplate.id,
      clientId,
      matterId,
      formValues,
      priority,
      dueDate,
      selectedTaskId || undefined
    );
    if (doc) {
      setSelectedDocumentId(doc.id);
      setSelectedTaskId(null); // Clear selected task
      setActiveTab('document_editor');
    }
  };

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Document Creator</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• AI Compilation Engine</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Generator, <span className="font-normal font-sohne not-italic text-slate-400">Step-by-Step Draft Setup</span>
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 font-light max-w-xl">
            Select a template, populate client variables, and let LexDraft compile a customized draft agreement.
          </p>
        </div>

        {/* Wizard Progress - Capsule Pill Style */}
        <div className={`flex items-center p-0.5 rounded-full border shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-mist-gray/60 border-slate-200/60'
        }`}>
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
              step === 1 ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm' : 'text-slate-400'
            }`}
          >
            1. Template
          </button>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
              step === 2 ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm' : 'text-slate-400'
            }`}
          >
            2. Fields
          </button>
          <button
            onClick={() => setStep(3)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
              step === 3 ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black shadow-sm' : 'text-slate-400'
            }`}
          >
            3. Preview
          </button>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-ink-black dark:text-white">Choose Reusable Legal Template</h2>

          {/* ── House Rental Agreement Wizard Card (Featured) ── */}
          <div
            onClick={() => setActiveTab('house_rental_wizard')}
            className={`flex items-center gap-6 p-6 rounded-2xl border-2 border-blue-500/30 cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 ${
              isDark ? 'bg-blue-500/5' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
            }`}
          >
            <div className="text-4xl flex-shrink-0">🏠</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] tracking-wider text-blue-600 uppercase font-bold">Real Estate · Guided Wizard</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">NEW</span>
              </div>
              <h3 className="text-sm font-bold text-ink-black dark:text-paper-white">Residential House Rental Agreement</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                LawDepot-style step-by-step wizard for House Rental Agreements in India. Fully guided — covers term, rent, deposit, utilities, use of property, termination, and governing law with live preview.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/30">
                <Wand2 size={13} /> Start Wizard
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => {
                  setActiveTemplateId(tpl.id);
                  setSelectedTemplateId(tpl.id);
                  setStep(2);
                }}
                className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm ${
                  activeTemplateId === tpl.id
                    ? 'bg-mist-gray border-slate-300 dark:bg-slate-900 dark:border-slate-800'
                    : isDark ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] tracking-wider text-slate-400 uppercase font-semibold">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v{tpl.version}</span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink-black dark:text-paper-white">{tpl.name}</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed font-light">{tpl.description}</p>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span className="font-semibold">{tpl.extractedVariables.length} variable fields</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {step === 2 && selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 floating-artifact p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-ink-black dark:text-paper-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Configure Variable Values</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-light">{selectedTemplate.name}</p>
              </div>

              <button
                onClick={handleAutofillPreset}
                className="btn-ghost rounded-full text-[10px] font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-sienna-brown dark:text-blush-peach" />
                <span>Autofill Sample Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-[20px] bg-mist-gray/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client</label>
                <select
                  disabled={!!selectedTaskId}
                  value={clientId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setClientId(cId);
                    const matching = matters.filter(m => m.clientId === cId && m.status === 'active');
                    setMatterId(matching[0]?.id || '');
                  }}
                  className={`w-full input-composer text-xs py-2 ${selectedTaskId ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Matter</label>
                <select
                  disabled={!!selectedTaskId}
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className={`w-full input-composer text-xs py-2 ${selectedTaskId ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {matters.filter(m => m.clientId === clientId && m.status === 'active').map(m => (
                    <option key={m.id} value={m.id}>{m.title} ({m.matterCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full input-composer text-xs py-2 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full input-composer text-xs py-2 font-mono"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Variable Input Form</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTemplate.extractedVariables.map((v) => (
                  <div key={v.id} className={v.type === 'multiline' || v.type === 'address' ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-semibold flex items-center justify-between mb-1 text-slate-650 dark:text-slate-350">
                      <span>{v.label}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-light">&#123;&#123;{v.key}&#125;&#125;</span>
                    </label>

                    {v.type === 'multiline' ? (
                      <textarea
                        rows={3}
                        value={formValues[v.key] || ''}
                        onChange={(e) => handleInputChange(v.key, e.target.value)}
                        className="w-full input-composer text-xs h-16 resize-none"
                      />
                    ) : v.type === 'select' ? (
                      <select
                        value={formValues[v.key] || ''}
                        onChange={(e) => handleInputChange(v.key, e.target.value)}
                        className="w-full input-composer text-xs py-2"
                      >
                        {v.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={v.type === 'date' ? 'date' : v.type === 'number' || v.type === 'currency' ? 'number' : 'text'}
                        value={formValues[v.key] || ''}
                        onChange={(e) => handleInputChange(v.key, e.target.value)}
                        placeholder={v.label}
                        className="w-full input-composer text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="btn-ghost text-xs rounded-full cursor-pointer"
              >
                Change Template
              </button>

              <button
                onClick={() => setStep(3)}
                className="btn-filled text-xs rounded-full flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Preview Draft</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Summary column */}
          <div className="card-neutral h-fit space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Document Config</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
                <span className="text-slate-400 font-light">Template:</span>
                <span className="font-semibold text-ink-black dark:text-white">{selectedTemplate.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
                <span className="text-slate-400 font-light">Target Client:</span>
                <span className="font-semibold text-ink-black dark:text-white">{clients.find(c => c.id === clientId)?.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
                <span className="text-slate-400 font-light">Case Urgency:</span>
                <span className="font-semibold text-ink-black dark:text-white capitalize">{priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-light">Variables:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {Object.keys(formValues).length} of {selectedTemplate.extractedVariables.length} set
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && selectedTemplate && (
        <div className="floating-artifact p-6 space-y-6">
          <div className="flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-black dark:text-paper-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <span>Confirm & Generate Draft</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 font-light">Compiled preview content below</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setStep(2)}
                className="btn-ghost text-[11px] rounded-full cursor-pointer"
              >
                Back to Fields
              </button>
              <button
                onClick={handleGenerate}
                className="btn-filled text-[11px] rounded-full flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Generate Draft</span>
              </button>
            </div>
          </div>

          <div className="legal-document-paper max-w-3xl mx-auto shadow-2xl space-y-4">
            <div
              dangerouslySetInnerHTML={{
                __html: Object.entries(formValues).reduce((acc, [k, v]) => {
                  return acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), `<strong>${v || `[${k}]`}</strong>`);
                }, selectedTemplate.contentTemplate)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
