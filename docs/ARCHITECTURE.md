# PatchWork Architecture

This document describes the system design, data flow, and component interactions of PatchWork.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSERS                        │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  Report Page (/)    │  │  Dashboard (/dashboard)      │  │
│  │  Chat or Voice AI   │  │  Cards + Map view            │  │
│  └──────────┬──────────┘  └──────────┬───────────────────┘  │
│             │ HTTP/JSON              │                      │
└─────────────┼────────────────────────┼──────────────────────┘
              │                        │
              ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ /api/chat│ │ /api/upld│ │ /api/vapi│ │ /api/reports   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       │            │            │               │           │
│  ┌────┴────────────┴────────────┴───────────────┴──────┐    │
│  │  Services: Gemini AI · Vapi · Nodemailer · Supabase │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌─────────────────┐   ┌──────────────────┐
     │  Supabase       │   │  Local JSON File  │
     │  (PostgreSQL)   │   │  (fallback)       │
     │  Storage        │   │  data/reports.json│
     └─────────────────┘   └──────────────────┘
```

## Layers

### 1. Presentation Layer (Frontend)
React 18 + Vite 5 SPA. Three pages:
- **Landing** (`/`) — Report intake with upload, chat, and voice
- **StatusPage** (`/status/:id`) — Single-ticket detail view
- **ManagerPage** (`/dashboard`) — Live community dashboard

### 2. Application Layer (Backend)
Express 4 routes:
- `routes/chat.js` — AI chat intake
- `routes/reports.js` — Report CRUD
- `routes/upload.js` — Media upload
- `routes/vapi.js` — Voice API integration

### 3. Service Layer
- `services/emailService.js` — Email notifications
- `services/supabaseService.js` — Supabase storage
- `services/visionService.js` — AI visual verification

### 4. Data Layer
- `db/database.js` — Primary operations with Supabase + JSON fallback
- `data/reports.json` — Local fallback storage

## Data Flow

### Report Creation
```
User uploads media → User chats/voices with AI → AI extracts structured data
→ Backend creates report → AI verifies media → Emails sent → Dashboard updated
```

### Dashboard Refresh
```
Browser polls /api/reports/dashboard every 30s
→ Supabase query filters open + recent solved
→ Frontend re-renders report cards
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No manager login | Dashboard is public by design |
| 12-hour solved retention | Balances visibility with cleanup |
| Dual AI modes (chat + voice) | Caters to different user preferences |
| Supabase + JSON fallback | Works without external dependencies |
| Rate limiting on submissions | Prevents spam and abuse |
| Contact privacy by default | Phone/email never exposed publicly |

## Component Communication

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  App.jsx     │────▶│  ChatPanel   │────▶│  VoicePanel  │
│  (state mgmt)│     │  (messages)  │     │  (voice UI)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  UploadCard  │     │  services/   │     │  services/   │
│  (media)     │     │  api.js      │     │  api.js      │
└──────────────┘     └──────────────┘     └──────────────┘
```

## State Management

- **React useState** for component-level state
- **useRef** for DOM references and persistence
- **localStorage** for user preferences and votes
- **Custom hooks** (`useSpotlight`, `useTilt`) for reusable logic

## Error Handling

- **Frontend**: Try/catch around API calls with toast notifications
- **Backend**: Global error handler with sanitized messages
- **AI**: Fallback conversational engine when Gemini unavailable
- **Database**: Graceful fallback to local JSON on Supabase failure