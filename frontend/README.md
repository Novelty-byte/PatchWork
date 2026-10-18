# PatchWork frontend

Report page (Page 1). Vite + React.

## Run it
```bash
npm install
cp .env.example .env     # then edit .env
npm run dev              # http://localhost:5173
```
Set `VITE_USE_MOCK=true` in `.env` to try the whole flow without the backend.

## Env vars
- `VITE_API_URL`: backend URL (default http://localhost:5000)
- `VITE_VAPI_PUBLIC_KEY`: Vapi public key for the voice call
- `VITE_USE_MOCK`: fake upload/chat/voice/submit for UI testing

## Still needed from the backend
`POST /api/chat` is not in API_SPEC_FOR_KAVYA.md. See `src/api.js` for the shape the UI expects.
