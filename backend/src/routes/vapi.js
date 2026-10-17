const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { dispatchReportNotifications } = require('../services/emailService');

/**
 * @route   GET /api/vapi/config
 * @desc    Provides assistant configuration to the frontend Web Voice button
 */
router.get('/config', (req, res) => {
  return res.json({
    success: true,
    assistantId: process.env.VAPI_ASSISTANT_ID || null,
    ready: Boolean(process.env.VAPI_ASSISTANT_ID)
  });
});

/**
 * @route   POST /api/vapi/webhook
 * @desc    Receives webhooks from Vapi (function tools or end-of-call summary)
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const message = payload.message || payload;

    console.log(`🎙️ Vapi Webhook received: type = "${message?.type}"`);

    // Handle 1: Tool Call during call (e.g. submit_report tool)
    if (message?.type === 'tool-calls') {
      const toolCall = message.toolCalls?.[0];
      const functionName = toolCall?.function?.name;
      const args = toolCall?.function?.arguments || {};

      if (functionName === 'submit_community_report' || functionName === 'submit_report') {
        const report = await db.createReport({
          reporter_name: args.reporter_name || 'Resident (Voice Call)',
          contact: args.contact || 'From Voice Session',
          email: args.email || '',
          location: args.location || 'Reported via Voice',
          category: args.category || 'Community Infrastructure',
          description: args.description || 'Voice call ticket',
          severity: args.severity || 'medium',
          media_urls: []
        });

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

      if (summary) {
        const report = await db.createReport({
          reporter_name: structuredData.reporter_name || 'Voice Caller',
          contact: structuredData.contact || 'Provided in call',
          email: structuredData.email || '',
          location: structuredData.location || 'Reported during call',
          category: structuredData.category || 'Voice Issue Report',
          description: summary,
          severity: 'medium',
          media_urls: []
        });

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
