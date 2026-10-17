const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { dispatchReportNotifications } = require('../services/emailService');
const { verifyMediaReport } = require('../services/visionService');

/**
 * @route   POST /api/reports
 * @desc    Submit a new community report (from Web Form, Botpress, or Voice)
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

    // 1. Perform automated media verification check
    const verification = await verifyMediaReport(media_urls, category, description);

    // 2. Persist to Database / CRM
    const report = db.createReport({
      reporter_name,
      contact,
      email,
      location,
      category,
      description,
      severity,
      media_urls,
      verification
    });

    // 3. Dispatch automated dual emails (Confirmation to reporter + Alert to manager)
    dispatchReportNotifications(report);

    return res.status(201).json({
      success: true,
      message: 'Report logged successfully and notification automations triggered.',
      report
    });
  } catch (err) {
    console.error('Error creating report:', err);
    return res.status(500).json({ success: false, error: 'Internal server error while logging report.' });
  }
});

/**
 * @route   GET /api/reports/:id
 * @desc    Get report status and details by Ticket ID (For Resident Status Page)
 */
router.get('/:id', (req, res) => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Ticket not found.' });
  }
  return res.json({ success: true, report });
});

/**
 * @route   GET /api/manager/reports
 * @desc    List open community reports for Manager Dashboard (24hr / 12hr rules applied)
 */
router.get('/manager/all', (req, res) => {
  const dashboardReports = db.getDashboardReports();
  return res.json({
    success: true,
    count: dashboardReports.length,
    reports: dashboardReports
  });
});

/**
 * @route   PATCH /api/manager/reports/:id/solve
 * @desc    Mark report as solved (Removes report from panel 12 hours later)
 */
router.patch('/manager/:id/solve', (req, res) => {
  const updated = db.markReportSolved(req.params.id);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Report not found.' });
  }

  return res.json({
    success: true,
    message: 'Report marked as solved successfully.',
    report: updated
  });
});


module.exports = router;
