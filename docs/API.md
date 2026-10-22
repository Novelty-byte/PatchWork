# PatchWork API Reference

Complete REST API documentation for the PatchWork backend.

## Base URL

```
Production: https://patch-work-rho.vercel.app
Local:      http://localhost:5000
```

All endpoints return JSON and accept CORS requests.

## Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses include a `message` or `error` field.

## Health Check

### `GET /api/health`

Returns server status and available endpoints.

**Response:**
```json
{
  "status": "online",
  "service": "PatchWork Backend API",
  "timestamp": "2026-10-23T10:30:00.000Z"
}
```

---

## Report Intake

### `POST /api/chat`

AI-powered chat intake for resident reporting. The AI guides the conversation, extracts structured data, and creates a report when complete.

**Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "message": "There is a broken streetlight with sparking wires on Street 4",
  "history": [
    { "sender": "bot", "text": "Hello! Welcome to PatchWork. What problem would you like to report today?" }
  ],
  "media_urls": ["https://example.com/photo.jpg"],
  "gps": { "lat": 24.879, "lng": 67.185, "address": "Noor Housing Society" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Resident's message |
| `history` | array | No | Previous conversation turns |
| `media_urls` | array | No | URLs of uploaded media |
| `gps` | object | No | GPS coordinates with optional address |

**Response (In-Progress):**
```json
{
  "success": true,
  "reply": "Thank you! Could you please share your full name and a phone number or email?",
  "is_complete": false,
  "report": null
}
```

**Response (Complete):**
```json
{
  "success": true,
  "reply": "Thank you Fatima! I have officially logged your report for Broken Streetlight at Street 4. Your ticket ID is PW-526666.",
  "is_complete": true,
  "report": {
    "id": "PW-526666",
    "reporter_name": "Fatima Zahra",
    "category": "Broken Streetlight",
    "location": "Street 4",
    "status": "open",
    "created_at": "2026-10-18T01:40:00.000Z"
  }
}
```

> **Note:** The `report` object omits `contact` and `email` for privacy.

---

## Media Upload

### `POST /api/upload`

Upload photos or videos to Supabase Storage.

**Headers:** `Content-Type: multipart/form-data`

**Body:** `media` (file input, up to 5 files, max 25MB each)

**Response:**
```json
{
  "success": true,
  "message": "1 file(s) uploaded successfully.",
  "media_urls": [
    "https://gagcunywlvizpurbcdmv.supabase.co/storage/v1/object/public/report-media/1729115500-123456789.jpg"
  ]
}
```

---

## Voice Integration

### `GET /api/vapi/config`

Fetch public voice credentials for Vapi Web SDK.

**Response:**
```json
{
  "success": true,
  "publicKey": "your_vapi_public_key",
  "assistantId": "your_vapi_assistant_id",
  "ready": true
}
```

### `GET /api/vapi/latest-ticket`

Get the ticket ID from the most recent voice call.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `call_id` | string | Vapi call ID |

**Response:**
```json
{
  "success": true,
  "ticket_id": "PW-526666"
}
```

---

## Report Management

### `GET /api/reports/:id`

Get a single report by ID.

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "PW-526666",
    "reporter_name": "Fatima Zahra",
    "category": "Broken Streetlight",
    "location": "Street 5 near Community Park",
    "description": "Streetlight pole #4 has an exposed sparking wire",
    "status": "open",
    "verification": {
      "label": "verified",
      "reason": "Image shows an exposed sparking streetlight pole."
    },
    "media_urls": ["https://example.com/photo.jpg"],
    "created_at": "2026-10-18T01:40:00.000Z",
    "solved_at": null,
    "expires_at": null
  }
}
```

### `GET /api/reports/dashboard`

Get all active and recently-solved reports for the community dashboard.

**Retention Rule:** Open reports remain visible indefinitely. Solved reports remain visible for **12 hours** with a countdown timer, then automatically disappear.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "reports": [
    {
      "id": "PW-526666",
      "reporter_name": "Fatima Zahra",
      "category": "Broken Streetlight",
      "location": "Street 5 near Community Park",
      "description": "Streetlight pole #4 has an exposed sparking wire",
      "status": "open",
      "verification": {
        "label": "verified",
        "reason": "Image shows an exposed sparking streetlight pole."
      },
      "media_urls": ["https://example.com/photo.jpg"],
      "created_at": "2026-10-18T01:40:00.000Z",
      "solved_at": null,
      "expires_at": null
    }
  ]
}
```

### `PATCH /api/reports/:id/solve`

Mark a report as solved.

**Response:**
```json
{
  "success": true,
  "message": "Report marked as solved. It will disappear from the dashboard in 12 hours.",
  "report": {
    "id": "PW-526666",
    "status": "solved",
    "solved_at": "2026-10-18T05:00:00.000Z",
    "expires_at": "2026-10-18T17:00:00.000Z"
  }
}
```

---

## Report Categories

The AI classifies reports into these categories:

| Category | Description |
|----------|-------------|
| `Broken Streetlight` | Damaged or malfunctioning streetlights |
| `Pothole` | Road damage and cavities |
| `Sewage` | Sewer overflows and drainage issues |
| `Flooding` | Standing water and water logging |
| `Damaged Park` | Park equipment and playground damage |
| `Damaged Building` | Building and wall damage |
| `Other Community Issue` | Miscellaneous civic issues |

## Verification Labels

The AI visual verification produces these labels:

| Label | Color | Description |
|-------|-------|-------------|
| `verified` | Green | Evidence clearly matches the reported issue |
| `unclear` | Yellow | Evidence is blurry, dark, or inconclusive |
| `does not match` | Red | Evidence contradicts the reported issue |
| `skipped` | Gray | No photo or video uploaded |

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API (GET) | 600 requests | 15 minutes |
| Submissions (POST/PATCH) | 40 requests | 15 minutes |

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing required fields |
| 404 | Report not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |