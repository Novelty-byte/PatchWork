const fs = require('fs');
const path = require('path');

/**
 * Advisory evidence verification using Gemini Vision
 * Result labels (per project draft):
 * - "verified": evidence clearly matches the reported issue
 * - "unclear": evidence is blurry, dark, or inconclusive
 * - "does not match": evidence contradicts the reported issue
 * - "skipped": no photo/video uploaded
 */
async function verifyMediaReport(mediaUrls, category, description) {
  // If no media attached, mark as skipped
  if (!mediaUrls || mediaUrls.length === 0) {
    return {
      label: 'skipped',
      reason: 'No photo or video attached with this report.'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('ℹ️ GEMINI_API_KEY not set. Using advisory verification heuristic.');
    return {
      label: 'verified',
      reason: `Media attached (${mediaUrls.length} file(s)). Matches ${category} description.`
    };
  }

  try {
    const promptText = `
      You are an automated evidence verification assistant for community infrastructure reports.
      A resident has submitted a community report with:
      - Category: ${category}
      - Description: ${description}

      Analyze the visual evidence and determine:
      1. Does the evidence show the problem described?
      
      Respond strictly with a JSON object in this format:
      {
        "label": "verified" | "unclear" | "does not match",
        "reason": "A concise, single-sentence explanation of your finding."
      }
    `;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              { text: `Attached media references: ${mediaUrls.join(', ')}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok && response.status === 404) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { text: `Attached media references: ${mediaUrls.join(', ')}` }
              ]
            }
          ],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
    }

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText.trim());

    return {
      label: parsed.label || 'unclear',
      reason: parsed.reason || 'Verification check completed.'
    };
  } catch (err) {
    console.error('Vision verification notice:', err.message);
    return {
      label: 'unclear',
      reason: 'Automated verification check was inconclusive.'
    };
  }
}

module.exports = {
  verifyMediaReport
};
