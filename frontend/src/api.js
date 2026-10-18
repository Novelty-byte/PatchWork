// All backend calls for the report page (see frontend/API_SPEC_FOR_KAVYA.md in the repo).
const BASE = (
  import.meta.env.VITE_API_URL || "https://patch-work-rho.vercel.app"
).replace(/\/$/, "");
export const MOCK = import.meta.env.VITE_USE_MOCK === "true";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch {
    throw new Error(
      "Can't reach the server. Check your connection and try again.",
    );
  }
  if (res.status === 429)
    throw new Error(
      "Too many requests right now. Please wait a minute and try again.",
    );
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no json body */
  }
  if (!res.ok || (data && data.success === false)) {
    throw new Error(
      (data && (data.message || data.error)) ||
        "Something went wrong. Please try again.",
    );
  }
  return data;
}

// POST /api/upload (multipart, field "media") -> { media_urls: [...] }
export function uploadFile(file, onProgress) {
  if (MOCK) {
    return (async () => {
      for (const p of [15, 45, 75, 100]) {
        await wait(250);
        onProgress(p);
      }
      return URL.createObjectURL(file);
    })();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (
          xhr.status < 300 &&
          d.success &&
          d.media_urls &&
          d.media_urls.length
        )
          resolve(d.media_urls[0]);
        else reject(new Error(d.message || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("media", file);
    xhr.send(form);
  });
}

// GET /api/vapi/config -> { publicKey, assistantId, ready }
export async function getVapiConfig() {
  if (MOCK) return { publicKey: "mock", assistantId: "mock", ready: true };
  return request("/api/vapi/config");
}

// GET /api/vapi/latest-ticket -> { success, ticket_id }
export async function getLatestVoiceTicket(callId) {
  const query = callId ? `?call_id=${encodeURIComponent(callId)}` : "";
  return request(`/api/vapi/latest-ticket${query}`);
}

// POST /api/chat { message, history:[{sender:'bot'|'user', text}], media_urls }
//   -> { reply, is_complete, report: null | { id, ... } }
export async function sendChat({ message, history, media_urls }) {
  if (MOCK) {
    await wait(900);
    const n = history.filter((h) => h.sender === "user").length + 1;
    if (n === 1)
      return {
        reply: "Thanks. Where exactly is this? A nearby landmark is helpful.",
        is_complete: false,
        report: null,
      };
    if (n === 2)
      return {
        reply:
          "Thank you! Could you share your full name and a phone number or email?",
        is_complete: false,
        report: null,
      };
    return {
      reply: "Thank you! I have logged your report. Your ticket ID is PW-1048.",
      is_complete: true,
      report: { id: "PW-1048" },
    };
  }
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, media_urls }),
  });
}
