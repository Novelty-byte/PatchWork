const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { dispatchReportNotifications } = require('../services/emailService');
const { verifyMediaReport } = require('../services/visionService');

function sanitizeForPublic(report) {
  if (!report) return null;
  const { contact, email, phone, ...safe } = report;
  return safe;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d[\d\s-]{7,15}\d)/;

/**
 * System prompt to conduct intake and extract structured issue reports
 */
const SYSTEM_PROMPT = `
You are the intelligent community reporting assistant for PatchWork.
Your objective is to help residents report infrastructure issues (broken streetlights, potholes, sewage, flooding, damaged infrastructure).

You must politely collect the following 4 details through natural conversation:
1. Category & problem description (classify as: Broken Streetlight, Pothole, Sewage / Flooding, Park / Building Infrastructure, or Other Community Issue).
2. Exact Location (street name, house/block number, landmark).
3. Reporter's Full Name.
4. Reporter's Email Address (MANDATORY: explain that ticket verification and confirmation will be sent to this email) and optional contact phone number.

BEHAVIOR:
- Ask follow-up questions one at a time so you don't overwhelm the resident.
- Keep your conversational replies friendly, brief (1-2 sentences), and empathetic.
- CRITICAL: You MUST explicitly collect a valid email address. If the resident only gives a phone number or name, politely ask for their email address specifically.
- CRITICAL: The "description" in extracted_data must ONLY describe the physical problem (e.g., "Deep pothole on the main road causing a hazard for bikes"). NEVER put the resident's contact details, email, or name in the description.
- When you have ALL details (category/description, location, name, and valid email), summarize them for the resident and declare the report complete.

OUTPUT FORMAT:
Always respond strictly with a valid JSON object matching this schema:
{
  "reply": "Your conversational message to the user here",
  "is_complete": false,
  "extracted_data": null
}

When all details (problem description, location, full name, and email) have been provided, set:
{
  "reply": "Thank you [Name]! I have officially logged your report for [Category] at [Location]. A confirmation email has been dispatched to [Email] with your ticket details.",
  "is_complete": true,
  "extracted_data": {
    "reporter_name": "Full Name",
    "contact": "Phone Number (or 'Not provided')",
    "email": "user@example.com (MUST be a clean email address only)",
    "location": "Exact Location",
    "category": "Broken Streetlight | Pothole | Sewage / Flooding | Park / Building Infrastructure | Other Community Issue",
    "description": "Clear and detailed summary of the physical infrastructure fault only",
    "severity": "low | medium | high | critical"
  }
}
`;

/**
 * @route   POST /api/chat
 * @desc    Chat intake session for resident reporting
 */
router.post('/', async (req, res) => {
  try {
    const { message, history = [], media_urls = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    let aiResponseJson = null;

    if (apiKey) {
      // Format chat history for Gemini API
      const rawContents = [];
      (history || []).forEach(item => {
        const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'model';
        if (item.text && item.text.trim()) {
          rawContents.push({ role, parts: [{ text: item.text.trim() }] });
        }
      });
      rawContents.push({ role: 'user', parts: [{ text: message }] });

      // Gemini requires contents to strictly alternate roles and start with 'user'
      const contents = [];
      rawContents.forEach(entry => {
        if (contents.length === 0) {
          if (entry.role === 'user') {
            contents.push(entry);
          }
        } else {
          const last = contents[contents.length - 1];
          if (last.role === entry.role) {
            last.parts[0].text += `\n${entry.parts[0].text}`;
          } else {
            contents.push(entry);
          }
        }
      });

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }

      const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          try {
            rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
            aiResponseJson = JSON.parse(rawText);
            // Sanitize extracted email
            if (aiResponseJson.extracted_data && aiResponseJson.extracted_data.email) {
              const emailMatch = aiResponseJson.extracted_data.email.match(EMAIL_REGEX);
              aiResponseJson.extracted_data.email = emailMatch ? emailMatch[0].toLowerCase() : '';
            }
          } catch (pe) {
            console.warn('Failed to parse Gemini JSON output:', pe.message);
          }
        }
      } else {
        console.warn(`Gemini API call returned status ${response.status}, using conversational engine fallback.`);
      }
    }

    // Smart conversational fallback engine if Gemini unavailable or not finished
    if (!aiResponseJson) {
      aiResponseJson = processFallbackConversation(message, history);
    }

    // If report intake is complete, automatically record in DB & trigger Make.com email automation
    let createdReport = null;
    if (aiResponseJson.is_complete && aiResponseJson.extracted_data) {
      const data = aiResponseJson.extracted_data;

      // Extract clean email address
      let cleanEmail = '';
      if (data.email) {
        const match = data.email.match(EMAIL_REGEX);
        cleanEmail = match ? match[0].toLowerCase() : '';
      }

      createdReport = await db.createReport({
        reporter_name: data.reporter_name || 'Resident',
        contact: data.contact || 'Not provided',
        email: cleanEmail,
        location: data.location || 'Community Area',
        category: data.category || 'General Community Issue',
        description: data.description || 'Civic infrastructure fault reported via chat.',
        severity: data.severity || 'medium',
        media_urls: media_urls
      });

      // 2. Advisory visual verification runs asynchronously if media is attached
      if (media_urls && media_urls.length > 0) {
        verifyMediaReport(media_urls, data.category, data.description)
          .then(async (verificationResult) => {
            await db.updateVerification(createdReport.id, verificationResult);
          })
          .catch(err => console.warn('Chat verification error:', err.message));
      }

      // 3. Dispatch automated dual emails via Make.com with full private reporter contact
      dispatchReportNotifications(createdReport);
    }

    return res.json({
      success: true,
      reply: aiResponseJson.reply,
      is_complete: Boolean(aiResponseJson.is_complete),
      report: sanitizeForPublic(createdReport)
    });
  } catch (err) {
    console.error('Error in /api/chat endpoint:', err);
    return res.status(500).json({
      success: false,
      reply: 'I experienced an issue processing that. Could you please rephrase or mention the issue location?',
      is_complete: false
    });
  }
});

/**
 * Robust fallback assistant for development/offline testing
 */
function processFallbackConversation(message, history) {
  // Normalize history into alternating turns
  const turns = [];
  (history || []).forEach(h => {
    turns.push({
      role: (h.sender === 'user' || h.role === 'user') ? 'user' : 'bot',
      text: h.text || ''
    });
  });
  turns.push({ role: 'user', text: message });

  const userMessages = turns.filter(t => t.role === 'user').map(t => t.text.trim());
  const allText = userMessages.join(' ');

  // 1. Extract clean email
  const emailMatch = allText.match(EMAIL_REGEX);
  const cleanEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

  // 2. Extract phone
  const phoneMatch = allText.match(PHONE_REGEX);
  const cleanPhone = phoneMatch ? phoneMatch[0].trim() : 'Not provided';

  // 3. Extract reporter name
  let reporterName = null;
  // Strategy A: regex
  const namePattern = /(?:my name is|i am|this is|i'm)\s+([A-Za-z\s]+?)(?:[.,;\n]|$|and\s|my\s|email\s|phone\s|\d)/i;
  const nameMatch = allText.match(namePattern);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    reporterName = nameMatch[1].trim().replace(/[.,!]/g, '');
  }

  // Strategy B: If bot asked for name, the next user message is the name
  if (!reporterName) {
    for (let i = 0; i < turns.length - 1; i++) {
      if (turns[i].role === 'bot' && /name/i.test(turns[i].text)) {
        const candidate = turns[i + 1].text.trim().replace(/[.,!]/g, '');
        if (candidate && !candidate.includes('@') && candidate.length < 50 && !/\d/.test(candidate)) {
          reporterName = candidate;
          break;
        }
      }
    }
  }

  // Strategy C: Any short user message without @, digits, or issue keywords
  if (!reporterName) {
    const candidate = userMessages.find(m => {
      const clean = m.replace(/[.,!]/g, '').trim();
      return clean.length >= 2 &&
        clean.length <= 30 &&
        !clean.includes('@') &&
        !/\d/.test(clean) &&
        !/(pothole|street|road|light|sewage|drain|flood|near|beside|crossing|flyover)/i.test(clean);
    });
    if (candidate) reporterName = candidate.replace(/[.,!]/g, '').trim();
  }

  // 4. Extract location
  let location = null;
  const locationClues = ['street', 'road', 'block', 'sector', 'near', 'outside', 'gate', 'lane', 'avenue', 'behind', 'opposite', 'corner', 'beside', 'flyover', 'crossing'];
  // Strategy A: If bot asked for location, next user message is location
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === 'bot' && /location|where/i.test(turns[i].text)) {
      const candidate = turns[i + 1].text.trim();
      if (candidate && !candidate.includes('@') && !/my name is/i.test(candidate)) {
        location = candidate.replace(/my name is.*/i, '').replace(/email.*/i, '').trim();
        break;
      }
    }
  }

  // Strategy B: Clue matching
  if (!location) {
    for (const msg of userMessages) {
      const lmsg = msg.toLowerCase();
      if (locationClues.some(clue => lmsg.includes(clue))) {
        location = msg.replace(/my name is.*/i, '').replace(/email.*/i, '').trim();
        break;
      }
    }
  }

  // 5. Determine category & description
  let category = 'Other Community Issue';
  const lowerAll = allText.toLowerCase();
  if (lowerAll.includes('light') || lowerAll.includes('lamp') || lowerAll.includes('pole')) {
    category = 'Broken Streetlight';
  } else if (lowerAll.includes('pothole') || lowerAll.includes('road') || lowerAll.includes('asphalt') || lowerAll.includes('crater')) {
    category = 'Pothole';
  } else if (lowerAll.includes('sewage') || lowerAll.includes('drain') || lowerAll.includes('gutter') || lowerAll.includes('leak')) {
    category = 'Sewage / Flooding';
  } else if (lowerAll.includes('flood') || lowerAll.includes('water') || lowerAll.includes('puddle')) {
    category = 'Sewage / Flooding';
  } else if (lowerAll.includes('park') || lowerAll.includes('bench') || lowerAll.includes('swing') || lowerAll.includes('building')) {
    category = 'Park / Building Infrastructure';
  }

  const initialProblem = userMessages[0] || message;
  let cleanDescription = initialProblem;
  if (cleanDescription.length < 10) {
    const descriptiveMsg = userMessages.find(m => m.length > 8 && !m.includes('@') && m !== location && m !== reporterName);
    if (descriptiveMsg) cleanDescription = descriptiveMsg;
  }

  // Step A: Need location
  if (!location) {
    return {
      reply: "Got it. Could you please share the specific location (street name, block, or nearby landmark) where this issue is located?",
      is_complete: false,
      extracted_data: null
    };
  }

  // Step B: Need name
  if (!reporterName) {
    return {
      reply: "Thank you for the location. Could you please share your full name for the report?",
      is_complete: false,
      extracted_data: null
    };
  }

  // Step C: Need MANDATORY email
  if (!cleanEmail) {
    return {
      reply: `Thanks ${reporterName}. Could you please provide your email address? We need this to send your ticket confirmation and status updates.`,
      is_complete: false,
      extracted_data: null
    };
  }

  // Step D: Complete - all details collected!
  const cleanPhoneStr = cleanPhone;
  const cleanLocationStr = location || 'Community Area';

  return {
    reply: `Thank you ${reporterName}! I have officially logged your report for ${category} at ${cleanLocationStr}. A confirmation email has been dispatched to ${cleanEmail}.`,
    is_complete: true,
    extracted_data: {
      reporter_name: reporterName,
      contact: cleanPhoneStr,
      email: cleanEmail,
      location: cleanLocationStr,
      category: category,
      description: cleanDescription,
      severity: 'medium'
    }
  };
}

module.exports = router;
