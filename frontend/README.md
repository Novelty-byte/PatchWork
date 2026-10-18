# PatchWork frontend

Vite + React. Pages:

- `/` report page: photo/video upload, then chat or voice call with the AI assistant
- `/status/:id` report status page (also reachable at `/report/:id`)
- `/dashboard` live community dashboard (public, no login)

## Run it

    npm install
    cp .env.example .env     # on Windows: copy .env.example .env
    npm run dev              # http://localhost:5173

## Env vars

- `VITE_API_URL`: backend URL (default https://patch-work-rho.vercel.app)
- `VITE_USE_MOCK`: set to `true` to try the whole flow with fake data, without the backend

The Vapi public key for voice calls comes from the backend (`/api/vapi/config`), so it is not needed in `.env`.

## Backend

API details are in `API_SPEC_FOR_KAVYA.md`. All calls are in `src/api.js` (report page), `src/statusApi.js` and `src/managerApi.js` (dashboard).

## Deploy

Vercel: set the Root Directory to `frontend` and add `VITE_API_URL`. `vercel.json` makes direct links like `/dashboard` work.
