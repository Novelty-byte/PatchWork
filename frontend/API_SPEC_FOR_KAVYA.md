# 🌐 PatchWork API Specification for Kavya (Frontend Lead)

The live production backend URL is:  
👉 **`https://patch-work-rho.vercel.app`**  
*(For local testing, it also runs on `http://localhost:5000`). All endpoints return JSON and accept CORS requests.*

---

## 1. Page 1: Main Report Page

### A. Photo / Video Upload
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `media` (file input, up to 5 files, images or videos, max 25MB each)
- **Response:**
  ```json
  {
    "success": true,
    "message": "1 file(s) uploaded successfully.",
    "media_urls": [
      "https://patch-work-rho.vercel.app/uploads/1729115500-123456789.jpg"
    ]
  }
  ```

### B. Report Submission (From Chat, Voice, or Form)
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/reports`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "reporter_name": "Fatima Zahra",
    "contact": "+92 300 1234567",
    "email": "fatima@example.com",
    "location": "Street 5 near Community Park",
    "category": "Broken Streetlight",
    "description": "Streetlight pole #4 has an exposed sparking wire",
    "severity": "high",
    "media_urls": ["https://patch-work-rho.vercel.app/uploads/1729115500-123456789.jpg"]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Report logged successfully and notification automations triggered.",
    "report": {
      "id": "PW-526666",
      "status": "open",
      "created_at": "...",
      "expires_at": "..."
    }
  }
  ```

### C. Voice Call (Vapi Integration)
- **Endpoint:** `GET https://patch-work-rho.vercel.app/api/vapi/config`
- Returns the Vapi Assistant ID so the frontend `@vapi-ai/web` button can initiate the call:
  ```json
  {
    "success": true,
    "assistantId": "f99f9a56-214a-47a1-9449-1de9f2d5dbbe",
    "ready": true
  }
  ```

---

## 2. Page 2: Confirmation / Status Page
- **Endpoint:** `GET https://patch-work-rho.vercel.app/api/reports/:id`
- **Example:** `GET https://patch-work-rho.vercel.app/api/reports/PW-526666`
- **Response:**
  ```json
  {
    "success": true,
    "report": {
      "id": "PW-526666",
      "status": "open",
      "category": "Broken Streetlight",
      "location": "Street 5 near Community Park",
      "created_at": "2026-10-17T16:00:00.000Z",
      "expires_at": "2026-10-18T16:00:00.000Z"
    }
  }
  ```

---

## 3. Page 3: Manager Dashboard
- **Fetch Active Reports:** `GET https://patch-work-rho.vercel.app/api/reports/manager/all`
  - *Note:* Reports automatically stay visible for 24 hours from creation, then auto-expire.
- **Mark Ticket Solved:** `PATCH https://patch-work-rho.vercel.app/api/reports/manager/:id/solve`
  - Updates report status to `solved`.
