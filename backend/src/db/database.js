const fs = require('fs');
const path = require('path');
const { supabase, isConfigured } = require('../services/supabaseService');

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DB_DIR, 'reports.json');

// Ensure local data directory exists for fallback mode
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Running in ephemeral memory storage mode');
}

// In-memory cache synced with storage
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
    console.error('Error loading fallback database:', err.message);
    reports = [];
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving fallback database:', err.message);
  }
}

// Initial fallback load
loadDatabase();

/**
 * Helper to dynamically extract latitude and longitude from location string if not present
 */
function attachGpsCoordinates(report) {
  if (!report) return report;
  if ((report.latitude === undefined || report.latitude === null) ||
      (report.longitude === undefined || report.longitude === null)) {
    const match = (report.location || '').match(/📍\s*GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (match) {
      report.latitude = parseFloat(match[1]);
      report.longitude = parseFloat(match[2]);
    }
  }
  return report;
}

/**
 * Creates a new report and persists to Supabase (with fallback)
 */
async function createReport({
  reporter_name,
  contact,
  email,
  location,
  latitude = null,
  longitude = null,
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
    latitude: latitude !== null && latitude !== undefined ? Number(latitude) : null,
    longitude: longitude !== null && longitude !== undefined ? Number(longitude) : null,
    category: category || 'General Community Issue',
    description: description || '',
    severity,
    media_urls,
    status: 'open',
    verification,
    created_at: now.toISOString(),
    solved_at: null,
    expires_at: null // Stays indefinitely until marked solved
  };

  // Always update local memory cache
  reports.unshift(newReport);
  saveDatabase();

  // Persist to Supabase if available
  if (isConfigured && supabase) {
    try {
      // Exclude latitude and longitude from Supabase payload since the Supabase table schema
      // does not have these columns (coordinates are already cleanly embedded inside the location string)
      const { latitude: _lat, longitude: _lng, ...supabasePayload } = newReport;

      const { data, error } = await supabase
        .from('reports')
        .insert([supabasePayload])
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Supabase insert warning (using local store):', error.message);
      } else if (data) {
        return {
          ...data,
          latitude: newReport.latitude,
          longitude: newReport.longitude
        };
      }
    } catch (err) {
      console.warn('⚠️ Supabase network error on insert (using local store):', err.message);
    }
  }

  return newReport;
}

/**
 * Retrieve a report by ID from Supabase (or memory fallback)
 */
async function getReportById(id) {
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return attachGpsCoordinates(data);
      }
    } catch (err) {
      console.warn('⚠️ Supabase getReportById error, falling back to local store:', err.message);
    }
  }

  const localReport = reports.find(r => r.id === id);
  return localReport ? attachGpsCoordinates(localReport) : null;
}

/**
 * Community Dashboard Query:
 * - Unsolved reports stay on the dashboard indefinitely.
 * - Solved reports disappear 12 hours after being marked solved.
 */
async function getDashboardReports() {
  const now = Date.now();
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  const twelveHoursAgoIso = new Date(now - twelveHoursMs).toISOString();

  if (isConfigured && supabase) {
    try {
      // Fetch open reports, plus solved reports resolved within the last 12 hours
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .or(`status.eq.open,and(status.eq.solved,solved_at.gte.${twelveHoursAgoIso})`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(attachGpsCoordinates);
      } else if (error) {
        console.warn('⚠️ Supabase getDashboardReports error, falling back to local store:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Supabase error on dashboard fetch:', err.message);
    }
  }

  // Local fallback filter
  return reports.filter(r => {
    if (r.status === 'solved' && r.solved_at) {
      const solvedTime = new Date(r.solved_at).getTime();
      return (now - solvedTime) < twelveHoursMs;
    }
    return true;
  }).map(attachGpsCoordinates);
}

/**
 * Mark a report as solved and calculate the 12-hour expiration
 */
async function markReportSolved(id) {
  const now = new Date();
  const solved_at = now.toISOString();
  const expires_at = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

  // Update memory cache
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = 'solved';
    report.solved_at = solved_at;
    report.expires_at = expires_at;
    saveDatabase();
  }

  // Update Supabase
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({
          status: 'solved',
          solved_at,
          expires_at
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return attachGpsCoordinates(data);
      }
    } catch (err) {
      console.warn('⚠️ Supabase markReportSolved error:', err.message);
    }
  }

  return report ? attachGpsCoordinates(report) : null;
}

/**
 * Update advisory AI verification result
 */
async function updateVerification(id, verificationResult) {
  const checked_at = new Date().toISOString();
  const fullVerification = {
    ...verificationResult,
    checked_at
  };

  // Update memory cache
  const report = reports.find(r => r.id === id);
  if (report) {
    report.verification = {
      ...report.verification,
      ...fullVerification
    };
    saveDatabase();
  }

  // Update Supabase
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({ verification: fullVerification })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return attachGpsCoordinates(data);
      }
    } catch (err) {
      console.warn('⚠️ Supabase updateVerification error:', err.message);
    }
  }

  return report ? attachGpsCoordinates(report) : null;
}

module.exports = {
  createReport,
  getReportById,
  getDashboardReports,
  markReportSolved,
  updateVerification,
  _getAllReports: () => reports
};
