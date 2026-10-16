const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DB_DIR, 'reports.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// In-memory cache synced with JSON storage
let reports = [];

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      reports = JSON.parse(raw || '[]');
    } else {
      reports = [];
      saveDatabase();
    }
  } catch (err) {
    console.error('Error loading database:', err.message);
    reports = [];
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err.message);
  }
}

// Initial load
loadDatabase();

/**
 * Report status lifecycle:
 * - 'open': Report newly created. Auto-expires from dashboard after 24 hours.
 * - 'solved': Manager marked it solved. Replaces 24-hr rule and auto-expires 12 hours after solved_at.
 */

function createReport({
  reporter_name,
  contact,
  email,
  location,
  category,
  description,
  severity = 'medium',
  media_urls = [],
  verification = { status: 'unverified', notes: 'Pending visual check' }
}) {
  const now = new Date();
  const id = 'WF-' + Date.now().toString().slice(-6);

  const newReport = {
    id,
    reporter_name: reporter_name || 'Anonymous Resident',
    contact: contact || 'Not provided',
    email: email || '',
    location: location || 'Location not specified',
    category: category || 'General Community Issue',
    description: description || '',
    severity,
    media_urls,
    status: 'open',
    verification,
    created_at: now.toISOString(),
    // 24 hour deletion from dashboard rule
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    solved_at: null,
    hidden_at: null
  };

  reports.unshift(newReport);
  saveDatabase();
  return newReport;
}

function getReportById(id) {
  return reports.find(r => r.id === id) || null;
}

/**
 * Manager Dashboard Query:
 * Returns active reports adhering to the 24-hr & 12-hr rules:
 * 1. If NOT solved: visible for up to 24 hours from creation.
 * 2. If SOLVED: visible for 12 hours from solved_at, then auto-hidden.
 */
function getDashboardReports() {
  const now = Date.now();

  return reports.filter(r => {
    // If solved: check 12-hour removal window
    if (r.status === 'solved' && r.solved_at) {
      const solvedTime = new Date(r.solved_at).getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      return (now - solvedTime) < twelveHoursMs;
    }

    // If still open: check 24-hour removal window
    const createdTime = new Date(r.created_at).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return (now - createdTime) < twentyFourHoursMs;
  });
}

function markReportSolved(id) {
  const report = reports.find(r => r.id === id);
  if (!report) return null;

  const now = new Date();
  report.status = 'solved';
  report.solved_at = now.toISOString();
  // Solved rule overrides the 24h rule with a 12h countdown
  report.expires_at = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

  saveDatabase();
  return report;
}

function updateVerification(id, verificationResult) {
  const report = reports.find(r => r.id === id);
  if (!report) return null;

  report.verification = {
    ...report.verification,
    ...verificationResult,
    checked_at: new Date().toISOString()
  };

  saveDatabase();
  return report;
}

module.exports = {
  createReport,
  getReportById,
  getDashboardReports,
  markReportSolved,
  updateVerification,
  _getAllReports: () => reports
};
