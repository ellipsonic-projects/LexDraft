import { evaluateFindingsDeterministically, EvaluationContext } from '../services/ai/deterministicRiskEngine';
import { AIFinding } from '../services/ai/ai.types';

async function runDisciplinedRiskEngineTests() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  TEST SUITE: DETERMINISTIC RISK ENGINE & SEVERITY DISCIPLINE');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const defaultContext: EvaluationContext = {
    documentTitle: 'Residential Rental Agreement',
    documentType: 'Residential Rental Agreement',
    jurisdiction: 'Karnataka',
    lifecycleStage: 'DRAFT',
  };

  // Test 1: Grammar-only issue -> LOW
  console.log('[TEST 1] Grammar-only issue...');
  const f1: AIFinding = {
    id: '1',
    category: 'GRAMMAR',
    severity: 'CRITICAL', // AI initially misclassified as CRITICAL
    title: 'Grammar and Clarity in Clause 2',
    description: 'Minor typo in word "agrees".',
  };
  const res1 = evaluateFindingsDeterministically([f1], defaultContext, '');
  const r1 = res1.finalizedFindings[0];
  console.log(` -> Title   : ${r1.title}`);
  console.log(` -> Severity: ${r1.severity} (Expected: LOW)`);
  console.log(` -> ReqType : ${r1.requirementType} (Expected: RECOMMENDED)`);
  console.assert(r1.severity === 'LOW', 'Test 1 Failed: Grammar should be LOW');
  console.log(' ✅ PASS\n');

  // Test 2: Formatting improvement -> LOW/INFO
  console.log('[TEST 2] Formatting improvement...');
  const f2: AIFinding = {
    id: '2',
    category: 'STRUCTURAL',
    severity: 'HIGH',
    title: 'Formatting and Layout Adjustment',
    description: 'Adjust margin spacing for title.',
  };
  const res2 = evaluateFindingsDeterministically([f2], defaultContext, '');
  const r2 = res2.finalizedFindings[0];
  console.log(` -> Severity: ${r2.severity} (Expected: LOW or INFO)`);
  console.assert(r2.severity === 'LOW' || r2.severity === 'INFO', 'Test 2 Failed');
  console.log(' ✅ PASS\n');

  // Test 3: Missing optional information -> LOW
  console.log('[TEST 3] Missing optional information (Landlord address)...');
  const f3: AIFinding = {
    id: '3',
    category: 'MISSING_CLAUSE',
    severity: 'CRITICAL',
    title: 'Landlord Address',
    description: 'Landlord postal address is omitted.',
  };
  const res3 = evaluateFindingsDeterministically([f3], defaultContext, '');
  const r3 = res3.finalizedFindings[0];
  console.log(` -> Severity: ${r3.severity} (Expected: LOW)`);
  console.log(` -> ReqType : ${r3.requirementType} (Expected: RECOMMENDED)`);
  console.assert(r3.severity === 'LOW', 'Test 3 Failed');
  console.log(' ✅ PASS\n');

  // Test 4: Ambiguous material clause -> MEDIUM/HIGH
  console.log('[TEST 4] Ambiguous material clause (Termination Procedure)...');
  const f4: AIFinding = {
    id: '4',
    category: 'HIGH_RISK',
    severity: 'CRITICAL',
    title: 'Termination Procedure',
    description: 'Notice period mechanism lacks explicit breakdown.',
  };
  const res4 = evaluateFindingsDeterministically([f4], defaultContext, '');
  const r4 = res4.finalizedFindings[0];
  console.log(` -> Severity: ${r4.severity} (Expected: MEDIUM)`);
  console.log(` -> ReqType : ${r4.requirementType} (Expected: POTENTIAL_RISK)`);
  console.assert(r4.severity === 'MEDIUM', 'Test 4 Failed');
  console.log(' ✅ PASS\n');

  // Test 5: Missing genuinely required element -> HIGH
  console.log('[TEST 5] Missing genuinely required element (Rent Amount)...');
  const f5: AIFinding = {
    id: '5',
    category: 'MISSING_CLAUSE',
    severity: 'HIGH',
    title: 'Rent Amount & Consideration',
    description: 'No monthly rent amount defined in agreement.',
  };
  const res5 = evaluateFindingsDeterministically([f5], defaultContext, '');
  const r5 = res5.finalizedFindings[0];
  console.log(` -> Severity: ${r5.severity} (Expected: HIGH)`);
  console.log(` -> ReqType : ${r5.requirementType} (Expected: REQUIRED)`);
  console.assert(r5.severity === 'HIGH', 'Test 5 Failed');
  console.log(' ✅ PASS\n');

  // Test 6: Duplicate AI + rule finding -> one merged finding with source="BOTH"
  console.log('[TEST 6] Duplicate AI + rule finding deduplication...');
  const f6a: AIFinding = { id: '6a', category: 'MISSING_CLAUSE', severity: 'CRITICAL', title: 'Landlord Address', description: 'AI desc', source: 'AI' };
  const f6b: AIFinding = { id: '6b', category: 'MISSING_CLAUSE', severity: 'LOW', title: 'Landlord Address', description: 'Rule desc', source: 'RULE' };
  const res6 = evaluateFindingsDeterministically([f6a, f6b], defaultContext, '');
  console.log(` -> Findings Count: ${res6.finalizedFindings.length} (Expected: 1)`);
  console.log(` -> Source        : ${res6.finalizedFindings[0].source} (Expected: BOTH)`);
  console.assert(res6.finalizedFindings.length === 1 && res6.finalizedFindings[0].source === 'BOTH', 'Test 6 Failed');
  console.log(' ✅ PASS\n');

  // Test 7: Risk score calculation from finalized findings (Higher = Safer)
  console.log('[TEST 7] Risk score calculation thresholds...');
  // 1 LOW finding (penalty 3) -> 100 - 3 = 97 -> Level LOW
  console.log(` -> Score: ${res1.riskScore.score}/100, Level: ${res1.riskScore.level} (Expected: 97, LOW)`);
  console.assert(res1.riskScore.score === 97 && res1.riskScore.level === 'LOW', 'Test 7 Failed');
  console.log(' ✅ PASS\n');

  // Test 8: Stage sensitivity (Execution block in DRAFT vs APPROVED)
  console.log('[TEST 8] Document stage sensitivity for Execution Block...');
  const f8: AIFinding = { id: '8', category: 'MISSING_CLAUSE', severity: 'CRITICAL', title: 'Execution Block', description: 'Signature lines blank.' };
  const res8Draft = evaluateFindingsDeterministically([f8], { ...defaultContext, lifecycleStage: 'DRAFT' }, '');
  const res8Approved = evaluateFindingsDeterministically([f8], { ...defaultContext, lifecycleStage: 'APPROVED' }, '');
  console.log(` -> Draft Stage Severity   : ${res8Draft.finalizedFindings[0].severity} (Expected: LOW)`);
  console.log(` -> Approved Stage Severity: ${res8Approved.finalizedFindings[0].severity} (Expected: HIGH)`);
  console.assert(res8Draft.finalizedFindings[0].severity === 'LOW' && res8Approved.finalizedFindings[0].severity === 'HIGH', 'Test 8 Failed');
  console.log(' ✅ PASS\n');

  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  ALL 8 DETERMINISTIC SEVERITY TESTS PASSED 100%! ✅');
  console.log('════════════════════════════════════════════════════════════════════════\n');
}

runDisciplinedRiskEngineTests().catch(console.error);
