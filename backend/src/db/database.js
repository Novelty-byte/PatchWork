const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DB_DIR, 'reports.json');

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Running in ephemeral memory storage mode');
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
  const id = 'PW-' + Date.now().toString().slice(-6);

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
    // Strictly deleted after 24 hours from the dashboard
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    solved_at: null
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
 * Reports remain on dashboard for 24 hours from creation, then auto-expire.
 */
function getDashboardReports() {
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  return reports.filter(r => {
    const createdTime = new Date(r.created_at).getTime();
    return (now - createdTime) < twentyFourHoursMs;
  });
}

function markReportSolved(id) {
  const report = reports.find(r => r.id === id);
  if (!report) return null;

  report.status = 'solved';
  report.solved_at = new Date().toISOString();

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
