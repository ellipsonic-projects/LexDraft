// ─── AI API Service (Frontend) ────────────────────────────────────────────────
// Calls /api/ai/review and /api/ai/rewrite on the LexDraft backend.

import { api } from './api';

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

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingCategory = 'MISSING_CLAUSE' | 'HIGH_RISK' | 'COMPLIANCE' | 'GRAMMAR' | 'STRUCTURAL' | 'RECOMMENDATION';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

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
}

export interface RiskScore {
  score: number;
  level: RiskLevel;
  breakdown: { critical: number; high: number; medium: number; low: number; info: number };
}

export interface CategorySummary {
  category: FindingCategory;
  count: number;
  highestSeverity: FindingSeverity;
}

export interface DocumentReviewResult {
  provider: string;
  model: string;
  summary: string;
  riskScore: RiskScore;
  findings: AIFinding[];
  categories: CategorySummary[];
  confidence?: number;
  providerLabel: string;
}

export interface LegalBasisItem {
  source: string;
  reference: string;
  relevance: string;
}

export interface RewriteResult {
  provider: string;
  model: string;
  action: RewriteAction;
  originalText: string;
  rewrittenText: string;
  rationale: string;
  legalBasis?: LegalBasisItem[];
  warnings?: string[];
  providerLabel: string;
  needsLegalReview: boolean;
}

export const aiService = {
  /**
   * Trigger an AI review of a specific document version.
   */
  reviewDocument: async (
    documentId: string,
    documentVersionId: string
  ): Promise<DocumentReviewResult> => {
    const response = await api.request('/ai/review', {
      method: 'POST',
      body: JSON.stringify({ documentId, documentVersionId }),
    });
    return response.data.review as DocumentReviewResult;
  },

  /**
   * Get the last persisted review for a document version (if any).
   */
  getReview: async (
    documentId: string,
    versionId: string
  ): Promise<DocumentReviewResult | null> => {
    try {
      const response = await api.request(`/ai/review/${documentId}/${versionId}`, { method: 'GET' });
      return response.data.review as DocumentReviewResult;
    } catch {
      return null;
    }
  },

  /**
   * Trigger an AI-powered rewrite of selected text.
   */
  rewriteText: async (
    documentId: string,
    documentVersionId: string,
    selectedText: string,
    action: RewriteAction,
    context?: string
  ): Promise<RewriteResult> => {
    const response = await api.request('/ai/rewrite', {
      method: 'POST',
      body: JSON.stringify({ documentId, documentVersionId, selectedText, action, context }),
    });
    return response.data.rewrite as RewriteResult;
  },

  /**
   * Log that the user accepted and applied a rewrite.
   * Call after saveDocumentDraft succeeds.
   */
  logRewriteAccepted: async (
    documentId: string,
    action: RewriteAction,
    documentTitle: string
  ): Promise<void> => {
    await api.request('/ai/rewrite/accepted', {
      method: 'POST',
      body: JSON.stringify({ documentId, action, documentTitle }),
    });
  },
};
