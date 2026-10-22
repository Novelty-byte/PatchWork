# PatchWork Developer Guide

This guide covers local development setup, project conventions, and contribution workflow.

## Prerequisites

- **Node.js** 16.14.2 or higher
- **npm** or **yarn** package manager
- **Git** for version control

## Repository Structure

```
PatchWork/
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite SPA
└── docs/             # Project documentation
```

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/patchwork.git
cd patchwork
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend will start on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

The frontend will start on `http://localhost:5173`.

## Environment Configuration

### Backend (.env)

```env
# Server Configuration
PORT=5000
VERCEL=false

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
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

### Frontend (.env)

```env
# Backend API URL
VITE_API_URL=https://patch-work-rho.vercel.app

# Optional: Use mock data for testing (no backend required)
VITE_USE_MOCK=false
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ../frontend
npm test
```

### Code Style

- **Backend**: Standard JavaScript (CommonJS), 2-space indentation
- **Frontend**: JSX with ES modules, 2-space indentation
- **CSS**: CSS variables for theming, BEM naming convention

### Adding a New Feature

#### Backend

1. Create route file in `src/routes/`
2. Add route to `src/server.js`
3. Implement business logic in services
4. Add tests

#### Frontend

1. Create component in `src/components/`
2. Add page in `src/pages/`
3. Implement API calls in `src/services/`
4. Add styles in `src/styles/`

### Database Migrations

For Supabase schema changes:
1. Create migration in Supabase dashboard
2. Update fallback JSON structure
3. Update `db/database.js` operations

## Debugging

### Backend Logging

Set `DEBUG=true` in `.env` for verbose logging.

Common log patterns:
- `✅ Supabase client initialized` — Database connected
- `⚠️ Supabase error` — Database fallback triggered
- `❌ Email send attempt failed` — Email delivery issue
- `Gemini model returned status` — AI API issue

### Frontend Debugging

- **Mock Mode**: Set `VITE_USE_MOCK=true` to test without backend
- **Network Tab**: Check API requests and responses
- **React DevTools**: Inspect component state and props
- **Console Errors**: Check for CORS or network issues

## Common Issues

### Supabase Connection Failed
1. Check credentials in `.env`
2. Verify network connectivity
3. Check Supabase project status

### Email Not Sending
1. Verify Gmail credentials
2. Enable "Less secure apps" or use App Password
3. Check firewall settings

### AI API Errors
1. Verify Gemini API key
2. Check API quota limits
3. Test with different model versions

## Deployment

### Vercel (Recommended)

**Backend:**
```bash
cd backend
vercel --prod
```

**Frontend:**
```bash
cd frontend
vercel --prod
```

### Manual Build

**Backend:**
```bash
cd backend
npm install --production
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.