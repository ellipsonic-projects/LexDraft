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
  documentType?: string;
  jurisdiction?: string;
  sectionName?: string;
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
    where: { id: documentId },
    select: { id: true, title: true, content: true, variables: true, organizationId: true },
  });

  if (!doc) {
    throw Object.assign(new Error('Document not found or access denied'), { statusCode: 404 });
  }

  // ── 2. Validate version (fallback to latest or auto-create v1 if missing) ───
  let version = await prisma.documentVersion.findFirst({
    where: { id: documentVersionId, documentId },
    select: { id: true, versionNumber: true },
  });

  if (!version) {
    version = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true },
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
      select: { id: true, versionNumber: true },
    });
  }

  // ── 3. Validate selection text ────────────────────────────────────────────
  if (!selectedText || selectedText.trim().length < 5) {
    throw Object.assign(new Error('Selected text is too short for meaningful rewrite'), { statusCode: 400 });
  }

  if (selectedText.length > 10000) {
    throw Object.assign(new Error('Selected text is too long (max 10,000 characters)'), { statusCode: 400 });
  }

  const targetOrgId = organizationId || doc.organizationId;
  // ── 4. Log rewrite request ────────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'AI_REWRITE_REQUESTED',
      entityType: 'document',
      entityId: documentId,
      entityName: doc.title,
      details: `AI rewrite requested: action=${action}, chars=${selectedText.length}, version=${version.versionNumber}`,
      organizationId: targetOrgId,
    },
  });

  // ── 5. Infer Indian Legal Metadata ────────────────────────────────────────
  const vars = (doc.variables as Record<string, any>) || {};
  const docType = options.documentType || inferDocumentType(doc.title);
  const jurisdiction = options.jurisdiction || inferJurisdiction(vars, doc.title);
  const sectionName = options.sectionName || inferSectionName(context, selectedText);

  // ── 6. Execute AI rewrite ─────────────────────────────────────────────────
  const provider = getAIProvider();
  const rewriteRequest: RewriteRequest = {
    documentId,
    documentVersionId: version.id,
    selectedText,
    action,
    context,
    documentType: docType,
    jurisdiction,
    sectionName,
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function inferDocumentType(title: string): string {
  if (/rent|lease|tenancy|house/i.test(title)) return 'Residential Rental Agreement';
  if (/employment|offer\s*letter|service\s*agreement/i.test(title)) return 'Employment Agreement';
  if (/nda|non[\s-]?disclosure|confidential/i.test(title)) return 'Non-Disclosure Agreement (NDA)';
  if (/purchase|sale|vendor|supply/i.test(title)) return 'Commercial Purchase/Sale Agreement';
  if (/partnership|joint\s*venture/i.test(title)) return 'Partnership Agreement';
  if (/loan|mortgage|credit/i.test(title)) return 'Loan & Finance Agreement';
  return 'Indian Legal Contract';
}

function inferJurisdiction(vars: Record<string, any>, title: string): string {
  const cityOrState = vars.Jurisdiction_City || vars.Jurisdiction || vars.City || vars.State || '';
  if (/karnataka|bengaluru|bangalore/i.test(cityOrState) || /karnataka|bengaluru|bangalore/i.test(title)) {
    return 'Karnataka, India';
  }
  if (/maharashtra|mumbai|pune/i.test(cityOrState) || /maharashtra|mumbai|pune/i.test(title)) {
    return 'Maharashtra, India';
  }
  if (/delhi|ncr/i.test(cityOrState) || /delhi|ncr/i.test(title)) {
    return 'Delhi (NCT), India';
  }
  if (cityOrState) {
    return `${cityOrState}, India`;
  }
  return 'India (Pan-India Jurisdiction)';
}

function inferSectionName(context?: string, selectedText?: string): string | undefined {
  const textToScan = `${context || ''}\n${selectedText || ''}`;
  const headerMatch = textToScan.match(/(?:^|\n)(?:<h[1-6]>|\s*)([0-9]{1,2}\.?\s*|)(PART|SECTION|CLAUSE|ARTICLE|PREMISES|TERM|RENT|TERMINATION|JURISDICTION|CONFIDENTIALITY|INDEMNITY|LIABILITY|REVENUE|GOVERNING LAW)[^\n<]*/i);
  if (headerMatch && headerMatch[0]) {
    return headerMatch[0].replace(/<[^>]*>/g, '').trim();
  }
  return undefined;
}
