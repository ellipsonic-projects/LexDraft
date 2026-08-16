// ─── AI Review Service ────────────────────────────────────────────────────────
// Orchestrates the full document review flow: auth → provider → score → persist → audit

import { prisma } from '../../lib/prisma';
import { getAIProvider } from './ai.provider';
import { DocumentReviewRequest, DocumentReviewResponse } from './ai.types';

export interface StartReviewOptions {
  documentId: string;
  documentVersionId: string;
  userId: string;
  organizationId: string;
}

/**
 * Run a full AI review for a document version.
 * Persists the result to DocumentReview and logs to ActivityLog.
 */
export async function runDocumentReview(options: StartReviewOptions): Promise<DocumentReviewResponse> {
  const { documentId, documentVersionId, userId, organizationId } = options;

  // ── 1. Validate document access ──────────────────────────────────────────
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    select: { id: true, title: true, content: true },
  });

  if (!doc) {
    throw Object.assign(new Error('Document not found or access denied'), { statusCode: 404 });
  }

  // ── 2. Validate version ───────────────────────────────────────────────────
  const version = await prisma.documentVersion.findFirst({
    where: { id: documentVersionId, documentId },
    select: { id: true, versionNumber: true, content: true },
  });

  if (!version) {
    throw Object.assign(new Error('Document version not found'), { statusCode: 404 });
  }

  // ── 3. Strip HTML to plain text for AI ───────────────────────────────────
  const contentText = stripHtml(version.content || doc.content || '');

  // ── 4. Log review started ─────────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'AI_REVIEW_STARTED',
      entityType: 'document',
      entityId: documentId,
      entityName: doc.title,
      details: `AI review started for version ${version.versionNumber}`,
      organizationId,
    },
  });

  // ── 5. Run AI analysis ────────────────────────────────────────────────────
  const provider = getAIProvider();
  const reviewRequest: DocumentReviewRequest = {
    documentId,
    documentVersionId,
    contentText,
    title: doc.title,
    documentType: inferDocumentType(doc.title),
  };

  const result = await provider.reviewDocument(reviewRequest);

  // ── 6. Persist review to DB ───────────────────────────────────────────────
  await prisma.documentReview.upsert({
    where: {
      documentId_documentVersionId: {
        documentId,
        documentVersionId,
      },
    },
    update: {
      riskScore: result.riskScore.score,
      riskLevel: result.riskScore.level,
      summary: result.summary,
      categoriesJson: result.categories as any,
      findingsJson: result.findings as any,
      provider: result.provider,
      model: result.model,
      createdById: userId,
    },
    create: {
      documentId,
      documentVersionId,
      riskScore: result.riskScore.score,
      riskLevel: result.riskScore.level,
      summary: result.summary,
      categoriesJson: result.categories as any,
      findingsJson: result.findings as any,
      provider: result.provider,
      model: result.model,
      createdById: userId,
    },
  });

  // ── 7. Log completion ─────────────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'AI_REVIEW_COMPLETED',
      entityType: 'document',
      entityId: documentId,
      entityName: doc.title,
      details: `AI review completed. Risk: ${result.riskScore.level} (${result.riskScore.score}/100). Provider: ${result.provider}. Findings: ${result.findings.length}`,
      organizationId,
    },
  });

  return result;
}

/**
 * Fetch the latest persisted review for a specific document version.
 */
export async function getLatestReview(
  documentId: string,
  documentVersionId: string,
  organizationId: string
): Promise<DocumentReviewResponse | null> {
  // Check document belongs to org
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    select: { id: true },
  });
  if (!doc) return null;

  const review = await prisma.documentReview.findUnique({
    where: { documentId_documentVersionId: { documentId, documentVersionId } },
  });

  if (!review) return null;

  return {
    provider: review.provider as any,
    model: review.model,
    summary: review.summary,
    riskScore: {
      score: review.riskScore,
      level: review.riskLevel as any,
      breakdown: extractBreakdown(review.findingsJson as any),
    },
    findings: (review.findingsJson as any) || [],
    categories: (review.categoriesJson as any) || [],
    providerLabel: providerLabel(review.provider as any),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferDocumentType(title: string): string {
  const lower = title.toLowerCase();
  if (/rent|lease|tenancy|house/i.test(lower)) return 'Rental/Lease Agreement';
  if (/employment|offer\s*letter|service\s*agreement/i.test(lower)) return 'Employment Agreement';
  if (/nda|non[\s-]?disclosure|confidential/i.test(lower)) return 'Non-Disclosure Agreement';
  if (/purchase|sale|vendor|supply/i.test(lower)) return 'Purchase/Sale Agreement';
  if (/partnership|joint\s*venture/i.test(lower)) return 'Partnership Agreement';
  if (/loan|mortgage|credit/i.test(lower)) return 'Loan Agreement';
  return 'Legal Agreement';
}

function extractBreakdown(findings: any[]) {
  const b = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (!Array.isArray(findings)) return b;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') b.critical++;
    else if (f.severity === 'HIGH') b.high++;
    else if (f.severity === 'MEDIUM') b.medium++;
    else if (f.severity === 'LOW') b.low++;
    else b.info++;
  }
  return b;
}

function providerLabel(provider: string): string {
  if (provider === 'gemini') return 'Powered by Google Gemini';
  if (provider === 'openai') return 'Powered by OpenAI GPT';
  return 'Rule-based analysis — AI provider unavailable';
}
