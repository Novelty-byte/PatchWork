# 🌐 PatchWork API Specification for Kavya (Frontend Lead)

The live production backend URL is:  
👉 **`https://patch-work-rho.vercel.app`**  
*(For local testing, it also runs on `http://localhost:5000`). All endpoints return JSON and accept CORS requests.*

---

## 🔒 Privacy Safeguard
Per the project draft: The resident's contact phone number and email are **never exposed** on the public website or status pages. They are securely transmitted only to the society manager via private email alerts. All public endpoints automatically omit sensitive contact details.

---

## 1. Page 1: Main Report Page

### A. Photo / Video Upload
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `media` (file input, up to 5 files, photos or video, max 25MB each)
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

### B. Report Form Submission
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
      "reporter_name": "Fatima Zahra",
      "category": "Broken Streetlight",
      "location": "Street 5 near Community Park",
      "status": "open",
      "verification": {
        "label": "verified",
        "reason": "Image shows an exposed sparking streetlight pole."
      },
      "created_at": "...",
      "expires_at": null
    }
  }
  ```

### C. Conversational Chatbot (Text Reporting)
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/chat`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "message": "A deep pothole on Main Street near the park entrance",
    "history": [
      { "sender": "user", "text": "Hi" },
      { "sender": "bot", "text": "Hello! What issue would you like to report?" }
    ],
    "media_urls": []
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "reply": "Thank you! Could you please share your name and contact number?",
    "is_complete": false,
    "report": null
  }
  ```
  *(When `is_complete` becomes `true`, the ticket is automatically saved and returned in `report.id`).*

### D. Voice Call (Vapi Web Integration)
Kavya can install the official Vapi Web SDK in her frontend:
```bash
npm install @vapi-ai/web
```
Example React button component:
```jsx
import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

// Vapi Public Key & Assistant ID
const vapi = new Vapi('e49651ee-f8d4-46f5-a8ad-722f32fb5aa4');
const ASSISTANT_ID = 'f99f9a56-214a-47a1-9449-1de9f2d5dbbe';

export function VoiceCallButton() {
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    vapi.on('call-start', () => setIsCalling(true));
    vapi.on('call-end', () => setIsCalling(false));
    vapi.on('error', (e) => {
      console.error(e);
      setIsCalling(false);
    });
  }, []);

  const toggleCall = () => {
    if (isCalling) {
      vapi.stop();
    } else {
      vapi.start(ASSISTANT_ID);
    }
  };

  return (
    <button 
      onClick={toggleCall}
      style={{
        backgroundColor: isCalling ? '#e53e3e' : '#3182ce',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}
    >
      {isCalling ? '🔴 End Voice Call' : '🎙️ Speak to AI Assistant'}
    </button>
  );
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
      "reporter_name": "Fatima Zahra",
      "category": "Broken Streetlight",
      "location": "Street 5 near Community Park",
      "description": "Streetlight pole #4 has an exposed sparking wire",
      "status": "open",
      "verification": {
        "label": "verified",
        "reason": "Image shows an exposed sparking streetlight pole."
      },
      "created_at": "2026-10-18T01:40:00.000Z"
    }
  }
  ```

---

## 3. Page 3: Live Community Dashboard
- **Fetch Active Reports:** `GET https://patch-work-rho.vercel.app/api/reports/dashboard`
  - *Lifecycle Rule:* Open reports remain on the dashboard **indefinitely** until marked solved. Solved reports remain visible for **12 hours** with a countdown, then disappear.
- **One-Click "Mark Solved":** `PATCH https://patch-work-rho.vercel.app/api/reports/:id/solve`
  - Marks report status as `solved` and sets `expires_at` to 12 hours from now.
