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

const applySubmissionLimiter = (req, res, next) => {
  if (req.app?.locals?.submissionLimiter) {
    return req.app.locals.submissionLimiter(req, res, next);
  }
  next();
};

/**
 * @route   POST /api/reports
 * @desc    Submit a new community report (Web Form, Chatbot, or Voice)
 */
router.post('/', applySubmissionLimiter, async (req, res) => {
  try {
    const {
      reporter_name,
      contact,
      email,
      location,
      latitude = null,
      longitude = null,
      gps = null,
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

    // Combine user specified location and GPS side by side if GPS was provided
    let finalLocation = location || 'Location not specified';
    let lat = latitude;
    let lng = longitude;

    if (gps && (gps.lat !== undefined && gps.lat !== null) && (gps.lng !== undefined && gps.lng !== null)) {
      lat = Number(gps.lat);
      lng = Number(gps.lng);
      if (!finalLocation.includes('📍 GPS:')) {
        const latStr = lat.toFixed(5);
        const lngStr = lng.toFixed(5);
        const gpsLabel = gps.address
          ? `📍 GPS: ${latStr}, ${lngStr} (${gps.address})`
          : `📍 GPS: ${latStr}, ${lngStr}`;
        finalLocation = `${finalLocation} · ${gpsLabel}`;
      }
    } else if (lat !== null && lng !== null && !finalLocation.includes('📍 GPS:')) {
      finalLocation = `${finalLocation} · 📍 GPS: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    }

    // 1. Reports are saved first: A report is stored before any AI or email step runs
    const initialVerification = (media_urls && media_urls.length > 0)
      ? { label: 'unclear', reason: 'Analyzing visual evidence...' }
      : { label: 'skipped', reason: 'No photo or video attached with this report.' };

    const report = await db.createReport({
      reporter_name,
      contact,
      email,
      location: finalLocation,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
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
 * @route   GET /api/reports/nearby
 * @desc    Find open reports within radius (default 100m) of a GPS coordinate
 * @query   lat, lng, radius (metres, optional)
 */
router.get('/nearby', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 100;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, error: 'lat and lng query parameters are required.' });
  }

  try {
    const nearby = db.getNearbyReports(lat, lng, radius);
    return res.json({ success: true, count: nearby.length, reports: nearby.map(sanitizeForPublic) });
  } catch (err) {
    console.error('Error fetching nearby reports:', err);
    return res.status(500).json({ success: false, error: 'Failed to find nearby reports.' });
  }
});


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
/**
 * @route   POST /api/reports/:id/upvote
 * @desc    Toggle upvote on a report (one per device per report, de-upvote if already voted)
 */
router.post('/:id/upvote', async (req, res) => {
  // Identify device by custom header, then IP
  const deviceId = req.headers['x-device-id'] || req.ip || 'unknown';

  try {
    const result = await db.upvoteReport(req.params.id, deviceId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }
    return res.json({ success: true, upvotes: result.upvotes, voted: result.voted });
  } catch (err) {
    console.error('Error upvoting report:', err);
    return res.status(500).json({ success: false, error: 'Failed to process upvote.' });
  }
});

module.exports = router;