// ─── AI Types ────────────────────────────────────────────────────────────────
// Central type definitions for the LexDraft AI Review Engine & Rewrite Assistant

export type AIProvider = 'gemini' | 'openai' | 'rule_based';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingCategory =
  | 'MISSING_CLAUSE'
  | 'HIGH_RISK'
  | 'COMPLIANCE'
  | 'GRAMMAR'
  | 'STRUCTURAL'
  | 'RECOMMENDATION';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type RewriteAction =
  | 'REWRITE_LEGALLY'
  | 'REWRITE_PROFESSIONALLY'
  | 'SIMPLIFY'
  | 'SUMMARIZE'
  | 'MAKE_DEFENSIBLE'
  | 'EXPAND'
  | 'SHORTEN'
  | 'IMPROVE_CLARITY'
  | 'IMPROVE_FORMALITY';

// ─── Finding ─────────────────────────────────────────────────────────────────

export interface AIFinding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  /** The exact text excerpt that triggered this finding (if available) */
  textExcerpt?: string;
  /** Suggested clause text to insert (for MISSING_CLAUSE findings) */
  suggestedClause?: string;
  /** Specific location in the document (e.g. "Section 3, Paragraph 2") */
  location?: string;
}

// ─── Risk Score ───────────────────────────────────────────────────────────────

export interface RiskScore {
  /** 0–100 numeric score. Higher = safer. */
  score: number;
  /** Derived from score thresholds */
  level: RiskLevel;
  /** How many findings of each severity were found */
  breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

// ─── Category Summary ─────────────────────────────────────────────────────────

export interface CategorySummary {
  category: FindingCategory;
  count: number;
  highestSeverity: FindingSeverity;
}

// ─── Review Request / Response ───────────────────────────────────────────────

export interface DocumentReviewRequest {
  documentId: string;
  documentVersionId: string;
  /** Raw text extracted from the document content for AI analysis */
  contentText: string;
  /** The document title for context */
  title: string;
  /** Document type (e.g. "Rental Agreement", "Employment Contract") */
  documentType?: string;
}

export interface DocumentReviewResponse {
  provider: AIProvider;
  /** The AI model name used, or "heuristic-v1" for rule_based */
  model: string;
  /** Executive summary of the overall document health */
  summary: string;
  riskScore: RiskScore;
  findings: AIFinding[];
  categories: CategorySummary[];
  /** AI confidence (0.0–1.0) — omitted for rule_based */
  confidence?: number;
  /** Label shown to users when fallback was used */
  providerLabel: string;
}

// ─── Rewrite Request / Response ───────────────────────────────────────────────

export interface RewriteRequest {
  documentId: string;
  documentVersionId: string;
  /** The highlighted text the user wants rewritten */
  selectedText: string;
  /** The rewrite mode requested */
  action: RewriteAction;
  /** Surrounding context for better AI understanding (optional, ±200 chars around selection) */
  context?: string;
  /** Document type for prompt specialization */
  documentType?: string;
}

export interface RewriteResponse {
  provider: AIProvider;
  model: string;
  action: RewriteAction;
  originalText: string;
  rewrittenText: string;
  /** Explanation of what changed and why */
  rationale: string;
  providerLabel: string;
  /** Whether the model flagged uncertainty and recommends legal review */
  needsLegalReview: boolean;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface IAIProvider {
  readonly provider: AIProvider;
  readonly model: string;
  reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse>;
  rewriteText(request: RewriteRequest): Promise<RewriteResponse>;
}
