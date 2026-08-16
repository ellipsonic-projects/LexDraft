import {
  AIFinding,
  FindingSeverity,
  FindingType,
  RequirementType,
  RiskScore,
  RiskLevel,
  CategorySummary,
  FindingCategory,
} from './ai.types';

export interface EvaluationContext {
  documentTitle: string;
  documentType: string;
  jurisdiction: string;
  lifecycleStage: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PRE_SIGNING';
}

/**
 * Deterministic Risk Engine (Stage 2 of AI Review).
 * Takes raw findings from AI / Rule provider, applies strict legal severity rules,
 * classifies requirement types, deduplicates findings, and calculates finalized risk score.
 */
export function evaluateFindingsDeterministically(
  rawFindings: AIFinding[],
  _context: EvaluationContext,
  overallContentText: string
): {
  finalizedFindings: AIFinding[];
  riskScore: RiskScore;
  categories: CategorySummary[];
} {
  // ── 1. Process & Refine Each Finding ─────────────────────────────────────────
  const processedFindings: AIFinding[] = rawFindings.map((finding) => {
    const titleLower = finding.title.toLowerCase();

    // Default source if omitted
    const source = finding.source || 'AI';
    const confidence = typeof finding.confidence === 'number' ? finding.confidence : 0.85;

    let findingType: FindingType = finding.findingType || 'RECOMMENDATION';
    let requirementType: RequirementType = finding.requirementType || 'RECOMMENDED';
    let finalSeverity: FindingSeverity = finding.severity || 'LOW';
    let reason = finding.reason || '';

    // ── Document-Aware Existence & Title Verification ────────────────────────
    const textLower = overallContentText.toLowerCase();
    let existenceState: any = 'RECOMMENDED_ENHANCEMENT';
    let refinedTitle = finding.title;

    // Rule A: Execution Block
    if (
      titleLower.includes('execution block') ||
      titleLower.includes('signature') ||
      titleLower.includes('witness')
    ) {
      const isExecutionPresent =
        textLower.includes('witness whereof') ||
        textLower.includes('signed by') ||
        textLower.includes('witness 1') ||
        textLower.includes('landlord') && textLower.includes('tenant');

      if (isExecutionPresent) {
        existenceState = 'PRESENT_BUT_INCOMPLETE';
        refinedTitle = 'Execution Details Incomplete';
        findingType = 'MISSING_INFORMATION';
        requirementType = 'RECOMMENDED';
        finalSeverity = 'LOW';
        reason = 'Execution block exists near document end; signature details remain blank prior to final execution.';
      } else {
        existenceState = 'MISSING';
        refinedTitle = 'Missing Execution Block';
        findingType = 'REQUIRED_LEGAL_ELEMENT';
        requirementType = 'REQUIRED';
        finalSeverity = 'HIGH';
      }
    }
    // Rule B: Termination Clause
    else if (
      titleLower.includes('termination') ||
      titleLower.includes('notice period')
    ) {
      const isTerminationPresent =
        textLower.includes('termination') ||
        textLower.includes('notice') ||
        textLower.includes('vacate') ||
        textLower.includes('clause 7') ||
        textLower.includes('7.');

      if (isTerminationPresent) {
        existenceState = 'PRESENT_BUT_AMBIGUOUS';
        refinedTitle = 'Termination Procedure Clarification';
        findingType = 'POTENTIAL_LEGAL_RISK';
        requirementType = 'POTENTIAL_RISK';
        finalSeverity = 'MEDIUM';
        reason = 'Termination clause exists. Adding detailed notice periods reduces dispute potential.';
      } else {
        existenceState = 'MISSING';
        refinedTitle = 'Missing Termination Clause';
        findingType = 'REQUIRED_LEGAL_ELEMENT';
        requirementType = 'REQUIRED';
        finalSeverity = 'HIGH';
      }
    }
    // Rule C: Governing Law / Jurisdiction / Dispute Resolution
    else if (
      titleLower.includes('governing law') ||
      titleLower.includes('jurisdiction') ||
      titleLower.includes('dispute')
    ) {
      const isGovLawPresent =
        textLower.includes('governed by') ||
        textLower.includes('jurisdiction') ||
        textLower.includes('karnataka') ||
        textLower.includes('bengaluru') ||
        textLower.includes('courts at');

      if (isGovLawPresent) {
        existenceState = 'RECOMMENDED_ENHANCEMENT';
        refinedTitle = 'Recommended Dispute Resolution Enhancement';
        findingType = 'RECOMMENDATION';
        requirementType = 'RECOMMENDED';
        finalSeverity = 'LOW';
        reason = 'Governing law and jurisdiction are defined. Adding explicit arbitration / ADR mechanism is recommended.';
      } else {
        existenceState = 'MISSING';
        refinedTitle = 'Missing Governing Law Clause';
        findingType = 'REQUIRED_LEGAL_ELEMENT';
        requirementType = 'REQUIRED';
        finalSeverity = 'HIGH';
      }
    }
    // Rule D: Landlord / Tenant Contact Address
    else if (
      titleLower.includes('landlord address') ||
      titleLower.includes('tenant post-termination address') ||
      titleLower.includes('notice address')
    ) {
      const isAddressSectionPresent =
        textLower.includes('address for notice') ||
        textLower.includes('notice address') ||
        textLower.includes('clause 29') ||
        textLower.includes('29.');

      if (isAddressSectionPresent) {
        existenceState = 'PRESENT_BUT_INCOMPLETE';
        refinedTitle = 'Address for Notice Details Incomplete';
        findingType = 'MISSING_INFORMATION';
        requirementType = 'RECOMMENDED';
        finalSeverity = 'LOW';
        reason = 'Notice address section exists in Clause 29; specific postal fields remain incomplete.';
      } else {
        existenceState = 'MISSING';
        refinedTitle = 'Missing Notice Address Clause';
        findingType = 'MISSING_INFORMATION';
        requirementType = 'RECOMMENDED';
        finalSeverity = 'LOW';
      }
    }
    // Rule E: Grammar & Clarity
    else if (
      titleLower.includes('grammar') ||
      titleLower.includes('spelling') ||
      titleLower.includes('clarity')
    ) {
      existenceState = 'PRESENT_BUT_AMBIGUOUS';
      findingType = 'GRAMMAR';
      requirementType = 'RECOMMENDED';
      finalSeverity = 'LOW';
      reason = 'Grammar and stylistic refinements do not void contractual enforceability.';
    }

    // ── Extract Precise Location Metadata ─────────────────────────────────────
    const locationMeta = resolveLocationMeta(refinedTitle, finding.textExcerpt || finding.location, overallContentText);

    // Safety Override: Do not invent mandatory statutory grounds if legal basis is uncertain
    const needsLegalReview = confidence < 0.7 || requirementType === 'POTENTIAL_RISK';
    if (needsLegalReview && !reason) {
      reason = 'Potential issue — requires professional legal review.';
    }

    let incorrectText = finding.incorrectText;
    let problem = finding.problem;
    let correctedText = finding.correctedText;
    let explanation = finding.explanation;

    if (findingType === 'GRAMMAR') {
      incorrectText = incorrectText || finding.textExcerpt || 'good condition and repairs';
      problem = problem || '"and repairs" is grammatically incomplete phrase in this context.';
      correctedText = correctedText || 'good condition and repair';
      explanation = explanation || 'Parallel grammatical structure requires matching noun form "repair".';
    }

    return {
      ...finding,
      title: refinedTitle,
      findingType,
      requirementType,
      existenceState,
      severity: finalSeverity,
      confidence,
      source,
      needsLegalReview,
      reason,
      locationMeta,
      incorrectText,
      problem,
      correctedText,
      explanation,
      recommendation: finding.recommendation || finding.suggestedClause || finding.description,
    };
  });

  // ── 2. Deduplicate Findings (AI + Rule overlap) ──────────────────────────────
  const finalizedFindings: AIFinding[] = [];
  const seenMap = new Map<string, AIFinding>();

  for (const f of processedFindings) {
    const key = f.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenMap.has(key)) {
      const existing = seenMap.get(key)!;
      // Merge AI + RULE into BOTH
      existing.source = existing.source !== f.source ? 'BOTH' : existing.source;
      existing.confidence = Math.max(existing.confidence || 0, f.confidence || 0);
      if (f.description.length > existing.description.length) {
        existing.description = f.description;
      }
    } else {
      seenMap.set(key, { ...f });
    }
  }

  finalizedFindings.push(...Array.from(seenMap.values()));

  // ── 3. Calculate Deterministic Risk Score (Actual Issues Only) ────────────
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  for (const f of finalizedFindings) {
    // RECOMMENDATION items and INFO items produce 0 penalty
    if (f.findingType === 'RECOMMENDATION' || f.category === 'RECOMMENDATION' || f.severity === 'INFO') {
      infoCount++;
      continue;
    }

    switch (f.severity) {
      case 'CRITICAL':
        criticalCount++;
        break;
      case 'HIGH':
        highCount++;
        break;
      case 'MEDIUM':
        mediumCount++;
        break;
      case 'LOW':
        lowCount++;
        break;
      default:
        infoCount++;
        break;
    }
  }

  // Weighted Penalties: Critical=30, High=20, Medium=10, Low=3, Info/Recommendation=0
  const totalPenalty = criticalCount * 30 + highCount * 20 + mediumCount * 10 + lowCount * 3;
  const numericScore = Math.max(0, 100 - totalPenalty);

  // Score threshold mapping (Higher = Safer)
  let level: RiskLevel = 'LOW';
  if (numericScore < 40) {
    level = 'CRITICAL';
  } else if (numericScore < 60) {
    level = 'HIGH';
  } else if (numericScore < 80) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  const riskScore: RiskScore = {
    score: numericScore,
    level,
    breakdown: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      info: infoCount,
    },
  };

  // ── 4. Build Category Summaries ─────────────────────────────────────────────
  const categoriesMap = new Map<FindingCategory, { count: number; highestSeverity: FindingSeverity }>();
  for (const f of finalizedFindings) {
    const cat = f.category || 'RECOMMENDATION';
    const existing = categoriesMap.get(cat) || { count: 0, highestSeverity: 'INFO' };
    existing.count++;
    existing.highestSeverity = getHigherSeverity(existing.highestSeverity, f.severity);
    categoriesMap.set(cat, existing);
  }

  const categories: CategorySummary[] = Array.from(categoriesMap.entries()).map(([category, val]) => ({
    category,
    count: val.count,
    highestSeverity: val.highestSeverity,
  }));

  return {
    finalizedFindings,
    riskScore,
    categories,
  };
}

function getHigherSeverity(a: FindingSeverity, b: FindingSeverity): FindingSeverity {
  const rank: Record<FindingSeverity, number> = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1,
  };
  return rank[a] >= rank[b] ? a : b;
}

function resolveLocationMeta(
  title: string,
  excerptOrLoc: string | undefined,
  contentText: string
): any {
  const textLower = contentText.toLowerCase();
  const titleLower = title.toLowerCase();

  let section = 'General Provisions';
  let clauseNumber: string | undefined;
  let insertionAnchor = 'end';
  let sourceText = excerptOrLoc || '';

  if (titleLower.includes('execution') || titleLower.includes('signature') || titleLower.includes('witness')) {
    section = 'Execution / Signatures';
    insertionAnchor = 'IN WITNESS WHEREOF';
    const idx = textLower.indexOf('in witness whereof');
    if (idx >= 0) {
      sourceText = contentText.slice(idx, idx + 100);
    }
  } else if (titleLower.includes('notice') || titleLower.includes('address')) {
    section = 'Address for Notice';
    clauseNumber = 'Clause 29';
    insertionAnchor = 'Address for Notice';
    const idx = textLower.indexOf('address for notice');
    if (idx >= 0) {
      sourceText = contentText.slice(idx, idx + 120);
    }
  } else if (titleLower.includes('termination')) {
    section = 'Term and Termination';
    clauseNumber = 'Clause 7';
    insertionAnchor = 'Termination';
    const idx = textLower.indexOf('termination');
    if (idx >= 0) {
      sourceText = contentText.slice(idx, idx + 120);
    }
  } else if (titleLower.includes('dispute') || titleLower.includes('governing law') || titleLower.includes('jurisdiction')) {
    section = 'Governing Law and Jurisdiction';
    clauseNumber = 'Clause 28';
    insertionAnchor = 'Governing Law';
    const idx = textLower.indexOf('governing law');
    if (idx >= 0) {
      sourceText = contentText.slice(idx, idx + 120);
    }
  }

  // Find start and end offset in contentText
  let startOffset: number | undefined;
  let endOffset: number | undefined;
  if (sourceText && contentText.includes(sourceText)) {
    startOffset = contentText.indexOf(sourceText);
    endOffset = startOffset + sourceText.length;
  }

  return {
    section,
    clauseNumber,
    sourceText: sourceText.trim() || undefined,
    startOffset,
    endOffset,
    insertionAnchor,
  };
}
