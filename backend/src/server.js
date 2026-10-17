const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup: allow frontend connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Body parsing with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded photos and videos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Abuse Protection: General Rate Limiter (100 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter Rate Limiter for Report Submissions (10 reports per hour per IP)
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Submission limit reached. Please wait before reporting another issue.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', generalLimiter);

// Root landing page
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'PatchWork Community Reporting System',
    message: 'Backend server is running live!',
    endpoints: {
      health: '/api/health',
      reports: '/api/reports',
      chat: '/api/chat',
      manager_dashboard: '/api/reports/manager/all',
      vapi_config: '/api/vapi/config',
      upload: '/api/upload'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'PatchWork Backend API',
    timestamp: new Date().toISOString()
  });
});


// Mount Routes
const reportsRouter = require('./routes/reports');
const chatRouter = require('./routes/chat');
const vapiRouter = require('./routes/vapi');
const uploadRouter = require('./routes/upload');

app.use('/api/reports', reportLimiter, reportsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/vapi', vapiRouter);
app.use('/api/upload', uploadRouter);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Express Server locally or export for serverless (Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 PatchWork Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 Production URL: https://patch-work-rho.vercel.app`);
    console.log(`📡 Health Check:   http://localhost:${PORT}/api/health`);
    console.log(`📋 Reports API:    http://localhost:${PORT}/api/reports`);
    console.log(`🎙️ Vapi Webhook:   http://localhost:${PORT}/api/vapi/webhook`);
    console.log(`📸 Uploads:        http://localhost:${PORT}/api/upload`);
    console.log(`==================================================\n`);
  });
}


module.exports = app;

