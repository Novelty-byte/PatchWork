# 🌐 WebFix API Specification for Kavya (Frontend Lead)

The backend is deployed live at: **`https://patch-work-rho.vercel.app`**  
*(For local testing, it runs on `http://localhost:5000`). All endpoints return JSON and accept CORS requests from anywhere.*


---

## 1. Page 1: Main Report Page

### A. Photo / Video Upload
- **Endpoint:** `POST http://localhost:5000/api/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `media` (file input, up to 5 files, images or videos, max 25MB each)
- **Response:**
  ```json
  {
    "success": true,
    "message": "1 file(s) uploaded successfully.",
    "media_urls": [
      "http://localhost:5000/uploads/1729115500-123456789.jpg"
    ]
  }
  ```

### B. Report Submission (From Chat, Voice, or Form)
- **Endpoint:** `POST http://localhost:5000/api/reports`
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
    "media_urls": ["http://localhost:5000/uploads/1729115500-123456789.jpg"]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Report logged successfully and notification automations triggered.",
    "report": {
      "id": "WF-526666",
      "status": "open",
      "created_at": "...",
      "expires_at": "..."
    }
  }
  ```

### C. Voice Call (Vapi Integration)
- **Endpoint:** `GET http://localhost:5000/api/vapi/config`
- Returns the Vapi Assistant ID to initialize the `@vapi-ai/web` button:
  ```json
  {
    "success": true,
    "assistantId": "your_vapi_assistant_id",
    "ready": true
  }
  ```

---

## 2. Page 2: Confirmation / Status Page
- **Endpoint:** `GET http://localhost:5000/api/reports/:id`
- **Example:** `GET http://localhost:5000/api/reports/WF-526666`
- **Response:**
  ```json
  {
    "success": true,
    "report": {
      "id": "WF-526666",
      "status": "open",
      "category": "Broken Streetlight",
      "location": "Street 5 near Community Park",
      "created_at": "2026-10-16T21:52:06.666Z"
    }
  }
  ```

---

## 3. Page 3: Manager Dashboard
- **Fetch Active Reports:** `GET http://localhost:5000/api/reports/manager/all`
  - *Note:* This automatically filters out expired tickets (older than 24h if open, or older than 12h if solved).
- **Mark Ticket Solved:** `PATCH http://localhost:5000/api/reports/manager/:id/solve`
  - Starts the 12-hour countdown until the ticket disappears from the dashboard.
