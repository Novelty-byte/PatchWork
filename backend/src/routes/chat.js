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
4. Contact phone number and/or email address.

BEHAVIOR:
- Ask follow-up questions one or two at a time so you don't overwhelm the resident.
- Keep your conversational replies friendly, brief (1-3 sentences), and empathetic.
- When you have ALL 4 details, summarize them for the resident and declare the report complete.

OUTPUT FORMAT:
Always respond strictly with a valid JSON object matching this schema:
{
  "reply": "Your conversational message to the user here",
  "is_complete": false,
  "extracted_data": null
}

When all 4 details (category/description, location, name, contact) have been provided by the user, set:
{
  "reply": "Thank you [Name]! I have officially logged your report for [Category] at [Location]. A confirmation email has been dispatched with your ticket.",
  "is_complete": true,
  "extracted_data": {
    "reporter_name": "Full Name",
    "contact": "Phone Number",
    "email": "Email Address (or empty string)",
    "location": "Exact Location",
    "category": "Broken Streetlight | Pothole | Sewage / Flooding | Park / Building Infrastructure | Other Community Issue",
    "description": "Comprehensive summary of the problem",
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
      const contents = [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + "\n\nLet's begin. Acknowledge instructions." }]
        },
        {
          role: 'model',
          parts: [{ text: JSON.stringify({ reply: "Hello! Welcome to PatchWork Community Support. What issue would you like to report today?", is_complete: false, extracted_data: null }) }]
        }
      ];

      // Append existing conversation history
      history.forEach(item => {
        contents.push({
          role: item.sender === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      });

      // Append current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      // Graceful fallback to 2.5/2.0 if 3.5 is not yet in the user's specific tier
      if (!response.ok && response.status === 404) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { responseMimeType: 'application/json' } })
        });
      }

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        aiResponseJson = JSON.parse(rawText);
      } else {
        console.warn(`Gemini API call returned status ${response.status}, using conversational engine fallback.`);
      }

    }

    // Smart conversational fallback engine if GEMINI_API_KEY is not yet supplied
    if (!aiResponseJson) {
      aiResponseJson = processFallbackConversation(message, history);
    }

    // If report intake is complete, automatically record in DB & trigger Make.com email automation
    let createdReport = null;
    if (aiResponseJson.is_complete && aiResponseJson.extracted_data) {
      const data = aiResponseJson.extracted_data;
      createdReport = await db.createReport({
        reporter_name: data.reporter_name,
        contact: data.contact,
        email: data.email || '',
        location: data.location,
        category: data.category,
        description: data.description,
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
 * Rule-based fallback assistant for development/offline testing
 */
function processFallbackConversation(message, history) {
  const allMessages = [...history.map(h => h.text.toLowerCase()), message.toLowerCase()].join(' ');

  const hasLocation = allMessages.includes('street') || allMessages.includes('road') || allMessages.includes('block') || allMessages.includes('near') || allMessages.includes('sector');
  const hasContact = /\d{7,15}/.test(allMessages) || allMessages.includes('@');
  const hasName = allMessages.includes('my name is') || allMessages.includes('i am') || history.length >= 3;

  if (!hasLocation) {
    return {
      reply: "Got it. Could you please share the specific location (street, block, or nearby landmark) where this issue is located?",
      is_complete: false,
      extracted_data: null
    };
  }

  if (!hasContact) {
    return {
      reply: "Thank you for the location. Could you please provide your phone number or email so we can send you status updates?",
      is_complete: false,
      extracted_data: null
    };
  }

  if (!hasName) {
    return {
      reply: "Almost done! Could you please share your name for the report?",
      is_complete: false,
      extracted_data: null
    };
  }

  // Complete
  return {
    reply: "Thank you! Your issue report has been officially logged in PatchWork. Our team and society manager have been notified.",
    is_complete: true,
    extracted_data: {
      reporter_name: "Resident",
      contact: "Provided in chat",
      email: message.includes('@') ? message : '',
      location: "Community Area",
      category: message.toLowerCase().includes('light') ? 'Broken Streetlight' : 'General Community Issue',
      description: message,
      severity: 'medium'
    }
  };
}

module.exports = router;
