# PatchWork Deployment Guide

This guide covers deploying PatchWork to production environments.

## Prerequisites

- **Vercel account** (recommended) or cloud hosting provider
- **Domain name** (optional)
- **Supabase project** with Storage bucket
- **Gemini API key** for AI features
- **Gmail account** for email notifications

## Architecture for Production

```
┌─────────────────────┐     ┌─────────────────────┐
│  Frontend (Vercel)  │     │  Backend (Vercel)   │
│  patch-work-app     │────▶│  patch-work-rho     │
│  .vercel.app        │     │  .vercel.app        │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  Supabase    │  │  Gemini AI   │  │  Gmail API   │
            │  Database    │  │  Vision      │  │  Email       │
            └──────────────┘  └──────────────┘  └──────────────┘
```

## Vercel Deployment (Recommended)

### Backend

1. **Push your code to GitHub**
```bash
git push origin main
```

2. **Connect repository to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Set **Root Directory** to `backend`

3. **Configure Environment Variables**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=report-media
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
SOCIETY_MANAGER_EMAIL=manager@example.com
FRONTEND_URL=https://patch-work-app.vercel.app
MAKE_WEBHOOK_URL=your_webhook_url
```

4. **Deploy**
```bash
cd backend
vercel --prod
```

### Frontend

1. **Connect repository to Vercel**
- Click "New Project"
- Import your GitHub repository
- Set **Root Directory** to `frontend`

2. **Configure Environment Variables**
```
VITE_API_URL=https://patch-work-rho.vercel.app
VITE_USE_MOCK=false
```

3. **Deploy**
```bash
cd frontend
vercel --prod
```

## Environment Variables Checklist

### Backend
- [ ] `SUPABASE_URL` — Supabase project URL
- [ ] `SUPABASE_KEY` — Supabase anonymous key
- [ ] `SUPABASE_BUCKET` — Storage bucket name
- [ ] `GEMINI_API_KEY` — Gemini API key
- [ ] `GEMINI_MODEL` — Gemini model version
- [ ] `GMAIL_USER` — Gmail address
- [ ] `GMAIL_APP_PASSWORD` — Gmail app password
- [ ] `SOCIETY_MANAGER_EMAIL` — Manager email address
- [ ] `FRONTEND_URL` — Frontend production URL
- [ ] `MAKE_WEBHOOK_URL` — Optional Make.com webhook

### Frontend
- [ ] `VITE_API_URL` — Backend API URL
- [ ] `VITE_USE_MOCK` — Set to `false` for production

## Database Setup

### Supabase Configuration

1. Create a new Supabase project
2. Create a `reports` table with the following schema:

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

3. Create a Storage bucket named `report-media` (public)

### Local Fallback

If Supabase is not configured, the system automatically falls back to a local JSON file. This is useful for:
- Development and testing
- Offline scenarios
- Simple deployments

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in `GMAIL_APP_PASSWORD`

### Make.com Integration (Optional)

1. Create a Make.com scenario
2. Set up Gmail module for email sending
3. Configure the webhook URL in `MAKE_WEBHOOK_URL`

## AI Services Setup

### Gemini API

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Set `GEMINI_API_KEY` in your environment
3. Optionally customize the model with `GEMINI_MODEL`

### Vapi AI

1. Create a Vapi account
2. Create an assistant
3. Configure the assistant ID and public key
4. The backend serves these credentials via `/api/vapi/config`

## Monitoring and Maintenance

### Health Checks

- **Endpoint**: `/api/health`
- **Response**: Server status and timestamp
- **Usage**: Load balancers and uptime monitors

### Performance Monitoring

- **Response Times**: Average API response times
- **Error Rates**: Failed requests and API errors
- **Database Performance**: Query execution times
- **AI Processing**: Token usage and response times

### Maintenance Tasks

- [ ] Regularly update dependencies
- [ ] Monitor Supabase storage usage
- [ ] Check Gemini API quota
- [ ] Review and rotate API keys
- [ ] Backup database regularly

## Security Checklist

- [ ] Use HTTPS for all endpoints
- [ ] Enable CORS with specific origins (not `*` in production)
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable 2-factor authentication
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

## Troubleshooting

### Common Issues

#### Backend Not Starting
1. Check Node.js version
2. Verify `.env` file exists and is configured
3. Check for port conflicts

#### Frontend Not Connecting
1. Verify `VITE_API_URL` is correct
2. Check CORS configuration on backend
3. Test with mock mode (`VITE_USE_MOCK=true`)

#### Email Not Sending
1. Verify Gmail credentials
2. Check app password is correct
3. Enable "Less secure apps" if needed

#### AI API Errors
1. Verify Gemini API key
2. Check API quota limits
3. Test with different model versions

## Rollback Plan

If a deployment causes issues:

1. **Backend**: Revert to previous Vercel deployment
2. **Frontend**: Revert to previous Vercel deployment
3. **Database**: Restore from backup if needed
4. **Monitor**: Check logs for errors
5. **Communicate**: Notify users of any downtime