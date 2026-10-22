# 🚀 PatchWork Backend API

[![Node.js](https://img.shields.io/badge/Node.js-16.14.2-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-311CFF?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

The backend API for PatchWork - an AI-powered community infrastructure reporting platform. This Node.js/Express server provides RESTful endpoints for report management, AI processing, file uploads, and automated notifications.

## 📋 Overview

The backend serves as the central hub for all PatchWork operations, handling:
- AI-powered report intake and processing
- File storage and media management
- Email notifications and alerts
- Database operations with Supabase integration
- Rate limiting and security measures
- Voice API integration via Vapi

## 🏗️ Architecture

```
backend/
├── src/
│   ├── db/                    # Database layer
│   │   └── database.js       # Main database operations
│   ├── routes/               # API endpoints
│   │   ├── chat.js           # AI chat intake
│   │   ├── reports.js        # Report CRUD operations
│   │   ├── upload.js         # File upload handler
│   │   └── vapi.js          # Voice API integration
│   ├── services/             # Business logic
│   │   ├── emailService.js  # Email notifications
│   │   ├── supabaseService.js # Supabase integration
│   │   └── visionService.js  # AI visual verification
│   └── server.js             # Express server setup
├── data/                     # Local JSON fallback database
│   └── reports.json         # Report storage
├── scripts/                  # Utility scripts
│   └── configureVapi.js     # Vapi configuration
└── package.json             # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16.14.2 or higher
- npm or yarn package manager

### Installation

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the server**
```bash
# Development mode with file watching
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## 🔧 Environment Configuration

Create a `.env` file in the backend directory with the following variables:

### Required Variables
```env
# Server Configuration
PORT=5000
VERCEL=false

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=report-media
```

### Optional Variables
```env
# AI Services
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash

# Email Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
SOCIETY_MANAGER_EMAIL=manager@example.com

# Frontend URL (for email links)
FRONTEND_URL=https://patch-work-app.vercel.app

# Make.com Webhook for automated workflows
MAKE_WEBHOOK_URL=your_webhook_url
```

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```
Returns server status and available endpoints.

### Report Management

#### Create Report (via AI Chat)
```http
POST /api/chat
Content-Type: application/json

{
  "message": "There's a broken streetlight on Street 4",
  "history": [{"sender": "bot", "text": "Hello! Welcome to PatchWork..."}],
  "media_urls": ["https://.../image.jpg"],
  "gps": {"lat": 24.879, "lng": 67.185}
}
```

#### Get Report by ID
```http
GET /api/reports/PW-123456
```

#### Get Dashboard Reports
```http
GET /api/reports/dashboard
```

#### Mark Report as Solved
```http
PATCH /api/reports/PW-123456/solve
```

### File Upload

#### Upload Media
```http
POST /api/upload
Content-Type: multipart/form-data

media: [file]
```

### Voice Integration

#### Get Vapi Configuration
```http
GET /api/vapi/config
```

#### Get Latest Voice Ticket
```http
GET /api/vapi/latest-ticket?call_id=your_call_id
```

## 🗄️ Database

### Primary: Supabase
The backend uses Supabase as the primary database with the following table structure:

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_name TEXT,
  contact TEXT,
  email TEXT,
  location TEXT,
  latitude FLOAT,
  longitude FLOAT,
  category TEXT,
  description TEXT,
  severity TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'open',
  verification JSONB,
  created_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  upvotes INTEGER DEFAULT 0,
  upvote_devices TEXT[]
);
```

### Fallback: Local JSON
If Supabase is not configured, the system falls back to a local JSON file (`data/reports.json`). This is useful for:
- Development and testing
- Offline scenarios
- Simple deployments

## 🤖 AI Features

### Chat Intake Processing
- **Natural Language Understanding**: Extracts structured data from conversations
- **Intent Recognition**: Identifies issue types and categories
- **Entity Extraction**: Pulls location, name, and contact information
- **Correction Handling**: Updates reports when users correct themselves
- **Multi-turn Conversations**: Maintains context throughout the dialogue

### Visual Verification
- **AI Image Analysis**: Uses Gemini Vision to verify uploaded media
- **Category Matching**: Checks if visual evidence matches reported issue
- **Confidence Scoring**: Provides verification status with explanations
- **Fallback Heuristics**: Works without AI API using rule-based checks

### Voice Integration
- **Vapi AI Integration**: Real-time voice processing
- **Automatic Transcription**: Converts speech to text
- **Context Awareness**: Maintains conversation state
- **Error Handling**: Graceful fallbacks for connection issues

## 📧 Email System

### Dual Notification Pipeline
1. **Resident Confirmation**: Ticket receipt and status tracking link
2. **Manager Alert**: Detailed report with media attachments

### Features
- **HTML Templates**: Professional email design
- **Auto-retries**: Exponential backoff for failed sends
- **Simulation Mode**: Logs to console when email not configured
- **Make.com Integration**: Optional webhook for custom workflows

## 🔒 Security Features

### Rate Limiting
```javascript
// General API: 600 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600
});

// Submissions: 40 requests per 15 minutes per IP
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40
});
```

### Data Protection
- **Input Sanitization**: XSS prevention for all inputs
- **CORS Configuration**: Secure cross-origin requests
- **Contact Privacy**: Phone/email omitted from public responses
- **File Validation**: Secure media upload handling

### Authentication
- **Trust Proxy**: Properly handles reverse proxies (Vercel, Cloudflare)
- **Request Size Limits**: Prevents large payload attacks
- **Error Handling**: Secure error messages without sensitive data

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. **Push your code to GitHub**
2. **Connect repository to Vercel**
3. **Configure environment variables**
4. **Deploy**

The `vercel.json` file is pre-configured for optimal performance.

### Manual Deployment

#### Local Development
```bash
npm run dev
```

#### Production
```bash
npm install --production
npm start
```

#### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring

### Health Checks
- **Endpoint**: `/api/health`
- **Response**: Server status and timestamp
- **Usage**: Load balancers and uptime monitors

### Logging
The backend provides comprehensive logging:
- **Request Logging**: Method, path, status code, response time
- **Error Logging**: Stack traces and error messages
- **AI Processing**: Gemini API responses and fallbacks
- **Email Service**: Send status and failures

### Performance Metrics
- **Response Times**: Average API response times
- **Error Rates**: Failed requests and API errors
- **Database Performance**: Query execution times
- **AI Processing**: Token usage and response times

## 🛠️ Development

### Adding New Endpoints
1. Create route file in `src/routes/`
2. Add route to `server.js`
3. Implement business logic in services
4. Add tests

### Database Migrations
For Supabase schema changes:
1. Create migration in Supabase dashboard
2. Update fallback JSON structure
3. Update database.js operations

### Adding AI Features
1. Update system prompts in `routes/chat.js`
2. Add new categories to classification logic
3. Update verification rules in `services/visionService.js`

### Testing
```bash
# Install test dependencies
npm install --dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🔧 Troubleshooting

### Common Issues

#### Supabase Connection Failed
1. Check credentials in `.env`
2. Verify network connectivity
3. Check Supabase project status

#### Email Not Sending
1. Verify Gmail credentials
2. Enable "Less secure apps" or use App Password
3. Check firewall settings

#### AI API Errors
1. Verify Gemini API key
2. Check API quota limits
3. Test with different model versions

### Debug Mode
Set `DEBUG=true` in `.env` for verbose logging.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for better communities**

For support or questions, please open an issue in the main repository.