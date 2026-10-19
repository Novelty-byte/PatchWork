const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

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
You are Patch, the intelligent AI community reporting assistant for PatchWork, a neighborhood civic infrastructure reporting platform.

YOUR PURPOSE:
You help residents report physical infrastructure and civic issues in their community — such as broken streetlights, potholes, sewage overflows, flooding/standing water, damaged park equipment, hazardous building or wall damage, and other civic infrastructure problems.

CONVERSATIONAL PERSONALITY & BEHAVIOR (ACT LIKE A TRUE AI):
1. Warm, Natural & Flexible:
   - Greet the resident warmly if they say hello or greet you.
   - You are having a natural dialogue, NOT running through a robotic questionnaire.
   - Listen carefully to what the resident actually says. Never rush or jump ahead if the user didn't answer your previous question.

2. Corrections & Changing Minds:
   - If the resident corrects themselves (e.g., "Uh, no sorry that was a mistake. There is a sewage leak" or "Actually, it's a pothole"), immediately acknowledge the correction, update the issue details/category to the new problem, and do NOT treat their correction as an answer to another question (like location or name).
   - Confirm the new problem warmly and ask for the missing details naturally.

3. Reject Off-Topic, Inappropriate & Explicit Requests:
   - If the user asks general or off-topic questions (e.g., general trivia, homework, jokes), answer briefly and politely, and steer the conversation back to reporting their community issue.
   - If the user asks for explicit, offensive, abusive, illegal, or completely unreasonable things, politely and firmly reject the request, state that you are Patch the community infrastructure assistant, and ask how you can help with their neighborhood issue.

4. Handle Digressions & Interruptions:
   - If the user gets sidetracked mid-conversation, remember all the details they already gave you (problem description, location, etc.).
   - Acknowledge their message and guide them back to what is still needed to finish logging their report.

5. Mandatory 4 Details to Complete a Report:
   Before a report can be finalized, you need:
   a. Physical problem description & category (Broken Streetlight, Pothole, Sewage, Flooding, Damaged Park, Damaged Building, or Other Community Issue).
   b. Specific location (street name, house/block number, landmark).
   c. Reporter's full name.
   d. Reporter's valid email address (MANDATORY: explain that ticket confirmation and status updates will be sent to this email). Contact phone is optional.

6. Critical Rules:
   - Ask for missing details one at a time so you don't overwhelm the resident.
   - The "description" field in extracted_data must ONLY describe the physical defect (e.g. "Sewage leaking across the road causing bad odor and hygiene hazard"). NEVER put the resident's personal name, phone number, or email in the description.
   - Do NOT set "is_complete": true until ALL 4 details have been collected and confirmed.

OUTPUT FORMAT:
Always respond strictly with a valid JSON object matching this schema:
{
  "reply": "Your friendly, conversational response to the user here",
  "is_complete": false,
  "extracted_data": null
}

When and ONLY when all 4 details (problem description, location, full name, valid email) have been collected, set:
{
  "reply": "Thank you [Name]! I have officially logged your report for [Category] at [Location]. A confirmation email has been dispatched to [Email] with your ticket details.",
  "is_complete": true,
  "extracted_data": {
    "reporter_name": "Full Name",
    "contact": "Phone Number (or 'Not provided')",
    "email": "user@example.com",
    "location": "Exact Location",
    "category": "Broken Streetlight | Pothole | Sewage | Flooding | Damaged Park | Damaged Building | Other Community Issue",
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
    const { message, history = [], media_urls = [], gps = null } = req.body;

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

      // Candidate models list in priority order to guarantee uptime & quota resilience
      const candidateModels = [
        process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        'gemini-3-flash-preview',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite-preview'
      ];

      for (const model of candidateModels) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents,
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              try {
                rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
                const parsed = JSON.parse(rawText);
                if (parsed && typeof parsed.reply === 'string') {
                  aiResponseJson = parsed;
                  // Sanitize extracted email
                  if (aiResponseJson.extracted_data && aiResponseJson.extracted_data.email) {
                    const emailMatch = aiResponseJson.extracted_data.email.match(EMAIL_REGEX);
                    aiResponseJson.extracted_data.email = emailMatch ? emailMatch[0].toLowerCase() : '';
                  }
                  break; // Succeeded!
                }
              } catch (pe) {
                console.warn(`JSON parse error for model ${model}:`, pe.message);
              }
            }
          } else {
            console.warn(`Gemini model ${model} returned status ${response.status}. Trying next candidate.`);
          }
        } catch (fe) {
          clearTimeout(timeoutId);
          console.warn(`Gemini model ${model} request error (${fe.message}). Trying next candidate.`);
        }
      }
    }

    // Smart conversational engine if Gemini unavailable
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

      // Combine user specified location and GPS side by side if GPS was selected
      const userLocation = data.location || 'Community Area';
      let finalLocation = userLocation;
      let latitude = null;
      let longitude = null;

      const hasGps = gps && (gps.lat !== undefined && gps.lat !== null) && (gps.lng !== undefined && gps.lng !== null);
      if (hasGps) {
        latitude = Number(gps.lat);
        longitude = Number(gps.lng);
        const latStr = latitude.toFixed(5);
        const lngStr = longitude.toFixed(5);
        const gpsLabel = gps.address
          ? `📍 GPS: ${latStr}, ${lngStr} (${gps.address})`
          : `📍 GPS: ${latStr}, ${lngStr}`;
        if (!finalLocation.includes('📍 GPS:')) {
          finalLocation = `${userLocation} · ${gpsLabel}`;
        }
      }

      createdReport = await db.createReport({
        reporter_name: data.reporter_name || 'Resident',
        contact: data.contact || 'Not provided',
        email: cleanEmail,
        location: finalLocation,
        latitude,
        longitude,
        category: data.category || 'Other Community Issue',
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
      reply: 'I experienced an issue processing that. Could you please rephrase or describe what issue you are seeing?',
      is_complete: false
    });
  }
});

/**
 * Intelligent fallback engine with multi-turn intent tracking, correction detection, and active listening
 */
function processFallbackConversation(message, history) {
  // Normalize history into alternating turns
  const turns = [];
  (history || []).forEach(h => {
    turns.push({
      role: (h.sender === 'user' || h.role === 'user') ? 'user' : 'bot',
      text: (h.text || '').trim()
    });
  });
  turns.push({ role: 'user', text: message.trim() });

  const userMessages = turns.filter(t => t.role === 'user').map(t => t.text);
  const currentMsg = message.trim();
  const allUserText = userMessages.join(' ');

  // 1. Check if the user is merely greeting or saying hello without any issue details
  const isGreeting = (str) => {
    const s = str.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const commonGreetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'salam', 'assalam o alaikum', 'assalam', 'greetings', 'help', 'yo', 'hi there', 'hello there'];
    return commonGreetings.includes(s) || (s.length < 15 && /^(hi|hello|hey|help|can you help|i want to report|i have an issue|reporting)/i.test(s) && !/(pothole|light|lamp|road|sewage|drain|water|flood|park|bench|wall|leak|wire|spark)/i.test(s));
  };

  // 2. Reject explicit / abusive requests
  if (/(\bporn\b|\bsex\b|romance story|hack a bank|explicit|violent|weapon|kill)/i.test(currentMsg)) {
    return {
      reply: "I cannot assist with that request. I am Patch, an AI assistant here specifically to help residents report community and infrastructure problems (such as potholes, broken streetlights, or sewage leaks). How can I help you with a neighborhood issue?",
      is_complete: false,
      extracted_data: null
    };
  }

  // 3. Extract clean email
  const emailMatch = allUserText.match(EMAIL_REGEX);
  const cleanEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

  // 4. Extract phone
  const phoneMatch = allUserText.match(PHONE_REGEX);
  const cleanPhone = phoneMatch ? phoneMatch[0].trim() : 'Not provided';

  // 5. Civic problem keywords:
  const issueKeywords = /(pothole|road fracture|broken road|crater|streetlight|street light|light|lamp|pole|dark street|bulb|sewage|drain|gutter|manhole|sewer|water logging|flooding|flood|standing water|puddle|leak|park|bench|swing|playground|wall|damaged building|gate|rubble|debris|garbage|wire|spark)/i;

  // Check for self-correction in user messages (e.g. "sorry that was a mistake", "actually", "no wait")
  const correctionPattern = /(sorry|mistake|actually|no wait|instead|change that)/i;

  let problemMsg = null;
  // Search from latest to earliest so that corrections or updated statements take precedence!
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const msg = userMessages[i];
    if (isGreeting(msg)) continue;
    if (cleanEmail && msg.includes(cleanEmail)) continue;
    if (issueKeywords.test(msg)) {
      problemMsg = msg;
      break;
    }
  }

  // Determine Category based on problem
  let category = 'Other Community Issue';
  const searchText = (problemMsg || allUserText).toLowerCase();
  if (/rubble|debris|garbage|litter|rubbish|trash|waste|junk|scrap|scattered/i.test(searchText)) {
    category = 'Other Community Issue';
  } else if (/streetlight|street light|light|lamp|bulb|dark/i.test(searchText) && !/wire/i.test(searchText)) {
    category = 'Broken Streetlight';
  } else if (/\bpothole\b|\bcrater\b|road fracture|broken road|road damage|cracked road/i.test(searchText)) {
    category = 'Pothole';
  } else if (/sewage|drain|gutter|manhole|sewer|leak|overflow/i.test(searchText)) {
    category = 'Sewage';
  } else if (/flood|water logging|standing water|puddle/i.test(searchText)) {
    category = 'Flooding';
  } else if (/park|bench|swing|playground/i.test(searchText)) {
    category = 'Damaged Park';
  } else if (/building|wall|gate|concrete/i.test(searchText)) {
    category = 'Damaged Building';
  }

  // 6. Extract reporter name
  let reporterName = null;
  const namePattern = /(?:my name is|i am|this is|i'm)\s+([A-Za-z\s]+?)(?:[.,;\n]|$|and\s|my\s|email\s|phone\s|\d)/i;
  const nameMatch = allUserText.match(namePattern);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    reporterName = nameMatch[1].trim().replace(/[.,!]/g, '');
  }

  if (!reporterName) {
    for (let i = 0; i < turns.length - 1; i++) {
      if (turns[i].role === 'bot' && /name/i.test(turns[i].text)) {
        const candidate = turns[i + 1].text.trim().replace(/[.,!]/g, '');
        // Candidate is NOT a name if it's a greeting, an issue description, an email, or contains location words
        if (candidate && !candidate.includes('@') && candidate.length < 40 && !/\d/.test(candidate) &&
            !isGreeting(candidate) && !issueKeywords.test(candidate) && !correctionPattern.test(candidate) &&
            !/(street|road|near|block|sector|gate|avenue)/i.test(candidate)) {
          reporterName = candidate;
          break;
        }
      }
    }
  }

  // 7. Extract Location
  let location = null;
  const locationClues = ['street', 'road', 'block', 'sector', 'near', 'outside', 'gate', 'lane', 'avenue', 'behind', 'opposite', 'corner', 'beside', 'flyover', 'crossing', 'roundabout', 'phase'];

  // Check if bot asked for location
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === 'bot' && /location|where/i.test(turns[i].text)) {
      const candidate = turns[i + 1].text.trim();
      // CRITICAL: A candidate is NOT a location if it is a self-correction or a problem description!
      if (candidate && !candidate.includes('@') && !/my name is/i.test(candidate) && !isGreeting(candidate) &&
          !correctionPattern.test(candidate) && !issueKeywords.test(candidate)) {
        location = candidate.replace(/my name is.*/i, '').replace(/email.*/i, '').trim();
        break;
      }
    }
  }

  // Clue matching in any user message (that isn't purely the problem or email)
  if (!location) {
    for (const msg of userMessages) {
      if (msg === reporterName || (cleanEmail && msg.includes(cleanEmail))) continue;
      if (msg === problemMsg && !/(near|outside|gate|behind|opposite|beside|corner|block|sector|lane)/i.test(msg)) {
        continue;
      }
      const lmsg = msg.toLowerCase();
      if (locationClues.some(clue => lmsg.includes(clue))) {
        let locCandidate = msg.replace(/my name is.*/i, '').replace(/email.*/i, '').trim();
        if (locCandidate.length > 3 && locCandidate !== problemMsg && !issueKeywords.test(locCandidate)) {
          location = locCandidate;
          break;
        }
      }
    }
  }

  // Clean problem description
  let cleanDescription = problemMsg || '';
  if (cleanDescription) {
    cleanDescription = cleanDescription
      .replace(/my name is [A-Za-z\s]+/gi, '')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      .replace(/(\+?\d[\d\s-]{7,15}\d)/g, '')
      .replace(/^(uh|no|sorry|that was a mistake|actually)[,.\s]*/gi, '')
      .trim();
  }

  // -------------------------------------------------------------
  // DIALOGUE FLOW
  // -------------------------------------------------------------

  // Step 1: Greeting or no problem yet
  if (!problemMsg || isGreeting(problemMsg)) {
    return {
      reply: "Hello! Welcome to PatchWork. I'm Patch, your community reporting assistant. Could you please describe what infrastructure issue you'd like to report? (For example: a pothole, broken streetlight, sewage leak, or flooding)",
      is_complete: false,
      extracted_data: null
    };
  }

  // If user just corrected themselves in the latest message
  if (correctionPattern.test(currentMsg)) {
    return {
      reply: `Got it, thank you for clarifying! I've updated your report to ${category !== 'Other Community Issue' ? category.toLowerCase() : 'this issue'}. Where exactly is this located? (Please share the street name, block, or a nearby landmark)`,
      is_complete: false,
      extracted_data: null
    };
  }

  // Step 2: Problem is known, but Location is missing
  if (!location) {
    let problemLabel = category !== 'Other Community Issue' ? category.toLowerCase() : 'this community issue';
    return {
      reply: `I understand, thank you for reporting this ${problemLabel}. Where exactly is this located? (Please share the street name, block, or nearby landmark)`,
      is_complete: false,
      extracted_data: null
    };
  }

  // Step 3: Location is known, but Name is missing
  if (!reporterName) {
    return {
      reply: "Thank you for the location. Could you please share your full name for the report?",
      is_complete: false,
      extracted_data: null
    };
  }

  // Step 4: Name is known, but Email is missing
  if (!cleanEmail) {
    return {
      reply: `Thanks ${reporterName}. Could you please provide your email address? We need this to send your ticket confirmation and live updates.`,
      is_complete: false,
      extracted_data: null
    };
  }

  // Step 5: Everything is collected!
  const finalCategory = category;
  const finalDesc = cleanDescription || `${finalCategory} reported by resident.`;

  return {
    reply: `Thank you ${reporterName}! I have officially logged your report for ${finalCategory} at ${location}. A confirmation email has been dispatched to ${cleanEmail}.`,
    is_complete: true,
    extracted_data: {
      reporter_name: reporterName,
      contact: cleanPhone,
      email: cleanEmail,
      location: location,
      category: finalCategory,
      description: finalDesc,
      severity: /deep|burst|heavy|danger|urgent|critical|pitch black|flooded/i.test(allUserText) ? 'high' : 'medium'
    }
  };
}

module.exports = router;
