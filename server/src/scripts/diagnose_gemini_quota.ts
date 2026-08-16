import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAIProvider } from '../services/ai/ai.provider';

async function runGeminiDiagnostic() {
  console.log('====================================================');
  console.log('        GEMINI API DIAGNOSTIC AUDIT REPORT');
  console.log('====================================================\n');

  const apiKey = process.env.GEMINI_API_KEY || '';
  console.log('1. API Key Loaded:', !!apiKey, `(Length: ${apiKey.length})`);

  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not configured in .env');
    process.exit(1);
  }

  // 1. Model & Endpoint configured
  const provider = getAIProvider();
  const primaryModel = provider.model;
  const apiEndpointVersion = 'v1beta';
  const fullEndpointUrl = `https://generativelanguage.googleapis.com/${apiEndpointVersion}/models/${primaryModel}:generateContent`;

  console.log('2. Configured Model Name:', primaryModel);
  console.log('3. API Endpoint Version :', apiEndpointVersion);
  console.log('4. Target Endpoint URL  :', fullEndpointUrl);

  // 2. Query ListModels to verify model existence & supported methods
  console.log('\n--- VERIFYING MODEL EXISTENCE VIA ListModels ---');
  try {
    const listUrl = `https://generativelanguage.googleapis.com/${apiEndpointVersion}/models?key=${apiKey}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json() as any;

    if (listRes.status === 200 && Array.isArray(listData?.models)) {
      const match = listData.models.find((m: any) => m.name === `models/${primaryModel}` || m.name === primaryModel);
      if (match) {
        console.log(`✅ Model "models/${primaryModel}" EXISTS on ${apiEndpointVersion}`);
        console.log('   Supported Methods:', match.supportedGenerationMethods);
      } else {
        console.warn(`⚠️ Model "${primaryModel}" was NOT found in ListModels array of ${listData.models.length} models.`);
        console.log('   First 5 available models:', listData.models.slice(0, 5).map((m: any) => m.name));
      }
    } else {
      console.error('ListModels HTTP Error:', listRes.status, JSON.stringify(listData));
    }
  } catch (err: any) {
    console.error('ListModels Network Error:', err.message);
  }

  // 3. Test EXACTLY ONE minimal request
  console.log('\n--- TESTING EXACTLY ONE MINIMAL GENERATE CONTENT REQUEST ---');
  const payload = {
    contents: [{ parts: [{ text: 'Respond with valid JSON: {"ping": "pong"}' }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
  };

  try {
    const testUrl = `${fullEndpointUrl}?key=${apiKey}`;
    const start = Date.now();
    const res = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsed = Date.now() - start;
    const data = await res.json() as any;

    console.log(`HTTP Response Status Code: ${res.status} (${elapsed}ms)`);

    if (res.status === 200) {
      console.log('✅ MINIMAL REQUEST SUCCESSFUL!');
      console.log('   Response Text:', data?.candidates?.[0]?.content?.parts?.[0]?.text);
    } else if (res.status === 429) {
      console.log('❌ HTTP 429 RATE LIMIT / QUOTA EXCEEDED!');
      console.log('\n--- QUOTA ERROR BODY ANALYSIS ---');
      console.log('Error Message:', data?.error?.message);
      console.log('Status Code  :', data?.error?.status);
      console.log('Details      :', JSON.stringify(data?.error?.details, null, 2));

      const violations = data?.error?.details?.find((d: any) => d['@type']?.includes('QuotaFailure'))?.violations || [];
      if (violations.length > 0) {
        violations.forEach((v: any) => {
          console.log(`   - Metric : ${v.quotaMetric}`);
          console.log(`   - ID     : ${v.quotaId}`);
          console.log(`   - Value  : ${v.quotaValue}`);
        });
      }
    } else if (res.status === 404) {
      console.log('❌ HTTP 404 MODEL NOT FOUND / DEPRECATED!');
      console.log('Error Message:', data?.error?.message);
    } else {
      console.log(`❌ HTTP ${res.status} UNEXPECTED ERROR:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('Fetch Execution Error:', err.message);
  }

  console.log('\n====================================================');
}

runGeminiDiagnostic().catch(console.error);
