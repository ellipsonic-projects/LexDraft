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
  readonly model = 'gemini-1.5-flash';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
    const prompt = buildReviewPrompt(request);
    const raw = await this.callGemini(prompt);
    return parseReviewJSON(raw, this.provider, this.model, request.contentText);
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    const prompt = buildRewritePrompt(request);
    const raw = await this.callGemini(prompt);
    return parseRewriteJSON(raw, this.provider, this.model, request);
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${err}`);
    }

    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text;
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
    const prompt = buildReviewPrompt(request);
    const raw = await this.callOpenAI(prompt);
    return parseReviewJSON(raw, this.provider, this.model, request.contentText);
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    const prompt = buildRewritePrompt(request);
    const raw = await this.callOpenAI(prompt);
    return parseRewriteJSON(raw, this.provider, this.model, request);
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
      summary: `Rule-based analysis detected ${findings.length} issue(s). This is a deterministic structural scan — not AI legal reasoning. A qualified legal professional should review this document.`,
      riskScore,
      findings,
      categories,
      providerLabel: 'Rule-based analysis — AI provider unavailable',
    };
  }

  async rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
    return {
      provider: this.provider,
      model: this.model,
      action: request.action,
      originalText: request.selectedText,
      rewrittenText: request.selectedText,
      rationale:
        'AI provider is not configured. Rule-based rewrite is not available. Please configure GEMINI_API_KEY or OPENAI_API_KEY on the server to enable AI-powered rewrites.',
      providerLabel: 'Rule-based analysis — AI provider unavailable',
      needsLegalReview: true,
    };
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

let _cachedProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (_cachedProvider) return _cachedProvider;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey.trim() !== '') {
    console.log('[AI] Using Gemini provider');
    _cachedProvider = new GeminiAIProvider(geminiKey.trim());
  } else if (openaiKey && openaiKey.trim() !== '') {
    console.log('[AI] Using OpenAI provider');
    _cachedProvider = new OpenAIProvider(openaiKey.trim());
  } else {
    console.warn('[AI] No AI API key configured. Using deterministic rule-based fallback.');
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
  const actionDescriptions: Record<RewriteAction, string> = {
    REWRITE_LEGALLY: 'Rewrite using precise, enforceable legal language suitable for a formal legal agreement',
    REWRITE_PROFESSIONALLY: 'Rewrite in formal, professional business language while preserving legal meaning',
    SIMPLIFY: 'Simplify into plain English while preserving all legal obligations and meaning',
    SUMMARIZE: 'Summarize the key legal points of this section in 2-3 concise sentences',
    MAKE_DEFENSIBLE: 'Strengthen this clause to be more legally defensible and harder to challenge',
    EXPAND: 'Expand this clause with more specific detail, conditions, and legal protections',
    SHORTEN: 'Shorten this clause to its essential legal requirements while keeping enforceability',
    IMPROVE_CLARITY: 'Improve clarity by removing ambiguity and making obligations more specific',
    IMPROVE_FORMALITY: 'Increase the formal legal register and professional tone of this text',
  };

  const instruction = actionDescriptions[request.action];
  const context = request.context ? `\n\nSURROUNDING CONTEXT:\n${request.context}` : '';
  const docType = request.documentType || 'Legal Agreement';

  return `You are a senior legal drafting expert. Your task: ${instruction}.

DOCUMENT TYPE: ${docType}
SELECTED TEXT:
---
${request.selectedText}
---${context}

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "rewrittenText": "The rewritten text here",
  "rationale": "1-2 sentence explanation of key changes made and why",
  "needsLegalReview": false
}

CRITICAL RULES:
1. Do NOT invent statutes, jurisdiction-specific laws, or legal citations you are not certain about.
2. If you are uncertain about any legal facts, set needsLegalReview to true.
3. Preserve all defined terms, party names, and specific legal obligations from the original.
4. Return only the JSON object. No markdown code fences.
5. If the action is SUMMARIZE, the rewrittenText should be a clean summary paragraph.
6. Output plain text (not HTML) for the rewrittenText — the frontend will handle formatting.`;
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
  try {
    parsed = extractJSON(raw);
  } catch {
    console.error('[AI] Failed to parse review response, falling back to rule-based:', raw.slice(0, 200));
    const fallback = new DeterministicRuleProvider();
    return fallback.reviewDocument({
      documentId: '',
      documentVersionId: '',
      contentText,
      title: '',
    }) as any;
  }

  const findings = (parsed.findings || []).map((f: any, i: number) => ({
    id: f.id || `finding-${i}`,
    category: f.category || 'STRUCTURAL',
    severity: f.severity || 'LOW',
    title: f.title || 'Issue Found',
    description: f.description || '',
    textExcerpt: f.textExcerpt,
    suggestedClause: f.suggestedClause,
    location: f.location,
  }));

  const riskScore = calculateRiskScore(findings, contentText);
  const categories = buildCategorySummary(findings);

  const providerLabels: Record<AIProvider, string> = {
    gemini: 'Powered by Google Gemini',
    openai: 'Powered by OpenAI GPT',
    rule_based: 'Rule-based analysis — AI provider unavailable',
  };

  return {
    provider,
    model,
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
    gemini: 'Powered by Google Gemini',
    openai: 'Powered by OpenAI GPT',
    rule_based: 'Rule-based analysis — AI provider unavailable',
  };

  try {
    parsed = extractJSON(raw);
  } catch {
    return {
      provider,
      model,
      action: request.action,
      originalText: request.selectedText,
      rewrittenText: request.selectedText,
      rationale: 'AI returned an unprocessable response. The original text has been preserved.',
      providerLabel: providerLabels[provider],
      needsLegalReview: true,
    };
  }

  return {
    provider,
    model,
    action: request.action,
    originalText: request.selectedText,
    rewrittenText: parsed.rewrittenText || request.selectedText,
    rationale: parsed.rationale || '',
    providerLabel: providerLabels[provider],
    needsLegalReview: parsed.needsLegalReview === true,
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
