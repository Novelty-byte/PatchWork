# 🌐 PatchWork - Community Infrastructure Reporting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-16.14.2-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

![PatchWork Logo](https://patch-work-app.vercel.app/patchwork-logo.jpeg)

**PatchWork** is an AI-powered community infrastructure reporting platform that makes it incredibly easy for residents to report neighborhood issues and for managers to track and resolve them efficiently. The platform features zero-form AI intake, voice and chat assistance, and automated manager workflows.

## 🚀 Quick Start

### Live Demo
- **Frontend**: [https://patch-work-app.vercel.app](https://patch-work-app.vercel.app)
- **Backend API**: [https://patch-work-rho.vercel.app](https://patch-work-rho.vercel.app)
- **Dashboard**: [https://patch-work-app.vercel.app/dashboard](https://patch-work-app.vercel.app/dashboard)

### 🏗️ Architecture Overview

PatchWork is a full-stack web application with a modern microservices architecture:

```
PatchWork/
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite SPA
└── data/            # Local JSON database (with Supabase integration)
```

#### Frontend (React + Vite)
- **Framework**: React 18.3.1 with Vite for fast development
- **Routing**: React Router 7.18.4 for SPA navigation
- **UI Components**: Custom-built with Lucide React icons
- **Maps**: Leaflet for interactive maps
- **Voice Calls**: Vapi AI integration for voice-based reporting
- **Styling**: Custom CSS with CSS variables for theming

#### Backend (Node.js + Express)
- **Framework**: Express.js 4.21.2 with CORS support
- **Database**: Supabase (primary) with JSON fallback
- **AI Integration**: Gemini API for intelligent report processing
- **File Storage**: Supabase Storage for media uploads
- **Email Service**: Nodemailer with Gmail integration
- **Rate Limiting**: Express-rate-limit for API protection

## 📋 Core Features

### 🎯 Zero-Form AI Intake
- **No traditional forms required** - residents simply upload photos/videos and describe the issue
- **AI-powered conversation** - The AI assistant (Patch) guides residents through the reporting process
- **Automatic ticket creation** - The AI structures and logs the ticket automatically

### 📱 Dual Reporting Modes
1. **Chat Interface**: Text-based conversation with AI assistant
2. **Voice Call**: In-browser AI voice assistant (powered by Vapi)

### 🗺️ Community Dashboard
- **Public and accessible** - No login required for residents
- **Real-time updates** - Live status tracking with auto-refresh
- **Interactive maps** - Visual representation of reported issues
- **Community upvoting** - Residents can confirm issues affecting them
- **Smart filtering** - Filter by category, severity, and status

### 🔒 Privacy & Security
- **Contact details never exposed** - Phone and email only shared with society manager
- **CORS-enabled** - Secure API communication
- **Rate limiting** - Protection against abuse
- **Data sanitization** - Public endpoints omit sensitive information

### 🤖 AI-Powered Features
- **Intelligent report categorization** - Automatically identifies issue types
- **Visual verification** - AI checks uploaded media for authenticity
- **Natural language processing** - Understands and extracts structured data from conversations
- **Smart location extraction** - GPS and manual location input support

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - UI framework
- **Vite 5.4.11** - Build tool and dev server
- **React Router 7.18.4** - Client-side routing
- **Leaflet 1.9.4** - Interactive maps
- **Lucide React 0.468.0** - Icon library
- **Vapi AI 2.0.0** - Voice integration

### Backend
- **Node.js 16.14.2** - Runtime environment
- **Express.js 4.21.2** - Web framework
- **Supabase 2.118.0** - Database and storage
- **Multer 1.4.5** - File upload handling
- **Nodemailer 6.10.0** - Email service
- **CORS 2.8.5** - Cross-origin support
- **Express-rate-limit 7.5.0** - Rate limiting

### AI Services
- **Gemini API** - AI for report processing and verification
- **Vapi AI** - Voice assistant integration

## 📁 Project Structure

```
PatchWork/
├── backend/                          # Backend API Server
│   ├── src/                         # Source code
│   │   ├── db/                      # Database operations
│   │   │   └── database.js          # Main database module
│   │   ├── routes/                  # API routes
│   │   │   ├── chat.js             # AI chat intake
│   │   │   ├── reports.js          # Report CRUD operations
│   │   │   ├── upload.js           # File upload handler
│   │   │   └── vapi.js            # Voice API integration
│   │   ├── services/               # Business logic
│   │   │   ├── emailService.js     # Email notifications
│   │   │   ├── supabaseService.js  # Supabase integration
│   │   │   └── visionService.js   # AI visual verification
│   │   └── server.js               # Express server setup
│   ├── data/                       # Local JSON database
│   │   └── reports.json           # Report storage
│   ├── scripts/                     # Utility scripts
│   │   └── configureVapi.js        # Vapi configuration
│   ├── package.json                 # Dependencies
│   ├── .env.example                # Environment variables
│   └── vercel.json                # Vercel deployment config
│
├── frontend/                        # Frontend React Application
│   ├── src/                        # Source code
│   │   ├── components/             # React components
│   │   │   ├── UploadCard.jsx      # Media upload interface
│   │   │   ├── ChatPanel.jsx       # Chat conversation UI
│   │   │   ├── VoicePanel.jsx      # Voice call interface
│   │   │   ├── DashboardMap.jsx    # Interactive map
│   │   │   ├── ManagerPage.jsx     # Community dashboard
│   │   │   ├── StatusPage.jsx      # Report status tracking
│   │   │   └── ...                # Other components
│   │   ├── pages/                  # Page components
│   │   │   ├── Landing.jsx         # Main report page
│   │   │   ├── ManagerPage.jsx     # Dashboard page
│   │   │   └── StatusPage.jsx      # Status tracking page
│   │   ├── services/               # API service modules
│   │   │   ├── api.js              # Main API client
│   │   │   ├── managerApi.js       # Dashboard API
│   │   │   └── statusApi.js        # Status tracking API
│   │   ├── styles/                 # CSS modules
│   │   ├── utils/                  # Utility functions
│   │   └── hooks/                  # Custom React hooks
│   ├── public/                     # Static assets
│   ├── package.json                # Dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── vercel.json                # Vercel deployment config
│   └── README.md                   # Frontend documentation
│
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16.14.2 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/patchwork.git
cd patchwork
```

2. **Install backend dependencies**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Environment Configuration

#### Backend (.env)
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=report-media

# AI Services
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash

# Email Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
SOCIETY_MANAGER_EMAIL=manager@example.com

# Frontend URL (for email links)
FRONTEND_URL=https://patch-work-app.vercel.app

# Optional: Make.com Webhook
MAKE_WEBHOOK_URL=your_webhook_url
```

#### Frontend (.env)
```env
# Backend API URL
VITE_API_URL=https://patch-work-rho.vercel.app

# Optional: Use mock data for testing
VITE_USE_MOCK=false
```

## 📊 Data Flow

### Reporting Process
1. **Media Upload**: Resident uploads photos/videos (optional)
2. **GPS Location Upload**: Resident upload the location of the problem by either choosing current location or by panning and selecting through the map (Best to set)
3. **AI Intake**: Resident chooses chat or voice mode to describe the issue
4. **AI Processing**: AI extracts structured data (category, location, name, email)
5. **Ticket Creation**: System creates a report with unique ID (PW-XXXXXX)
6. **Verification**: AI checks uploaded media for authenticity
7. **Notifications**: Email sent to resident and manager
8. **Dashboard Update**: Report appears on community dashboard

### Dashboard Workflow
1. **Live Updates**: Dashboard auto-refreshes every 30 seconds
2. **Community Interaction**: Residents can upvote/confirm issues
3. **Resolution**: Any user can mark issues as solved
4. **Auto-removal**: Solved reports disappear after 12 hours
5. **Filtering**: Users can filter by category, severity, and status

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `POST /api/upload` - Media upload
- `POST /api/chat` - AI chat intake
- `GET /api/vapi/config` - Voice configuration
- `GET /api/reports/:id` - Get report by ID
- `GET /api/reports/dashboard` - Get dashboard reports
- `PATCH /api/reports/:id/solve` - Mark report as solved

### Response Formats
All endpoints return JSON with consistent structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

## 🎨 UI/UX Features

### Design System
- **Responsive design** - Works on all device sizes
- **Dark/Light mode** - Theme toggle support
- **Accessibility** - ARIA labels and keyboard navigation
- **Animations** - Smooth transitions and micro-interactions
- **Visual feedback** - Loading states and success indicators

### Key UI Components
- **Step tracker** - Visual progress indicator
- **Upload zone** - Drag-and-drop file upload
- **Chat interface** - Real-time conversation UI
- **Voice button** - One-click voice activation
- **Report cards** - Rich display of issue information
- **Interactive maps** - Visual issue mapping
- **Status badges** - Clear issue status indicators

## 📈 Monitoring & Analytics

### Built-in Metrics
- **Response time tracking** - Average resolution time
- **Issue categorization** - Distribution by type
- **Community engagement** - Upvote and confirmation rates
- **AI verification accuracy** - Success rate of visual checks

### Dashboard Statistics
- Active open reports
- Resolved today
- New reports in last hour
- AI verification percentage
- Community confirmation count

## 🔒 Security Considerations

### Data Protection
- **Contact privacy** - Phone/email only shared with manager
- **Rate limiting** - Prevents API abuse
- **CORS configuration** - Secure cross-origin requests
- **Input sanitization** - XSS prevention
- **File validation** - Secure media uploads

### Privacy Features
- **Anonymous reporting** - Optional name and contact details
- **Data retention** - Solved reports auto-remove after 12 hours
- **Secure email** - Encrypted notifications
- **GPS privacy** - Optional location sharing

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. **Backend**
```bash
cd backend
vercel --prod
```

2. **Frontend**
```bash
cd frontend
vercel --prod
```

### Manual Deployment
1. **Backend**
```bash
cd backend
npm run build
npm start
```

2. **Frontend**
```bash
cd frontend
npm run build
npm run preview
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Gemini AI** - For intelligent report processing
- **Vapi AI** - For voice integration
- **Supabase** - For database and storage solutions
- **Leaflet** - For interactive mapping
- **Lucide** - For beautiful icons

---

**Made with ❤️ by the PatchWork team**

For questions, suggestions, or support, please open an issue or contact us at [support@patchwork.com](mailto:support@patchwork.com).
