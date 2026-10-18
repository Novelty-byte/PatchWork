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

        const report = await db.createReport({
          reporter_name: args.reporter_name || 'Resident (Voice Call)',
          contact: args.contact || 'From Voice Session',
          email: args.email || '',
          location: args.location || 'Reported via Voice',
          category: args.category || 'Community Infrastructure',
          description: args.description || 'Voice call ticket',
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

        const report = await db.createReport({
          reporter_name: structuredData.reporter_name || 'Voice Caller',
          contact: structuredData.contact || 'Provided in call',
          email: structuredData.email || '',
          location: structuredData.location || 'Reported during call',
          category: structuredData.category || 'Voice Issue Report',
          description: summary,
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
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling Vapi webhook:', err);
    return res.status(500).json({ error: 'Failed to process Vapi webhook.' });
  }
});

module.exports = router;
