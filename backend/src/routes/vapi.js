const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { dispatchReportNotifications } = require('../services/emailService');
const { verifyMediaReport } = require('../services/visionService');

// In-memory cache for recent voice tickets to support frontend auto-navigation
let latestVoiceTicket = null;
const callTicketMap = new Map();

/**
 * @route   GET /api/vapi/config
 * @desc    Provides assistant configuration to the frontend Web Voice button
 */
router.get('/config', (req, res) => {
  return res.json({
    success: true,
    publicKey: process.env.VAPI_PUBLIC_KEY || null,
    assistantId: process.env.VAPI_ASSISTANT_ID || null,
    ready: Boolean(process.env.VAPI_ASSISTANT_ID)
  });
});

/**
 * @route   GET /api/vapi/latest-ticket
 * @desc    Returns the most recent ticket created via voice call (fallback for frontend redirect)
 */
router.get('/latest-ticket', (req, res) => {
  const callId = req.query.call_id;
  if (callId && callTicketMap.has(callId)) {
    return res.json({
      success: true,
      ticket_id: callTicketMap.get(callId),
      matched_call: true
    });
  }

  return res.json({
    success: true,
    ticket_id: latestVoiceTicket?.ticket_id || null,
    created_at: latestVoiceTicket?.created_at || null
  });
});

/**
 * Helper to extract media_urls from Vapi call payload
 */
function extractMediaUrls(message, args) {
  let urls = args?.media_urls || 
             message?.call?.variableValues?.media_urls || 
             message?.call?.assistantOverrides?.variableValues?.media_urls || 
             [];

  if (typeof urls === 'string') {
    urls = urls.split(',').map(s => s.trim()).filter(Boolean);
  }
  return Array.isArray(urls) ? urls : [];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function classifyVoiceCategory(category, text) {
  if (category && !/^(Voice Issue Report|Voice Issue|Community Infrastructure|Voice Call Ticket)$/i.test(category.trim())) {
    return category.trim();
  }
  const t = (text || '').toLowerCase();
  if (/streetlight|street light|light|lamp|pole|dark street|bulb/i.test(t)) return 'Broken Streetlight';
  if (/pothole|crater|asphalt|road fracture|broken road/i.test(t)) return 'Pothole';
  if (/sewage|drain|gutter|manhole|sewer/i.test(t)) return 'Sewage';
  if (/flood|flooding|water logging|standing water|puddle/i.test(t)) return 'Flooding';
  if (/park|bench|swing|playground|grass/i.test(t)) return 'Damaged Park';
  if (/building|wall|gate|concrete|pillar/i.test(t)) return 'Damaged Building';
  return 'Other Community Issue';
}

function cleanVoiceDescription(rawDesc, summary, category) {
  let text = (rawDesc && rawDesc !== 'Voice call ticket' ? rawDesc : summary) || '';
  if (!text) {
    return `Civic infrastructure fault reported via voice call (${category || 'Community Issue'}).`;
  }

  // Split into sentences and drop meta-call narrative
  const sentences = text.split(/(?<=[.!?])\s+/);
  const cleanSentences = sentences.filter(s => {
    return !/provided their name|provided.*email|email address for ticket|ticket was generated|ticket confirmation|successfully submitted|call ended|caller provided|user provided/i.test(s);
  });

  let result = cleanSentences.join(' ')
    .replace(/^The (user|caller|resident) called to report (a|an|the)?\s*/i, '')
    .replace(/^The (user|caller|resident) reported (a|an|the)?\s*/i, '')
    .trim();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  } else {
    result = `${category || 'Civic infrastructure fault'} reported via voice call.`;
  }
  return result;
}

/**
 * @route   POST /api/vapi/webhook
 * @desc    Receives webhooks from Vapi (function tools or end-of-call summary)
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const message = payload.message || payload;
    const callId = message?.call?.id;

    console.log(`🎙️ Vapi Webhook received: type = "${message?.type}"`);

    // Handle 1: Tool Call during call (e.g. submit_report tool)
    if (message?.type === 'tool-calls') {
      const toolCall = message.toolCalls?.[0];
      const functionName = toolCall?.function?.name;
      const args = toolCall?.function?.arguments || {};

      if (functionName === 'submit_community_report' || functionName === 'submit_report') {
        const media_urls = extractMediaUrls(message, args);

        const initialVerification = (media_urls && media_urls.length > 0)
          ? { label: 'unclear', reason: 'Analyzing visual evidence...' }
          : { label: 'skipped', reason: 'No photo or video attached with this report.' };

        const vars = message?.call?.variableValues || message?.call?.assistantOverrides?.variableValues || {};
        const gpsText = args.gps_text || vars.gps_text || null;
        const gpsLat = args.gps_lat || vars.gps_lat || null;
        const gpsLng = args.gps_lng || vars.gps_lng || null;

        const rawCategory = args.category || '';
        const rawDesc = args.description || '';
        const resolvedCategory = classifyVoiceCategory(rawCategory, rawDesc);
        const resolvedDesc = cleanVoiceDescription(rawDesc, null, resolvedCategory);

        const voiceLocation = args.location || 'Reported via Voice';
        const finalLocation = gpsText && !voiceLocation.includes('📍 GPS:')
          ? `${voiceLocation} · ${gpsText}`
          : voiceLocation;

        const report = await db.createReport({
          reporter_name: args.reporter_name || 'Resident (Voice Call)',
          contact: args.contact || 'From Voice Session',
          email: args.email || '',
          location: finalLocation,
          latitude: gpsLat ? Number(gpsLat) : null,
          longitude: gpsLng ? Number(gpsLng) : null,
          category: resolvedCategory,
          description: resolvedDesc,
          severity: args.severity || 'medium',
          media_urls,
          verification: initialVerification
        });

        // Store for frontend lookup
        latestVoiceTicket = { ticket_id: report.id, created_at: new Date().toISOString() };
        if (callId) callTicketMap.set(callId, report.id);

        // Advisory visual verification if media attached
        if (media_urls && media_urls.length > 0) {
          verifyMediaReport(media_urls, report.category, report.description)
            .then(async (verificationResult) => {
              await db.updateVerification(report.id, verificationResult);
            })
            .catch(err => console.warn('Voice media verification error:', err.message));
        }

        // Trigger emails
        dispatchReportNotifications(report);

        return res.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: `Report created successfully with Ticket ID: ${report.id}. Confirmation email dispatched.`
            }
          ]
        });
      }
    }

    // Handle 2: End-of-call report (structured extraction)
    if (message?.type === 'end-of-call-report') {
      const summary = message.summary || message.analysis?.summary;
      const structuredData = message.analysis?.structuredData || {};

      // If a tool call already created a ticket for this call, don't duplicate
      if (callId && callTicketMap.has(callId)) {
        return res.status(200).json({ received: true, already_created: true });
      }

      if (summary) {
        const media_urls = extractMediaUrls(message, structuredData);

        const vars = message?.call?.variableValues || message?.call?.assistantOverrides?.variableValues || {};
        const gpsText = structuredData.gps_text || vars.gps_text || null;
        const gpsLat = structuredData.gps_lat || vars.gps_lat || null;
        const gpsLng = structuredData.gps_lng || vars.gps_lng || null;

        // Intelligent category classification & clean description extraction
        const resolvedCategory = classifyVoiceCategory(structuredData.category, summary);
        const resolvedDesc = cleanVoiceDescription(structuredData.description, summary, resolvedCategory);

        // Extract missing contact/name/location from summary if not in structuredData
        let extractedEmail = structuredData.email || '';
        if (!extractedEmail) {
          const match = summary.match(EMAIL_REGEX);
          if (match) extractedEmail = match[0].toLowerCase();
        }

        let extractedName = structuredData.reporter_name || '';
        if (!extractedName) {
          const nameMatch = summary.match(/name as ([A-Za-z\s]+?)(?:\s+and|\s+with|\s+email|\.|$)/i);
          if (nameMatch) extractedName = nameMatch[1].trim();
        }

        let extractedLoc = structuredData.location || '';
        if (!extractedLoc) {
          const locMatch = summary.match(/(?:near|at|on|outside|behind|in)\s+([A-Za-z0-9\s-]+?)(?:\.|\s+They|\s+The\s+user|$)/i);
          if (locMatch) extractedLoc = locMatch[0].trim().replace(/\.$/, '');
        }

        const voiceLocation = extractedLoc || 'Reported during call';
        const finalLocation = gpsText && !voiceLocation.includes('📍 GPS:')
          ? `${voiceLocation} · ${gpsText}`
          : voiceLocation;

        const report = await db.createReport({
          reporter_name: extractedName || 'Voice Caller',
          contact: structuredData.contact || 'Provided in call',
          email: extractedEmail || '',
          location: finalLocation,
          latitude: gpsLat ? Number(gpsLat) : null,
          longitude: gpsLng ? Number(gpsLng) : null,
          category: resolvedCategory,
          description: resolvedDesc,
          severity: structuredData.severity || 'medium',
          media_urls
        });

        latestVoiceTicket = { ticket_id: report.id, created_at: new Date().toISOString() };
        if (callId) callTicketMap.set(callId, report.id);

        if (media_urls && media_urls.length > 0) {
          verifyMediaReport(media_urls, report.category, report.description)
            .then(async (res) => {
              await db.updateVerification(report.id, res);
            })
            .catch(e => console.warn(e.message));
        }

        dispatchReportNotifications(report);

        return res.status(200).json({ received: true, report_id: report.id });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling Vapi webhook:', err);
    return res.status(500).json({ error: 'Failed to process Vapi webhook.' });
  }
});

module.exports = router;
