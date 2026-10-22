# 🌐 PatchWork Frontend

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)

The frontend for PatchWork - an AI-powered community infrastructure reporting platform. This React/Vite Single Page Application (SPA) provides an intuitive interface for residents to report neighborhood issues and track their status.

## 📋 Overview

The frontend is a modern, responsive web application that provides:

### Core Features
- **Zero-Form AI Intake**: Report issues through natural conversation
- **Dual Reporting Modes**: Chat interface or voice calls with AI
- **Real-time Dashboard**: Live community issue tracking
- **Status Tracking**: Monitor report resolution progress
- **Interactive Maps**: Visual representation of reported issues
- **Community Engagement**: Upvote and confirm issues

### User Experience
- **Responsive Design**: Works seamlessly on all devices
- **Dark/Light Mode**: Theme toggle for comfortable viewing
- **Accessibility**: ARIA labels and keyboard navigation
- **Smooth Animations**: Micro-interactions and transitions
- **Offline Support**: Mock mode for testing without backend

## 🏗️ Architecture

```
frontend/
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── UploadCard.jsx      # Media upload interface
│   │   ├── ChatPanel.jsx       # AI chat conversation
│   │   ├── VoicePanel.jsx      # Voice call interface
│   │   ├── DashboardMap.jsx    # Interactive map view
│   │   ├── ManagerPage.jsx     # Community dashboard
│   │   ├── StatusPage.jsx      # Report status tracking
│   │   └── ...                # Other components
│   ├── pages/                  # Page components
│   │   ├── Landing.jsx         # Main report page (/)
│   │   ├── ManagerPage.jsx     # Dashboard page (/dashboard)
│   │   └── StatusPage.jsx      # Status page (/status/:id)
│   ├── services/               # API service modules
│   │   ├── api.js              # Main API client
│   │   ├── managerApi.js       # Dashboard API calls
│   │   └── statusApi.js        # Status tracking API
│   ├── styles/                 # CSS modules and styles
│   ├── utils/                  # Utility functions
│   └── hooks/                  # Custom React hooks
├── public/                     # Static assets
└── package.json                # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16.14.2 or higher
- npm or yarn package manager

### Installation

1. **Navigate to frontend directory**
```bash
cd frontend
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

4. **Start development server**
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`.

## 🔧 Environment Configuration

Create a `.env` file in the frontend directory:

```env
# Backend API URL
VITE_API_URL=https://patch-work-rho.vercel.app

# Optional: Use mock data for testing (no backend required)
VITE_USE_MOCK=false
```

## 📱 Pages and Features

### 1. Main Report Page (`/`)
The primary interface for reporting neighborhood issues.

#### Features:
- **Media Upload**: Drag-and-drop or click to upload photos/videos (max 5 files, 25MB each)
- **GPS Location**: Optional location picker with address lookup
- **AI Chat Interface**: Text-based conversation with Patch AI
- **Voice Call**: One-click voice reporting with Vapi AI
- **Progress Tracking**: Visual step indicator

#### User Flow:
1. Upload media (optional)
2. Choose reporting mode (Chat or Voice)
3. Describe the issue to AI
4. Provide contact information
5. Receive confirmation with ticket ID

### 2. Status Tracking Page (`/status/:id`)
View the current status of a reported issue.

#### Features:
- **Ticket Details**: Complete report information
- **Status Updates**: Real-time status changes
- **Media Gallery**: View uploaded photos/videos
- **Location Map**: Interactive map view
- **AI Verification**: Visual evidence check results

### 3. Community Dashboard (`/dashboard`)
Live community dashboard showing all active and recently resolved issues.

#### Features:
- **Real-time Updates**: Auto-refreshes every 30 seconds
- **Interactive Filtering**: By category, severity, and status
- **Map View**: Visual representation of issue locations
- **Community Upvotes**: Confirm issues affecting you
- **Quick Actions**: Mark issues as solved
- **Statistics**: Live metrics and trends

## 🎨 UI Components

### Core Components

#### UploadCard
- Drag-and-drop file upload
- File validation (types, size limits)
- Progress indicators
- Preview thumbnails
- GPS location picker

#### ChatPanel
- Real-time conversation UI
- Message history
- Quick reply suggestions
- Typing indicators
- Auto-scroll to new messages

#### VoicePanel
- One-click voice activation
- Call status indicators
- Real-time transcription
- Error handling and fallbacks

#### DashboardMap
- Interactive Leaflet map
- Issue markers with categories
- Cluster for dense areas
- Popup details on click
- Responsive design

### Design System
- **CSS Variables**: Consistent theming
- **Responsive Breakpoints**: Mobile, tablet, desktop
- **Dark Mode**: Toggle between light/dark themes
- **Accessibility**: ARIA labels, keyboard navigation
- **Animations**: Smooth transitions and micro-interactions

## 🤖 AI Integration

### Chat Interface
- **Natural Language Processing**: Understands user descriptions
- **Intent Recognition**: Identifies issue types automatically
- **Entity Extraction**: Pulls location, name, and contact info
- **Context Awareness**: Maintains conversation flow
- **Correction Handling**: Updates when users clarify

### Voice Interface
- **Vapi AI Integration**: Real-time voice processing
- **Automatic Transcription**: Speech to text conversion
- **Context Preservation**: Maintains conversation state
- **Error Recovery**: Graceful fallbacks for connection issues

## 📡 API Integration

### Service Modules

#### api.js (Main Reporting)
```javascript
// Upload media
uploadFile(file, onProgress)

// Send chat message
sendChat({ message, history, media_urls, gps })

// Get voice configuration
getVapiConfig()
```

#### managerApi.js (Dashboard)
```javascript
// Fetch dashboard reports
fetchReports()

// Mark report as solved
markSolved(id)

// Upvote/confirm report
upvoteReport(id)
```

#### statusApi.js (Status Tracking)
```javascript
// Get report by ID
getReport(id)

// Upvote report
upvoteReport(id)
```

### Mock Mode
Set `VITE_USE_MOCK=true` to test without backend:
- Simulated API responses
- Fake data generation
- Local state management
- No network dependency

## 🗺️ Map Integration

### Leaflet Configuration
- **Tile Layer**: OpenStreetMap tiles
- **Custom Markers**: Category-specific icons
- **Popups**: Rich issue information
- **Clustering**: Performance optimization for dense areas
- **Responsive**: Adapts to container size

### Location Features
- **GPS Support**: Automatic location detection
- **Address Lookup**: Reverse geocoding
- **Manual Input**: Type custom locations
- **Visual Markers**: Color-coded by category

## 📊 State Management

### Local State
- **React useState**: Component-level state
- **useRef**: DOM references and persistence
- **Custom Hooks**: Reusable state logic

### Data Persistence
- **localStorage**: User preferences and votes
- **Session Storage**: Temporary state
- **Cache API**: Optimistic updates

## 🎯 Performance Optimizations

### Code Splitting
- **Dynamic Imports**: Lazy load components
- **Route-based Splitting**: Split by page
- **Component-level Splitting**: Large components

### Caching Strategies
- **API Response Caching**: Avoid duplicate requests
- **Local Storage Cache**: Preserve data between sessions
- **Service Worker**: Future offline support

### Rendering Optimizations
- **React.memo**: Prevent unnecessary re-renders
- **useCallback**: Stable function references
- **Virtual Scrolling**: For large lists

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set Environment Variables**
4. **Deploy**

The `vercel.json` file is pre-configured for:
- Static file serving
- Environment variables
- Build optimization

### Manual Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 🔧 Development

### Adding New Features
1. Create component in `src/components/`
2. Add page in `src/pages/`
3. Implement API calls in `src/services/`
4. Add styles in `src/styles/`

### Styling Guidelines
- Use CSS variables for theming
- Follow BEM naming convention
- Responsive design with mobile-first
- Accessibility considerations

### Testing
```bash
# Install test dependencies
npm install --dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📱 Mobile Considerations

### Responsive Design
- **Breakpoints**: Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Touch Targets**: Minimum 44px for interactive elements
- **Gestures**: Swipe, pinch, and tap support
- **Performance**: Optimized for mobile networks

### PWA Features
- **Web App Manifest**: For app-like experience
- **Service Worker**: Caching and offline support
- **Push Notifications**: Future enhancement

## 🔒 Security

### Frontend Security
- **Input Sanitization**: XSS prevention
- **CSRF Protection**: Token-based authentication
- **HTTPS Enforcement**: Production deployments
- **Content Security Policy**: Restrict resource loading

### Privacy Features
- **Local Storage**: User preferences only
- **No Sensitive Data**: Contact info never stored locally
- **Anonymous Usage**: Optional user identification

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for better communities**

For support or questions, please open an issue in the main repository.
