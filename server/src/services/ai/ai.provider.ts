// ─── AI Provider Abstraction ───────────────────────────────────────────────────
// Implements Gemini, OpenAI, and DeterministicRule providers + factory.

import {
  AIFinding,
  AIProvider,
  CategorySummary,
  DocumentReviewRequest,
  DocumentReviewResponse,
  FindingCategory,
  IAIProvider,
  RewriteAction,
  RewriteRequest,
  RewriteResponse,
} from './ai.types';
import { calculateRiskScore, detectMissingMandatorySections } from './ai.risk.service';
import { getIndianLegalContext } from './indianLegalContext';

// ─── UUID generation using Node built-in crypto ───────────────────────────────
import { randomUUID } from 'crypto';
function newId(): string {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

class GeminiAIProvider implements IAIProvider {
  readonly provider: AIProvider = 'gemini';
  readonly model = 'gemini-3.6-flash';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
    try {
      const prompt = buildReviewPrompt(request);
      const raw = await this.callGemini(prompt);
      const review = parseReviewJSON(raw, this.provider, this.model, request.contentText);
      review.status = 'GEMINI_OK';
      review.fallbackUsed = false;
      review.providerLabel = 'Powered by Google Gemini';
      return review;
    } catch (err: any) {
      const isQuotaExhausted = err.message.includes('PerDay') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('429');
      const status = isQuotaExhausted ? 'GEMINI_QUOTA_EXHAUSTED' : 'GEMINI_ERROR';
      const label = isQuotaExhausted
        ? 'Gemini daily quota exhausted. Rule-based analysis is being used until the quota resets.'
        : 'Rule-based analysis — AI provider error';

      console.warn(`[Gemini] Review failed (${status}: ${err.message}). Falling back to DeterministicRuleProvider.`);
      return new DeterministicRuleProvider(status, label).reviewDocument(request);
    }
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[AI REWRITE DIAGNOSTIC] timestamp=${timestamp}, provider=gemini, model=${this.model}, action=${request.action}, selectedChars=${request.selectedText.length}`);
      
      const prompt = buildRewritePrompt(request);
      const raw = await this.callGemini(prompt);
      let rewrite = parseRewriteJSON(raw, this.provider, this.model, request);

      // Check if response is identical to original text
      if (rewrite.rewrittenText.trim().toLowerCase() === request.selectedText.trim().toLowerCase()) {
        console.warn(`[GeminiAIProvider] Response identical to original text for action ${request.action}. Retrying with corrective prompt...`);
        const retryPrompt = `${prompt}\n\nCRITICAL CORRECTION REQUIRED:\nYour previous response produced text identical to the original input. You MUST produce a genuine, material transformation according to the action "${request.action}". The suggestedText MUST be visibly and structurally different from originalText while preserving all factual parameters (names, dates, amounts).`;
        
        const retryRaw = await this.callGemini(retryPrompt);
        rewrite = parseRewriteJSON(retryRaw, this.provider, this.model, request);
      }

      rewrite.status = rewrite.rewrittenText.trim().toLowerCase() === request.selectedText.trim().toLowerCase()
        ? 'NO_MEANINGFUL_TRANSFORMATION'
        : 'GEMINI_OK';
      rewrite.fallbackUsed = false;
      rewrite.providerLabel = 'Powered by Google Gemini';

      console.log(`[AI REWRITE DIAGNOSTIC] timestamp=${timestamp}, provider=gemini, model=${this.model}, status=SUCCESS, outputLen=${rewrite.rewrittenText.length}`);
      return rewrite;
    } catch (err: any) {
      console.warn(`[AI REWRITE DIAGNOSTIC] timestamp=${timestamp}, provider=gemini, model=${this.model}, status=FAILED, error=${err.message}`);
      const isQuotaExhausted = err.message.includes('PerDay') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('429');
      const status = isQuotaExhausted ? 'GEMINI_QUOTA_EXHAUSTED' : 'GEMINI_ERROR';
      const label = isQuotaExhausted
        ? 'Gemini daily quota exhausted. Rule-based analysis is being used until the quota resets.'
        : 'Rule-based analysis — AI provider error';

      console.warn(`[Gemini] Rewrite failed (${status}: ${err.message}). Falling back to DeterministicRuleProvider.`);
      return new DeterministicRuleProvider(status, label).rewriteText(request);
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) return text;
    }

    const lastError = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${lastError}`);
  }
}

// ─── OpenAI Provider ─────────────────────────────────────────────────────────

class OpenAIProvider implements IAIProvider {
  readonly provider: AIProvider = 'openai';
  readonly model = 'gpt-4o-mini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
    try {
      const prompt = buildReviewPrompt(request);
      const raw = await this.callOpenAI(prompt);
      const review = parseReviewJSON(raw, this.provider, this.model, request.contentText);
      review.status = 'GEMINI_OK';
      review.fallbackUsed = false;
      return review;
    } catch (err: any) {
      console.warn(`OpenAI review failed (${err.message}). Falling back to DeterministicRuleProvider.`);
      return new DeterministicRuleProvider('RULE_BASED', 'Rule-based analysis — OpenAI provider error').reviewDocument(request);
    }
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    try {
      const prompt = buildRewritePrompt(request);
      const raw = await this.callOpenAI(prompt);
      const rewrite = parseRewriteJSON(raw, this.provider, this.model, request);
      rewrite.status = 'GEMINI_OK';
      rewrite.fallbackUsed = false;
      return rewrite;
    } catch (err: any) {
      console.warn(`OpenAI rewrite failed (${err.message}). Falling back to DeterministicRuleProvider.`);
      return new DeterministicRuleProvider('RULE_BASED', 'Rule-based analysis — OpenAI provider error').rewriteText(request);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a senior legal document analyst. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json() as any;
    return data?.choices?.[0]?.message?.content ?? '';
  }
}

// ─── Deterministic Rule-Based Provider ───────────────────────────────────────

class DeterministicRuleProvider implements IAIProvider {
  readonly provider: AIProvider = 'rule_based';
  readonly model = 'heuristic-v1';
  private customStatus: any;
  private customLabel: string;

  constructor(status: any = 'RULE_BASED', label = 'Rule-based analysis — AI provider unavailable') {
    this.customStatus = status;
    this.customLabel = label;
  }

  async reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
    const text = request.contentText;
    const findings = detectMissingMandatorySections(text);

    // Grammar & structural checks
    const checks: Array<{ test: RegExp | boolean; category: FindingCategory; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'; title: string; desc: string }> = [
      {
        test: /\[.*?\]|<<.*?>>|_____+|PLACEHOLDER|INSERT HERE/i.test(text),
        category: 'STRUCTURAL',
        severity: 'HIGH',
        title: 'Unfilled Placeholders Detected',
        desc: 'The document contains one or more placeholder values (e.g. [Party Name], <<Date>>) that have not been filled in. This must be resolved before the document is legally valid.',
      },
      {
        test: !/\d{4}/.test(text),
        category: 'STRUCTURAL',
        severity: 'MEDIUM',
        title: 'No Year/Date Reference Found',
        desc: 'No year or date reference was found in the document. Effective dates are critical for legal enforceability.',
      },
      {
        test: !/party|parties|between|agreement|contract/i.test(text),
        category: 'STRUCTURAL',
        severity: 'HIGH',
        title: 'Missing Party Identification',
        desc: 'The document does not clearly identify the contracting parties. All legal agreements must explicitly name the parties involved.',
      },
      {
        test: /notwithstanding|hereinafter|whereas|witnesseth|hereto/i.test(text) &&
              !/plain\s*language|simple\s*english/i.test(text),
        category: 'COMPLIANCE',
        severity: 'LOW',
        title: 'Archaic Legal Language Detected',
        desc: 'The document contains archaic legal language. While legally valid, modern plain-language drafting reduces misinterpretation risk.',
      },
      {
        test: text.length < 500,
        category: 'STRUCTURAL',
        severity: 'MEDIUM',
        title: 'Document Is Unusually Short',
        desc: 'The document content is very short. A comprehensive legal agreement typically includes multiple clauses and sections.',
      },
    ];

    for (const check of checks) {
      if (check.test) {
        findings.push({
          id: newId(),
          category: check.category,
          severity: check.severity,
          title: check.title,
          description: check.desc,
        });
      }
    }

    const riskScore = calculateRiskScore(findings, text);
    const categories = buildCategorySummary(findings);

    return {
      provider: this.provider,
      model: this.model,
      status: this.customStatus,
      fallbackUsed: true,
      summary: `Rule-based analysis detected ${findings.length} issue(s). This is a deterministic structural scan — not AI legal reasoning. A qualified legal professional should review this document.`,
      riskScore,
      findings,
      categories,
      providerLabel: this.customLabel,
    };
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    const indianContext = getIndianLegalContext(request.documentType, request.jurisdiction, request.sectionName);

    // Apply rule-based legal transformations for fallback
    let fallbackText = request.selectedText;
    if (request.action === 'REWRITE_LEGALLY' || request.action === 'IMPROVE_FORMALITY' || request.action === 'REWRITE_PROFESSIONALLY') {
      fallbackText = fallbackText
        .replace(/\blandlord\b/gi, 'Lessor')
        .replace(/\btenant\b/gi, 'Lessee')
        .replace(/\bhouse|apartment|flat|property\b/gi, 'Demised Premises')
        .replace(/\bcan leave\b/gi, 'may terminate this Lease by serving 30 (thirty) days written notice')
        .replace(/\bevery month\b/gi, 'in advance on or before the 5th day of each calendar month')
        .replace(/\btalk out any issues before going to court\b/gi, 'attempt amicable resolution through good-faith negotiations prior to initiating legal proceedings')
        .replace(/\brent\b/gi, 'Monthly Rent');
    } else if (request.action === 'SIMPLIFY' || request.action === 'IMPROVE_CLARITY') {
      fallbackText = fallbackText
        .replace(/notwithstanding anything hereinbefore contained to the contrary,?/gi, 'Despite anything else in this agreement,')
        .replace(/yield up/gi, 'vacate and return')
        .replace(/demised premises/gi, 'leased property')
        .replace(/whoever lives in the house when due or else penalties apply/gi, 'the occupying Tenant on or before the due date, failing which statutory late fees shall apply');
    } else if (request.action === 'SUMMARIZE' || request.action === 'SHORTEN') {
      const sentences = fallbackText.split(/\.\s+/);
      fallbackText = sentences[0] ? `${sentences[0]}.` : fallbackText;
    } else if (request.action === 'EXPAND' || request.action === 'MAKE_DEFENSIBLE') {
      fallbackText = `${fallbackText} The parties hereto explicitly agree that all rights and liabilities under this clause shall be governed by the laws of India and subject to the exclusive jurisdiction of courts at ${indianContext.detectedJurisdiction}.`;
    }

    return {
      provider: this.provider,
      model: this.model,
      status: this.customStatus,
      fallbackUsed: true,
      action: request.action,
      originalText: request.selectedText,
      rewrittenText: fallbackText,
      rationale: `${this.customLabel}. Standard Indian legal rule-based transformation applied.`,
      legalBasis: indianContext.framework.keyStatutes.map(s => ({
        source: s.source,
        reference: s.reference,
        relevance: s.summary
      })),
      warnings: ['Quota limit reached or AI provider unavailable — Rule-based fallback utilized.'],
      providerLabel: this.customLabel,
    };
  }
}

// ─── Groq AI Provider ─────────────────────────────────────────────────────────

class GroqProvider implements IAIProvider {
  readonly provider: AIProvider = 'groq';
  readonly model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, action=REVIEW, chars=${request.contentText.length}, status=EXECUTING`);
      const prompt = buildReviewPrompt(request);
      const raw = await this.callGroq(prompt);
      const review = parseReviewJSON(raw, this.provider, this.model, request.contentText);
      review.status = 'GEMINI_OK';
      review.fallbackUsed = false;
      review.providerLabel = 'Powered by Groq (Llama 3.3 70B)';
      console.log(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, status=SUCCESS`);
      return review;
    } catch (err: any) {
      console.warn(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, status=FAILED, error=${err.message}`);
      
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey && geminiKey.trim() !== '') {
        console.warn(`[GroqProvider] Falling back to GeminiAIProvider...`);
        return new GeminiAIProvider(geminiKey.trim()).reviewDocument(request);
      }

      return new DeterministicRuleProvider('GEMINI_ERROR', 'Rule-based analysis — Groq provider error').reviewDocument(request);
    }
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, action=${request.action}, chars=${request.selectedText.length}, status=EXECUTING`);
      const prompt = buildRewritePrompt(request);
      const raw = await this.callGroq(prompt);
      let rewrite = parseRewriteJSON(raw, this.provider, this.model, request);

      // Check if response is identical to original text
      if (rewrite.rewrittenText.trim().toLowerCase() === request.selectedText.trim().toLowerCase()) {
        console.warn(`[GroqProvider] Response identical for action ${request.action}. Retrying with corrective prompt...`);
        const retryPrompt = `${prompt}\n\nCRITICAL CORRECTION REQUIRED:\nYour previous response produced text identical to the original input. You MUST produce a genuine, material transformation according to the action "${request.action}". The suggestedText MUST be visibly and structurally different from originalText while preserving all factual parameters (names, dates, amounts).`;
        const retryRaw = await this.callGroq(retryPrompt);
        rewrite = parseRewriteJSON(retryRaw, this.provider, this.model, request);
      }

      rewrite.status = rewrite.rewrittenText.trim().toLowerCase() === request.selectedText.trim().toLowerCase()
        ? 'NO_MEANINGFUL_TRANSFORMATION'
        : 'GEMINI_OK';
      rewrite.fallbackUsed = false;
      rewrite.providerLabel = 'Powered by Groq (Llama 3.3 70B)';
      console.log(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, status=SUCCESS, outputLen=${rewrite.rewrittenText.length}`);
      return rewrite;
    } catch (err: any) {
      console.warn(`[AI PROVIDER] timestamp=${timestamp}, provider=groq, model=${this.model}, status=FAILED, error=${err.message}`);
      
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey && geminiKey.trim() !== '') {
        console.warn(`[GroqProvider] Falling back to GeminiAIProvider...`);
        return new GeminiAIProvider(geminiKey.trim()).rewriteText(request);
      }

      return new DeterministicRuleProvider('GEMINI_ERROR', 'Rule-based analysis — Groq provider error').rewriteText(request);
    }
  }

  private async callGroq(prompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a Senior Principal Indian Legal Counsel and Master Legal Draftsman. Always respond with raw valid JSON matching the requested schema.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as any;
    return data?.choices?.[0]?.message?.content ?? '';
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

let _cachedProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (_cachedProvider) return _cachedProvider;

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (groqKey && groqKey.trim() !== '') {
    console.log('[AI] Selected Primary Provider: Groq (GROQ_API_KEY)');
    _cachedProvider = new GroqProvider(groqKey.trim());
  } else if (geminiKey && geminiKey.trim() !== '') {
    console.log('[AI] Selected Primary Provider: Google Gemini (GEMINI_API_KEY)');
    _cachedProvider = new GeminiAIProvider(geminiKey.trim());
  } else if (openaiKey && openaiKey.trim() !== '') {
    console.log('[AI] Selected Primary Provider: OpenAI (OPENAI_API_KEY)');
    _cachedProvider = new OpenAIProvider(openaiKey.trim());
  } else {
    console.warn('[AI] No AI API key configured. Selected Primary Provider: Deterministic Rule-Based Fallback');
    _cachedProvider = new DeterministicRuleProvider();
  }

  return _cachedProvider;
}

/** Force a new provider on next call (useful after env change in tests) */
export function resetProviderCache() {
  _cachedProvider = null;
}

// ─── Shared Prompt Builders ───────────────────────────────────────────────────

function buildReviewPrompt(request: DocumentReviewRequest): string {
  const docType = request.documentType || 'Legal Agreement';
  // Limit content to 8000 chars to avoid token overflow
  const content = request.contentText.slice(0, 8000);

  return `You are a senior legal document analyst at a top-tier law firm. Analyze the following ${docType} and identify legal risks, missing clauses, compliance issues, and grammar problems.

DOCUMENT TITLE: ${request.title}
DOCUMENT CONTENT:
---
${content}
---

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact schema:
{
  "summary": "Executive summary of document health (2-3 sentences)",
  "confidence": 0.85,
  "findings": [
    {
      "id": "unique-id-1",
      "category": "MISSING_CLAUSE | HIGH_RISK | COMPLIANCE | GRAMMAR | STRUCTURAL | RECOMMENDATION",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "title": "Short title",
      "description": "Detailed explanation of the issue and its legal implications",
      "textExcerpt": "exact text from document that triggered this (optional)",
      "suggestedClause": "HTML clause to insert (only for MISSING_CLAUSE findings)",
      "location": "Section or clause location if determinable (optional)"
    }
  ]
}

RULES:
1. Do NOT invent statutes, case numbers, or unverified legal facts. If uncertain, mark needsLegalReview.
2. If a critical component (termination, dispute resolution, execution block) is missing, flag it as MISSING_CLAUSE severity HIGH or CRITICAL.
3. Categories: MISSING_CLAUSE for absent required clauses; HIGH_RISK for dangerous provisions; COMPLIANCE for regulatory issues; GRAMMAR for language errors; STRUCTURAL for formatting/organization issues; RECOMMENDATION for improvements.
4. Limit findings to the most important 15 issues maximum.
5. Return only valid JSON. Do not wrap in markdown code fences.`;
}

function buildRewritePrompt(request: RewriteRequest): string {
  const actionInstructions: Record<RewriteAction, string> = {
    REWRITE_LEGALLY: 'Your task is to REWRITE LEGALLY: Convert the selected text into authoritative formal Indian legal drafting using standard statutory phrasing (e.g., Transfer of Property Act 1882, Indian Contract Act 1872 standards). Use precise Indian legal terms such as "Lessor", "Lessee", "Demised Premises", "covenants", "hereby demises and leases", "yield and paying", "indemnify and hold harmless".',

    REWRITE_PROFESSIONALLY: 'Your task is to REWRITE PROFESSIONALLY: Upgrade the selected text into formal, polished corporate and legal business language. Eliminate colloquialisms, informal phrasing, and casual tone while elevating executive tone.',

    SIMPLIFY: 'Your task is to SIMPLIFY: Rewrite the selected text into clear, modern plain-English legal phrasing. Remove archaic legalese, convoluted sentence structures, and multi-clause complexity while preserving full enforceability.',

    SUMMARIZE: 'Your task is to SUMMARIZE: Produce a substantially shorter version (1 to 2 concise sentences maximum) containing ONLY the core legal obligation or right.',

    MAKE_DEFENSIBLE: 'Your task is to MAKE DEFENSIBLE: Strengthen the clause to make it highly defensible against legal challenges in Indian courts. Remove ambiguities, close potential contractual loopholes, and add clear standard of care / notice mechanics.',

    EXPAND: 'Your task is to EXPAND: Provide comprehensive legal detail and operational completeness. Add explicit timelines, written notice requirements, remedies upon breach, duty to mitigate, and governing statutory safeguards.',

    SHORTEN: 'Your task is to SHORTEN: Make the selected text materially more concise by reducing word count by at least 30-50% while strictly retaining all core legal rights and liabilities.',

    IMPROVE_CLARITY: 'Your task is to IMPROVE CLARITY: Re-structure sentence mechanics and layout to eliminate any vagueness or ambiguous interpretations.',

    IMPROVE_FORMALITY: 'Your task is to IMPROVE FORMALITY: Increase the formal legal register and traditional Indian legal document tone.',
  };

  const indianContext = getIndianLegalContext(request.documentType, request.jurisdiction, request.sectionName);

  const contextStr = request.context ? `\nSURROUNDING CONTEXT:\n${request.context}` : '';
  const sectionStr = request.sectionName ? `\nCURRENT SECTION: ${request.sectionName}` : '';

  return `You are a Senior Principal Indian Legal Counsel and Master Legal Draftsman.

${actionInstructions[request.action]}

DOCUMENT DETAILS:
- Category / Type: ${indianContext.documentCategory} (${request.documentType || 'Legal Agreement'})
- Jurisdiction: ${indianContext.detectedJurisdiction}${sectionStr}

APPLICABLE STATUTORY FRAMEWORK & INDIAN DRAFTING GUIDANCE:
- Governing Statutes: ${indianContext.framework.governingLaws.join('; ')}
- Statutory References: ${indianContext.framework.keyStatutes.map(s => `${s.source} (${s.reference}): ${s.summary}`).join(' | ')}
- Drafting Conventions: ${indianContext.framework.draftingConventions.join('; ')}

ORIGINAL SELECTED TEXT TO REWRITE:
---
${request.selectedText}
---${contextStr}

Respond with ONLY a valid JSON object matching this schema exactly:
{
  "suggestedText": "The transformed rewritten text according to requested action (${request.action})",
  "rationale": "Clear explanation of legal and stylistic improvements made",
  "legalBasis": [
    {
      "source": "Exact Statutory Act or legal authority (e.g. Indian Contract Act, 1872)",
      "reference": "Exact Section (e.g. Section 73)",
      "relevance": "Why this authority applies to the rewrite"
    }
  ],
  "warnings": [
    "Any statutory warning or legal caveat"
  ],
  "needsLegalReview": false
}

CRITICAL RULES:
1. MANDATORY TRANSFORMATION: You MUST produce a genuine, material transformation of the selected text according to requested action (${request.action}). Do NOT return the original text back unchanged.
2. PRESERVE FACTS: Preserve all defined party names, property addresses, monetary amounts, dates, and core factual parameters.
3. PRESERVE INTENT: Maintain the underlying legal intent unless the action explicitly specifies expansion or summarization.
4. NO HALLUCINATIONS: If no specific statutory section applies directly, return [] for legalBasis. Do NOT fabricate acts or sections.
5. RAW JSON ONLY: Return ONLY the valid JSON object. No markdown code blocks, no text before or after.`;
}

// ─── JSON Response Parsers ────────────────────────────────────────────────────

function extractJSON(raw: string): any {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Try extracting JSON from within the text
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response as JSON');
  }
}

function parseReviewJSON(
  raw: string,
  provider: AIProvider,
  model: string,
  contentText: string
): DocumentReviewResponse {
  let parsed: any;
  const providerLabels: Record<AIProvider, string> = {
    groq: 'Powered by Groq (Llama 3.3 70B)',
    gemini: 'Powered by Google Gemini',
    openai: 'Powered by OpenAI GPT',
    rule_based: 'Rule-based analysis — AI provider unavailable',
  };

  try {
    parsed = extractJSON(raw);
  } catch {
    console.warn('[AIProvider] Unprocessable JSON response from review provider');
    return new DeterministicRuleProvider('GEMINI_ERROR', providerLabels[provider]).reviewDocument({
      title: 'Document Review',
      contentText,
    });
  }

  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings: AIFinding[] = rawFindings.map((f: any) => ({
    id: f.id || newId(),
    category: f.category || 'RECOMMENDATION',
    severity: f.severity || 'MEDIUM',
    title: f.title || 'Legal Observation',
    description: f.description || '',
    textExcerpt: f.textExcerpt || undefined,
    suggestedClause: f.suggestedClause || undefined,
    location: f.location || undefined,
  }));

  const riskScore = calculateRiskScore(findings, contentText);
  const categories = buildCategorySummary(findings);

  return {
    provider,
    model,
    status: 'GEMINI_OK',
    fallbackUsed: false,
    summary: parsed.summary || 'AI analysis complete.',
    riskScore,
    findings,
    categories,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    providerLabel: providerLabels[provider],
  };
}

function parseRewriteJSON(
  raw: string,
  provider: AIProvider,
  model: string,
  request: RewriteRequest
): RewriteResponse {
  let parsed: any;
  const providerLabels: Record<AIProvider, string> = {
    groq: 'Powered by Groq (Llama 3.3 70B)',
    gemini: 'Powered by Google Gemini',
    openai: 'Powered by OpenAI GPT',
    rule_based: 'Rule-based analysis — AI provider unavailable',
  };

  try {
    parsed = extractJSON(raw);
  } catch {
    const indianContext = getIndianLegalContext(request.documentType, request.jurisdiction, request.sectionName);
    return {
      provider,
      model,
      status: 'GEMINI_ERROR',
      fallbackUsed: true,
      action: request.action,
      originalText: request.selectedText,
      rewrittenText: request.selectedText,
      rationale: 'AI returned an unprocessable response. The original text has been preserved.',
      providerLabel: providerLabels[provider],
      needsLegalReview: true,
    };
  }

  const rewrittenText = (parsed.suggestedText || parsed.rewrittenText || '').trim();
  const legalBasis = Array.isArray(parsed.legalBasis)
    ? parsed.legalBasis.filter((b: any) => b && b.source && b.reference)
    : [];
  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((w: any) => typeof w === 'string')
    : [];

  return {
    provider,
    model,
    status: rewrittenText.toLowerCase() === request.selectedText.trim().toLowerCase()
      ? 'NO_MEANINGFUL_TRANSFORMATION'
      : 'GEMINI_OK',
    fallbackUsed: false,
    action: request.action,
    originalText: request.selectedText,
    rewrittenText: rewrittenText || request.selectedText,
    rationale: parsed.rationale || 'Rewritten according to requested action and Indian legal drafting conventions.',
    legalBasis,
    warnings,
    providerLabel: providerLabels[provider],
    needsLegalReview: Boolean(parsed.needsLegalReview ?? false),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function buildCategorySummary(findings: AIFinding[]): CategorySummary[] {
  const severityOrder: Record<string, number> = {
    CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1,
  };

  const map = new Map<string, CategorySummary>();
  for (const f of findings) {
    const existing = map.get(f.category);
    if (!existing) {
      map.set(f.category, { category: f.category, count: 1, highestSeverity: f.severity });
    } else {
      existing.count++;
      if ((severityOrder[f.severity] || 0) > (severityOrder[existing.highestSeverity] || 0)) {
        existing.highestSeverity = f.severity;
      }
    }
  }
  return Array.from(map.values());
}
