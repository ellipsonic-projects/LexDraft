// ─── AI Rewrite Service ───────────────────────────────────────────────────────
// Validates rewrite requests, calls AI provider, and logs to ActivityLog.

import { prisma } from '../../lib/prisma';
import { getAIProvider } from './ai.provider';
import { RewriteAction, RewriteRequest, RewriteResponse } from './ai.types';

export interface RewriteOptions {
  documentId: string;
  documentVersionId: string;
  selectedText: string;
  action: RewriteAction;
  context?: string;
  userId: string;
  organizationId: string;
}

/**
 * Execute an AI-powered text rewrite.
 * Validates access, calls the AI provider, and logs the request.
 */
export async function rewriteSelectedText(options: RewriteOptions): Promise<RewriteResponse> {
  const { documentId, documentVersionId, selectedText, action, context, userId, organizationId } = options;

  // ── 1. Validate access ────────────────────────────────────────────────────
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    select: { id: true, title: true },
  });

  if (!doc) {
    throw Object.assign(new Error('Document not found or access denied'), { statusCode: 404 });
  }

  // ── 2. Validate version ───────────────────────────────────────────────────
  const version = await prisma.documentVersion.findFirst({
    where: { id: documentVersionId, documentId },
    select: { id: true, versionNumber: true },
  });

  if (!version) {
    throw Object.assign(new Error('Document version not found'), { statusCode: 404 });
  }

  // ── 3. Validate selection text ────────────────────────────────────────────
  if (!selectedText || selectedText.trim().length < 5) {
    throw Object.assign(new Error('Selected text is too short for meaningful rewrite'), { statusCode: 400 });
  }

  if (selectedText.length > 10000) {
    throw Object.assign(new Error('Selected text is too long (max 10,000 characters)'), { statusCode: 400 });
  }

  // ── 4. Log rewrite request ────────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'AI_REWRITE_REQUESTED',
      entityType: 'document',
      entityId: documentId,
      entityName: doc.title,
      details: `AI rewrite requested: action=${action}, chars=${selectedText.length}, version=${version.versionNumber}`,
      organizationId,
    },
  });

  // ── 5. Execute AI rewrite ─────────────────────────────────────────────────
  const provider = getAIProvider();
  const rewriteRequest: RewriteRequest = {
    documentId,
    documentVersionId,
    selectedText,
    action,
    context,
    documentType: inferDocumentType(doc.title),
  };

  const result = await provider.rewriteText(rewriteRequest);
  return result;
}

/**
 * Log that a rewrite was accepted (called from frontend after user confirms).
 */
export async function logRewriteAccepted(options: {
  documentId: string;
  action: RewriteAction;
  userId: string;
  organizationId: string;
  documentTitle: string;
}) {
  await prisma.activityLog.create({
    data: {
      userId: options.userId,
      action: 'AI_REWRITE_ACCEPTED',
      entityType: 'document',
      entityId: options.documentId,
      entityName: options.documentTitle,
      details: `AI rewrite accepted and applied: action=${options.action}`,
      organizationId: options.organizationId,
    },
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function inferDocumentType(title: string): string {
  if (/rent|lease|tenancy|house/i.test(title)) return 'Rental/Lease Agreement';
  if (/employment|offer\s*letter|service\s*agreement/i.test(title)) return 'Employment Agreement';
  if (/nda|non[\s-]?disclosure|confidential/i.test(title)) return 'Non-Disclosure Agreement';
  if (/purchase|sale|vendor|supply/i.test(title)) return 'Purchase/Sale Agreement';
  if (/partnership|joint\s*venture/i.test(title)) return 'Partnership Agreement';
  if (/loan|mortgage|credit/i.test(title)) return 'Loan Agreement';
  return 'Legal Agreement';
}
