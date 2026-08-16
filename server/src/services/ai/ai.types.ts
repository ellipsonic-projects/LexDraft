// ─── AI Types ────────────────────────────────────────────────────────────────
// Central type definitions for the LexDraft AI Review Engine & Rewrite Assistant

export type AIProvider = 'groq' | 'gemini' | 'openai' | 'rule_based';
export type AIProviderStatus = 'GEMINI_OK' | 'GEMINI_QUOTA_EXHAUSTED' | 'GEMINI_ERROR' | 'RULE_BASED';

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

export type FindingType =
  | 'REQUIRED_LEGAL_ELEMENT'
  | 'MISSING_INFORMATION'
  | 'POTENTIAL_LEGAL_RISK'
  | 'DRAFTING_ISSUE'
  | 'GRAMMAR'
  | 'COMPLIANCE'
  | 'RECOMMENDATION';

export type RequirementType = 'REQUIRED' | 'RECOMMENDED' | 'POTENTIAL_RISK';

export type ExistenceState =
  | 'MISSING'
  | 'PRESENT'
  | 'PRESENT_BUT_INCOMPLETE'
  | 'PRESENT_BUT_AMBIGUOUS'
  | 'RECOMMENDED_ENHANCEMENT';

export interface FindingLocation {
  section?: string;
  clauseNumber?: string;
  paragraphIndex?: number;
  sourceText?: string;
  startOffset?: number;
  endOffset?: number;
  insertionAnchor?: string;
}

// ─── Finding ─────────────────────────────────────────────────────────────────

export interface AIFinding {
  id: string;
  category: FindingCategory;
  findingType?: FindingType;
  requirementType?: RequirementType;
  existenceState?: ExistenceState;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence?: string;
  textExcerpt?: string;
  recommendation?: string;
  suggestedClause?: string;
  location?: string;
  locationMeta?: FindingLocation;
  confidence?: number;
  source?: 'AI' | 'RULE' | 'BOTH';
  needsLegalReview?: boolean;
  reason?: string;

  // ── Grammar-Specific Actionable Fields ──────────────────────────────────────
  incorrectText?: string;
  problem?: string;
  correctedText?: string;
  explanation?: string;
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
  /** Force rerun review even if cached version exists */
  forceRerun?: boolean;
}

export interface DocumentReviewResponse {
  provider: AIProvider;
  /** The AI model name used, or "heuristic-v1" for rule_based */
  model: string;
  /** Provider status (GEMINI_OK | GEMINI_QUOTA_EXHAUSTED | GEMINI_ERROR | RULE_BASED) */
  status: AIProviderStatus;
  /** True if deterministic rule-based fallback was used */
  fallbackUsed: boolean;
  /** SHA-256 fingerprint of the normalized document text */
  fingerprint?: string;
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

// ─── Legal Basis & Statutory Citation ─────────────────────────────────────────

export interface LegalBasisItem {
  source: string;
  reference: string;
  relevance: string;
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
  /** Document type for prompt specialization (e.g. "Residential Rental Agreement") */
  documentType?: string;
  /** Jurisdiction for state-specific legal drafting (e.g. "Karnataka, India") */
  jurisdiction?: string;
  /** Current section title or clause header */
  sectionName?: string;
}

export interface RewriteResponse {
  provider: AIProvider;
  model: string;
  status: AIProviderStatus;
  fallbackUsed: boolean;
  action: RewriteAction;
  originalText: string;
  rewrittenText: string;
  /** Explanation of what changed and why in Indian legal drafting style */
  rationale: string;
  /** Statutory references and Indian legal authorities applied */
  legalBasis?: LegalBasisItem[];
  /** Legal cautions or statutory notices */
  warnings?: string[];
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
