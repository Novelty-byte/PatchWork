# 🌐 PatchWork Frontend Specification for Kavya (Frontend Lead)

The live production backend URL is:  
👉 **`https://patch-work-rho.vercel.app`**  
*(For local testing, it also runs on `http://localhost:5000`). All endpoints return JSON and accept CORS requests.*

---

## 💡 Core UX Concept: Zero-Form AI Intake
> **Important Note for Kavya:**  
> **Do NOT build a traditional multi-field web form** (no inputs for category, description, address, name, etc.).  
> PatchWork replaces tedious forms with an effortless 2-step AI flow:
> 1. **Step 1:** Resident uploads photos or video (or skips media).
> 2. **Step 2:** Resident chooses **"Chat with AI"** OR **"Voice Call"** to describe the problem and provide their name and contact info. The AI structures and logs the ticket automatically!

---

## 🔒 Privacy Safeguard
Per the project draft: The resident's contact phone number and email are **never exposed** on the public website or status pages. They are securely transmitted only to the society manager via private email alerts. All public endpoints automatically omit sensitive contact details.

---

## 📄 1. Page 1: Main Report Page (`/`)

### Step 1: Photo / Video Upload
The resident attaches photos or videos first (or can proceed without media).
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `media` (file input, up to 5 files, camera capture on mobile, max 25MB each)
- **Response:**
  ```json
  {
    "success": true,
    "message": "1 file(s) uploaded successfully.",
    "media_urls": [
      "https://gagcunywlvizpurbcdmv.supabase.co/storage/v1/object/public/report-media/1729115500-123456789.jpg"
    ]
  }
  ```
> **Frontend Tip:** Keep the returned `media_urls` array in state so you can pass it to the Chatbot.

---

### Step 2: Choose AI Intake (Chat OR Voice Call)

The resident chooses how they want to report the issue:

#### Mode A: Interactive AI Chatbot (Text Intake)
The resident converses with the AI assistant. The AI asks what happened, exact location, resident's name, and phone/email, then automatically creates the ticket.
- **Endpoint:** `POST https://patch-work-rho.vercel.app/api/chat`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "message": "There is a broken streetlight with sparking wires on Street 4",
    "history": [
      { "sender": "bot", "text": "Hello! Welcome to PatchWork. What problem would you like to report today?" }
    ],
    "media_urls": ["https://gagcunywlvizpurbcdmv.supabase.co/storage/v1/object/public/report-media/...jpg"]
  }
  ```
- **Response (In-Progress):**
  ```json
  {
    "success": true,
    "reply": "Thank you! Could you please share your full name and a phone number or email?",
    "is_complete": false,
    "report": null
  }
  ```
- **Response (When Finished):**
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
> **When `is_complete === true`:** Automatically redirect the resident to the status page: `/status/${data.report.id}`!

---

#### Mode B: In-Browser AI Voice Call (Vapi Integration)
The resident taps the microphone button to talk directly to the AI assistant.

1. Install the official Vapi Web SDK in the frontend:
   ```bash
   npm install @vapi-ai/web
   ```
2. Fetch the public voice credentials dynamically from the backend:
   - **Endpoint:** `GET https://patch-work-rho.vercel.app/api/vapi/config`
   - **Response:**
     ```json
     {
       "success": true,
       "publicKey": "your_vapi_public_key",
       "assistantId": "your_vapi_assistant_id",
       "ready": true
     }
     ```

Example React component for the Voice Button:
```jsx
import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

export function VoiceCallButton({ onTicketCreated }) {
  const [vapi, setVapi] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [assistantId, setAssistantId] = useState(null);

  useEffect(() => {
    // 1. Fetch public voice config from backend
    fetch('https://patch-work-rho.vercel.app/api/vapi/config')
      .then(res => res.json())
      .then(data => {
        if (data.publicKey && data.assistantId) {
          const client = new Vapi(data.publicKey);
          client.on('call-start', () => setIsCalling(true));
          client.on('call-end', () => setIsCalling(false));
          client.on('error', (e) => {
            console.error('Vapi Voice error:', e);
            setIsCalling(false);
          });
          setVapi(client);
          setAssistantId(data.assistantId);
        }
      })
      .catch(err => console.error('Failed to load Vapi voice config:', err));

    return () => {
      if (vapi) vapi.stop();
    };
  }, []);

  const toggleCall = () => {
    if (!vapi || !assistantId) return;

    if (isCalling) {
      vapi.stop();
    } else {
      vapi.start(assistantId);
    }
  };

  return (
    <button 
      onClick={toggleCall}
      disabled={!vapi}
      style={{
        backgroundColor: isCalling ? '#e53e3e' : '#3182ce',
        color: 'white',
        padding: '14px 28px',
        borderRadius: '8px',
        border: 'none',
        cursor: vapi ? 'pointer' : 'not-allowed',
        fontWeight: 'bold',
        fontSize: '16px'
      }}
    >
      {isCalling ? '🔴 End Voice Call' : '🎙️ Talk to AI Assistant'}
    </button>
  );
}
```

---

## 📄 2. Page 2: Confirmation / Status Tracking Page (`/status/:id`)
Shows the live status of the reported issue.
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
      "media_urls": ["https://gagcunywlvizpurbcdmv.supabase.co/..."],
      "created_at": "2026-10-18T01:40:00.000Z",
      "solved_at": null,
      "expires_at": null
    }
  }
  ```
> **Display:** Show the AI verification badge (`verified` in green, `unclear` in yellow, `does not match` in red, or `skipped` in gray) and the explanation `reason`.

---

## 📄 3. Page 3: Live Community Dashboard (`/dashboard`)
There is **NO separate manager dashboard and NO manager login**. Any community resident can open this page to view active issues and mark them fixed!

- **Fetch Active Reports:** `GET https://patch-work-rho.vercel.app/api/reports/dashboard`
  - *Retention Rule:* Open reports remain visible indefinitely. Solved reports remain visible for **12 hours** with a countdown timer, then automatically disappear.
  - **Response:**
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
          "media_urls": ["..."],
          "created_at": "2026-10-18T01:40:00.000Z",
          "solved_at": null,
          "expires_at": null
        }
      ]
    }
    ```

- **One-Click "Mark Solved" Button:**
  - When any user clicks "Mark Solved" on a card:
  - **Endpoint:** `PATCH https://patch-work-rho.vercel.app/api/reports/:id/solve`
  - **Response:**
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
  - **UI Behavior:** Switch status badge to `Solved` and display a 12-hour countdown until removal (based on `expires_at`).
