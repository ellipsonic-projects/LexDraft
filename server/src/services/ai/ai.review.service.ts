// ─── AI Review Service ────────────────────────────────────────────────────────
// Orchestrates the full document review flow: auth → provider → score → persist → audit

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getAIProvider } from './ai.provider';
import { DocumentReviewRequest, DocumentReviewResponse } from './ai.types';
import { evaluateFindingsDeterministically, EvaluationContext } from './deterministicRiskEngine';

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

  // ── 2. Validate version (fallback to latest or auto-create v1 if missing) ───
  let version = await prisma.documentVersion.findFirst({
    where: { id: documentVersionId, documentId },
    select: { id: true, versionNumber: true, content: true },
  });

  if (!version) {
    version = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, content: true },
    });
  }

  if (!version) {
    version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: 1,
        content: doc.content || '<p>Initial Document Content</p>',
        variablesState: {},
        changeDescription: 'Initial draft version snapshot',
        authorId: userId,
      },
      select: { id: true, versionNumber: true, content: true },
    });
  }

  // ── 3. Strip HTML to plain text & generate SHA-256 fingerprint ──────────────
  const contentText = stripHtml(version.content || doc.content || '');
  const fingerprint = crypto.createHash('sha256').update(contentText).digest('hex');

  // ── Check deterministic cached review for version baseline ──────────────────
  const existingReview = await prisma.documentReview.findUnique({
    where: {
      documentId_documentVersionId: {
        documentId,
        documentVersionId: version.id,
      },
    },
  });

  if (existingReview && !(options as any).forceRerun) {
    return {
      provider: existingReview.provider as any,
      model: existingReview.model,
      status: 'GEMINI_OK',
      fallbackUsed: false,
      fingerprint,
      summary: existingReview.summary,
      riskScore: {
        score: existingReview.riskScore,
        level: existingReview.riskLevel as any,
        breakdown: ((existingReview.findingsJson as any[]) || []).reduce(
          (acc: any, f: any) => {
            const sev = (f.severity || 'low').toLowerCase();
            if (acc[sev] !== undefined) acc[sev]++;
            return acc;
          },
          { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
        ),
      },
      findings: (existingReview.findingsJson as any) || [],
      categories: (existingReview.categoriesJson as any) || [],
      providerLabel: `Cached Baseline Review (${existingReview.provider})`,
    };
  }

  // ── 4. Log review started ─────────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'AI_REVIEW_STARTED',
      entityType: 'document',
      entityId: documentId,
      entityName: doc.title,
      details: `AI review started for version ${version.versionNumber} [Fingerprint: ${fingerprint.slice(0, 8)}]`,
      organizationId,
    },
  });

  // ── 5. Run AI analysis (Stage 1) ──────────────────────────────────────────
  const provider = getAIProvider();
  const reviewRequest: DocumentReviewRequest = {
    documentId,
    documentVersionId: version.id,
    contentText,
    title: doc.title,
    documentType: inferDocumentType(doc.title),
  };

  const rawResult = await provider.reviewDocument(reviewRequest);

  // ── 6. Deterministic Risk Engine Evaluation (Stage 2) ─────────────────────
  const evalContext: EvaluationContext = {
    documentTitle: doc.title,
    documentType: inferDocumentType(doc.title),
    jurisdiction: 'Karnataka',
    lifecycleStage: 'DRAFT',
  };

  const { finalizedFindings, riskScore, categories } = evaluateFindingsDeterministically(
    rawResult.findings,
    evalContext,
    contentText
  );

  const result: DocumentReviewResponse = {
    ...rawResult,
    fingerprint,
    riskScore,
    findings: finalizedFindings,
    categories,
  };

  // ── 7. Persist review to DB using resolved version.id ─────────────────────
  await prisma.documentReview.upsert({
    where: {
      documentId_documentVersionId: {
        documentId,
        documentVersionId: version.id,
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
      documentVersionId: version.id,
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

  let targetVersionId = documentVersionId;
  if (!targetVersionId || targetVersionId === 'latest') {
    const latestVer = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });
    if (latestVer) {
      targetVersionId = latestVer.id;
    }
  }

  const review = await prisma.documentReview.findFirst({
    where: {
      documentId,
      ...(targetVersionId && targetVersionId !== 'latest' ? { documentVersionId: targetVersionId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!review) return null;

  return {
    provider: review.provider as any,
    model: review.model,
    status: review.provider === 'rule_based' ? 'RULE_BASED' : 'GEMINI_OK',
    fallbackUsed: review.provider === 'rule_based',
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
