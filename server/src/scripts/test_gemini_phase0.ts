import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testPhase0() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  console.log('=== PHASE 0 GEMINI VERIFICATION ===');
  console.log('1. GEMINI_API_KEY present:', !!apiKey, '| Length:', apiKey.length);

  if (!apiKey || apiKey.length < 10) {
    console.error('FAIL: GEMINI_API_KEY is missing or invalid in .env');
    process.exit(1);
  }

  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-3.1-flash-lite',
  ];

  let successModel = '';
  let lastResponse = null;
  let lastStatus = 0;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: 'Respond with valid JSON: {"status": "ok", "provider": "gemini"}' }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      lastStatus = res.status;
      lastResponse = await res.json();

      console.log(`Trying model: ${model} ... Status: ${res.status}`);
      if (res.status === 200) {
        successModel = model;
        break;
      } else {
        console.log(`  Model ${model} error:`, lastResponse?.error?.message);
      }
    } catch (err: any) {
      console.error(`Model ${model} fetch threw error:`, err.message);
    }
  }

  if (successModel) {
    console.log('2. Gemini API request Succeeded!');
    console.log('3. Working Model:', successModel);
    console.log('4. Raw Response Content:', JSON.stringify(lastResponse?.candidates?.[0]?.content?.parts?.[0]?.text || lastResponse, null, 2));
    console.log('\nGEMINI CONNECTION: PASS');
  } else {
    console.log('2. Gemini API request Failed across all model candidates!');
    console.log('\nGEMINI CONNECTION: FAIL');
  }
}

testPhase0().catch(console.error);
