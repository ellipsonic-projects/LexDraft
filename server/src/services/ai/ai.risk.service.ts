// ─── Risk Score Engine ────────────────────────────────────────────────────────
// Reproducible, deterministic risk score calculation from AI findings.
// All scoring logic lives here to ensure consistent results regardless of provider.

import { AIFinding, FindingSeverity, RiskLevel, RiskScore } from './ai.types';

// Scoring penalties per finding severity
const SEVERITY_PENALTIES: Record<FindingSeverity, number> = {
  CRITICAL: 30,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 3,
  INFO: 0,
};

// Additional flat penalties for missing mandatory structural components
// These are checked separately from AI findings for the deterministic fallback
const MANDATORY_SECTIONS = [
  { pattern: /termination|notice\s*period|end\s*of\s*(agreement|contract)/i, label: 'Termination Clause', penalty: 15 },
  { pattern: /dispute\s*resolution|arbitration|mediation|jurisdiction/i, label: 'Dispute Resolution', penalty: 15 },
  { pattern: /indemnif(y|ication)|liability|hold\s*harmless/i, label: 'Indemnification/Liability', penalty: 10 },
  { pattern: /governing\s*law|applicable\s*law|law\s*of/i, label: 'Governing Law', penalty: 10 },
  { pattern: /signature|sign(ed)?\s*by|execution|witness/i, label: 'Execution Block', penalty: 20 },
  { pattern: /confidential(ity)?|non[-\s]?disclosure/i, label: 'Confidentiality', penalty: 5 },
];

/**
 * Calculates a risk score (0–100) from a list of AI findings.
 * Higher score = fewer/less severe issues = lower risk.
 */
export function calculateRiskScore(findings: AIFinding[], contentText?: string): RiskScore {
  let score = 100;

  const breakdown = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  for (const finding of findings) {
    const sev = finding.severity;
    score -= SEVERITY_PENALTIES[sev] ?? 0;
    if (sev === 'CRITICAL') breakdown.critical++;
    else if (sev === 'HIGH') breakdown.high++;
    else if (sev === 'MEDIUM') breakdown.medium++;
    else if (sev === 'LOW') breakdown.low++;
    else breakdown.info++;
  }

  // Apply missing mandatory section penalties (if content text is provided)
  if (contentText) {
    for (const section of MANDATORY_SECTIONS) {
      if (!section.pattern.test(contentText)) {
        score -= section.penalty;
        // Count it as a HIGH finding in the breakdown
        breakdown.high++;
      }
    }
  }

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: scoreToLevel(score),
    breakdown,
  };
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Checks mandatory legal sections in raw text and returns findings for any missing ones.
 * Used by both the deterministic provider and as a supplement to AI findings.
 */
export function detectMissingMandatorySections(contentText: string): AIFinding[] {
  const findings: AIFinding[] = [];
  let idx = 0;
  for (const section of MANDATORY_SECTIONS) {
    if (!section.pattern.test(contentText)) {
      findings.push({
        id: `missing-section-${idx++}`,
        category: 'MISSING_CLAUSE',
        severity: section.penalty >= 15 ? 'HIGH' : 'MEDIUM',
        title: `Missing: ${section.label}`,
        description: `The document does not appear to contain a ${section.label}. This is a mandatory component for enforceable legal agreements.`,
        suggestedClause: generateSuggestedClause(section.label),
      });
    }
  }
  return findings;
}

function generateSuggestedClause(label: string): string {
  const clauses: Record<string, string> = {
    'Termination Clause':
      '<h2>TERMINATION</h2><p>Either party may terminate this Agreement by providing <strong>thirty (30) days</strong> written notice to the other party. Upon termination, all obligations under this Agreement shall cease, except for those that by their nature survive termination.</p>',
    'Dispute Resolution':
      '<h2>DISPUTE RESOLUTION & ARBITRATION</h2><p>Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be submitted to good-faith mediation. If unresolved within thirty (30) days, the dispute shall be resolved by binding arbitration under applicable law. The seat of arbitration shall be as mutually agreed by the parties.</p>',
    'Indemnification/Liability':
      '<h2>INDEMNIFICATION & LIABILITY</h2><p>Each party (the "Indemnifying Party") agrees to indemnify, defend, and hold harmless the other party from any claims, losses, or liabilities arising from the Indemnifying Party\'s breach of this Agreement or negligence, except in cases of gross negligence or willful misconduct of the indemnified party.</p>',
    'Governing Law':
      '<h2>GOVERNING LAW</h2><p>This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction mutually agreed upon by the parties, without regard to its conflict of law principles.</p>',
    'Execution Block':
      '<h2>SIGNATURES</h2><p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p><p><strong>PARTY A:</strong> _________________________ &nbsp;&nbsp; Date: _____________</p><p><strong>PARTY B:</strong> _________________________ &nbsp;&nbsp; Date: _____________</p>',
    Confidentiality:
      '<h2>CONFIDENTIALITY</h2><p>Each party agrees to keep confidential all non-public information disclosed by the other party in connection with this Agreement ("Confidential Information") and not to disclose such information to third parties without prior written consent.</p>',
  };
  return clauses[label] || `<p>[${label} clause to be added here]</p>`;
}
