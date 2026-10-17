const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { dispatchReportNotifications } = require('../services/emailService');
const { verifyMediaReport } = require('../services/visionService');

/**
 * Privacy Safeguard:
 * Reporter's phone number and email are NEVER exposed on the public website/dashboard.
 * They are only transmitted via private email to the manager.
 */
function sanitizeForPublic(report) {
  if (!report) return null;
  const { contact, email, phone, ...safe } = report;
  return safe;
}

/**
 * @route   POST /api/reports
 * @desc    Submit a new community report (Web Form, Chatbot, or Voice)
 */
router.post('/', async (req, res) => {
  try {
    const {
      reporter_name,
      contact,
      email,
      location,
      category,
      description,
      severity = 'medium',
      media_urls = []
    } = req.body;

    if (!category && !description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least a problem category or description.'
      });
    }

    // 1. Reports are saved first: A report is stored before any AI or email step runs
    const initialVerification = (media_urls && media_urls.length > 0)
      ? { label: 'unclear', reason: 'Analyzing visual evidence...' }
      : { label: 'skipped', reason: 'No photo or video attached with this report.' };

    const report = await db.createReport({
      reporter_name,
      contact,
      email,
      location,
      category,
      description,
      severity,
      media_urls,
      verification: initialVerification
    });

    // 2. Advisory visual verification runs asynchronously if media is attached
    if (media_urls && media_urls.length > 0) {
      verifyMediaReport(media_urls, category, description)
        .then(async (verificationResult) => {
          await db.updateVerification(report.id, verificationResult);
        })
        .catch(err => console.error('Verification error:', err.message));
    }

    // 3. Dispatch automated dual emails via Make.com with full private reporter contact
    dispatchReportNotifications(report);

    return res.status(201).json({
      success: true,
      message: 'Report logged successfully and notification automations triggered.',
      report: sanitizeForPublic(report)
    });
  } catch (err) {
    console.error('Error creating report:', err);
    return res.status(500).json({ success: false, error: 'Internal server error while logging report.' });
  }
});

/**
 * Handler for Dashboard listing
 */
const handleDashboard = async (req, res) => {
  try {
    const dashboardReports = await db.getDashboardReports();
    return res.json({
      success: true,
      count: dashboardReports.length,
      reports: dashboardReports.map(sanitizeForPublic)
    });
  } catch (err) {
    console.error('Error fetching dashboard reports:', err);
    return res.status(500).json({ success: false, error: 'Failed to load community dashboard.' });
  }
};

/**
 * @route   GET /api/reports/dashboard
 * @desc    Public community dashboard: open reports stay indefinitely; solved reports stay 12 hours
 */
router.get('/dashboard', handleDashboard);

/**
 * @route   GET /api/reports/:id
 * @desc    Get report status and details by Ticket ID (Public Status Page)
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }
    return res.json({ success: true, report: sanitizeForPublic(report) });
  } catch (err) {
    console.error('Error fetching report:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve ticket.' });
  }
});

/**
 * Handler for marking report solved
 */
const handleSolve = async (req, res) => {
  try {
    const updated = await db.markReportSolved(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    return res.json({
      success: true,
      message: 'Report marked as solved. It will disappear from the dashboard in 12 hours.',
      report: sanitizeForPublic(updated)
    });
  } catch (err) {
    console.error('Error marking report solved:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark report as solved.' });
  }
};

/**
 * @route   PATCH /api/reports/:id/solve
 * @desc    One-click mark solved (triggers 12-hour removal countdown)
 */
router.patch('/:id/solve', handleSolve);

module.exports = router;
