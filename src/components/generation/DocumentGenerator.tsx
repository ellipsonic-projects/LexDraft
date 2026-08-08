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

  const handleGenerate = () => {
    if (!selectedTemplate || !clientId || !matterId) {
      showToast('Please select a client and matter.', 'warning');
      return;
    }
    const doc = generateDocument(
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
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Document Compilation Engine</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Generate Legal Document from Template
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Select a template, populate client metadata, and let LexDraft compile a customized legal draft in seconds.
          </p>
        </div>

        {/* Wizard Progress */}
        <div className={`flex items-center space-x-2 p-2 rounded-xl border shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 1 ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            1. Select Template
          </button>
          <span className="text-slate-400 text-xs">→</span>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 2 ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            2. Fill Variables
          </button>
          <span className="text-slate-400 text-xs">→</span>
          <button
            onClick={() => setStep(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 3 ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            3. Compile Preview
          </button>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className={`text-base font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Step 1: Choose Legal Template</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => {
                  setActiveTemplateId(tpl.id);
                  setSelectedTemplateId(tpl.id);
                  setStep(2);
                }}
                className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 shadow-xl ${
                  activeTemplateId === tpl.id
                    ? 'bg-blue-900/10 border-blue-800/60 ring-2 ring-blue-800/40'
                    : isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 uppercase">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-400">v{tpl.version}</span>
                </div>

                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                </div>

                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-500 font-medium">Extracted Fields:</span>
                  <span className="font-bold text-blue-900 dark:text-blue-400">{tpl.extractedVariables.length} Variables</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 rounded-2xl border p-6 shadow-xl space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div>
                <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <FileText className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>Step 2: Enter Variable Values ({selectedTemplate.name})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill dynamic form fields to customize this agreement</p>
              </div>

              <button
                onClick={handleAutofillPreset}
                className="px-3 py-1.5 bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 hover:bg-blue-900/20 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Autofill Sample Client Data</span>
              </button>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Client Name</label>
                <select
                  disabled={!!selectedTaskId}
                  value={clientId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setClientId(cId);
                    const matching = matters.filter(m => m.clientId === cId && m.status === 'active');
                    setMatterId(matching[0]?.id || '');
                  }}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 font-semibold ${
                    isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
                  } ${selectedTaskId ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Related Matter</label>
                <select
                  disabled={!!selectedTaskId}
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 font-semibold ${
                    isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
                  } ${selectedTaskId ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {matters.filter(m => m.clientId === clientId && m.status === 'active').map(m => (
                    <option key={m.id} value={m.id}>{m.title} ({m.matterCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 capitalize ${
                    isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
                  }`}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 font-mono ${
                    isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Template Variables Form</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTemplate.extractedVariables.map((v) => (
                  <div key={v.id} className={v.type === 'multiline' || v.type === 'address' ? 'sm:col-span-2' : ''}>
                    <label className={`text-xs font-semibold flex items-center justify-between mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <span>{v.label}</span>
                      <span className="text-[10px] font-mono text-blue-900 dark:text-blue-400 font-bold">&#123;&#123;{v.key}&#125;&#125;</span>
                    </label>

                    {v.type === 'multiline' ? (
                      <textarea
                        rows={3}
                        value={formValues[v.key] || ''}
                        onChange={(e) => handleInputChange(v.key, e.target.value)}
                        className={`w-full text-xs p-3 rounded-xl border focus:outline-none ${
                          isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
                        }`}
                      />
                    ) : v.type === 'select' ? (
                      <select
                        value={formValues[v.key] || ''}
                        onChange={(e) => handleInputChange(v.key, e.target.value)}
                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                          isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
                        }`}
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
                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                          isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex justify-between pt-4 border-t ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <button
                onClick={() => setStep(1)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                ← Change Template
              </button>

              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2"
              >
                <span>Preview Compiled Draft</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Document Summary</h3>

            <div className={`space-y-3 text-xs p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Template:</span>
                <span className="font-bold text-blue-900 dark:text-blue-400">{selectedTemplate.name}</span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Target Client:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{clients.find(c => c.id === clientId)?.name || 'Not set'}</span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Priority:</span>
                <span className="font-bold text-blue-900 dark:text-blue-400 capitalize">{priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Variables Filled:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Object.keys(formValues).length} of {selectedTemplate.extractedVariables.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && selectedTemplate && (
        <div className={`rounded-2xl border p-6 shadow-xl space-y-6 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <Sparkles className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                <span>Step 3: Confirm & Generate Legal Document</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Live compiled preview based on your variable inputs</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Back to Edit Fields
              </button>
              <button
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4 stroke-[2.5]" />
                <span>Generate & Open in Rich Editor</span>
              </button>
            </div>
          </div>

          <div className="legal-document-paper p-8 rounded-xl max-w-3xl mx-auto shadow-2xl space-y-4">
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
