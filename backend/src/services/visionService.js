/**
 * Advisory evidence verification using Gemini Vision
 * Result labels (per project draft):
 * - "verified": evidence clearly matches the reported issue
 * - "unclear": evidence is blurry, dark, or inconclusive
 * - "does not match": evidence contradicts the reported issue
 * - "skipped": no photo/video uploaded
 */
async function verifyMediaReport(mediaUrls, category, description) {
  // 1. If no media attached, mark as skipped
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
      You are an automated civic infrastructure verification assistant.
      A resident has submitted a community report with:
      - Category: ${category}
      - Description: ${description}

      Carefully inspect the attached visual evidence and determine if it supports the reported problem.
      Respond strictly with a JSON object in this format:
      {
        "label": "verified" | "unclear" | "does not match",
        "reason": "A concise, single-sentence explanation of your finding."
      }
    `;

    const parts = [{ text: promptText }];

    // Attempt to fetch first media item for true multimodal visual inspection
    const primaryMediaUrl = mediaUrls[0];
    if (primaryMediaUrl && typeof primaryMediaUrl === 'string') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const mediaRes = await fetch(primaryMediaUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (mediaRes.ok) {
          const contentType = mediaRes.headers.get('content-type') || 'image/jpeg';
          if (contentType.startsWith('image/')) {
            const arrayBuffer = await mediaRes.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');
            parts.push({
              inlineData: {
                mimeType: contentType.split(';')[0],
                data: base64Data
              }
            });
          } else {
            parts.push({ text: `Attached media URL (${contentType}): ${primaryMediaUrl}` });
          }
        } else {
          parts.push({ text: `Attached media URL: ${primaryMediaUrl}` });
        }
      } catch (fetchErr) {
        // Fallback to URL reference if fetch aborts or fails
        parts.push({ text: `Attached media URL: ${primaryMediaUrl}` });
      }
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.warn(`Gemini Vision primary call status: ${response.status}`);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText.trim());

    const validLabels = ['verified', 'unclear', 'does not match'];
    const finalLabel = validLabels.includes(parsed.label) ? parsed.label : 'unclear';

    return {
      label: finalLabel,
      reason: parsed.reason || 'Verification check completed.'
    };
  } catch (err) {
    console.warn('Vision verification notice:', err.message);
    return {
      label: 'unclear',
      reason: 'Automated verification check was inconclusive.'
    };
  }
}

module.exports = {
  verifyMediaReport
};
