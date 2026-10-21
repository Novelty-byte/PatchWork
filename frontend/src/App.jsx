import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sprout,
  ArrowUpRight,
  Heart,
  ShieldCheck,
  MessageCircle,
  Phone,
  CircleCheck,
} from "lucide-react";
import UploadCard from "./components/UploadCard.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import VoicePanel from "./components/VoicePanel.jsx";
import Toasts from "./components/Toasts.jsx";
import BgCanvas from "./components/BgCanvas.jsx";
import { uploadFile, sendChat } from "./api";
import ThemeToggle from "./components/ThemeToggle.jsx";

const MAX_FILES = 5;
const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = ["jpg", "jpeg", "png", "heic", "mp4", "mov"];
const GREETING =
  "Hello! Welcome to PatchWork. What problem would you like to report today?";

/* ── Upload burst mini confetti ── */
function spawnBurst(containerEl) {
  if (!containerEl) return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;
  const COLORS = ["#066b5e", "#3fb5a2", "#7bd88f", "#0ea5e9", "#38bdf8"];
  for (let i = 0; i < 8; i++) {
    const dot = document.createElement("span");
    dot.className = "upload-burst-dot";
    const angle = (i / 8) * Math.PI * 2;
    const dist = 24 + Math.random() * 18;
    dot.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    dot.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    dot.style.background = COLORS[i % COLORS.length];
    dot.style.left = "50%";
    dot.style.top = "50%";
    dot.style.marginLeft = "-4px";
    dot.style.marginTop = "-4px";
    containerEl.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  }
}

export default function App() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [tab, setTab] = useState("chat");
  const [gpsLocation, setGpsLocation] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: GREETING },
  ]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const idRef = useRef(0);
  const redirectTimer = useRef(null);
  const uploadZoneRef = useRef(null);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    document.title = "PatchWork – Report a neighborhood problem";
    return () => clearTimeout(redirectTimer.current);
  }, []);

  /* ── Update active step as user progresses ── */
  useEffect(() => {
    if (done) setActiveStep(2);
    else if (files.some((f) => f.status === "done")) setActiveStep(1);
    else setActiveStep(0);
  }, [files, done]);

  const notify = (t) => {
    const id = nextId();
    setToasts((list) => [...list, { ...t, id }]);
    setTimeout(
      () => setToasts((list) => list.filter((x) => x.id !== id)),
      6000,
    );
  };

  /* ---------- uploads ---------- */
  const patchFile = (id, patch) =>
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function startUpload(file, ext) {
    const id = nextId();
    setFiles((list) => [
      ...list,
      {
        id,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video") || ["mp4", "mov"].includes(ext),
        progress: 0,
        status: "uploading",
        url: null,
      },
    ]);
    uploadFile(file, (p) => patchFile(id, { progress: p }))
      .then((url) => {
        patchFile(id, { status: "done", progress: 100, url });
        // 🎉 burst on success
        spawnBurst(uploadZoneRef.current);
      })
      .catch(() => patchFile(id, { status: "error" }));
  }

  function addFiles(fileList) {
    let slots = MAX_FILES - files.length;
    const errs = [];
    [...fileList].forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!ALLOWED.includes(ext)) {
        errs.push({
          id: nextId(),
          title: "Unsupported file type",
          text: `${file.name} couldn't be added. Use JPG, PNG, HEIC, MP4 or MOV.`,
        });
      } else if (file.size > MAX_SIZE) {
        errs.push({
          id: nextId(),
          title: "This file is too large",
          text: `${file.name} is ${(file.size / 1048576).toFixed(0)}MB. Choose a file under 25MB.`,
        });
      } else if (slots <= 0) {
        errs.push({
          id: nextId(),
          title: "Too many files",
          text: `You can add up to ${MAX_FILES} files. Remove one to add another.`,
        });
      } else {
        slots--;
        startUpload(file, ext);
      }
    });
    if (errs.length) setUploadErrors((e) => [...e, ...errs]);
  }

  const removeFile = (id) =>
    setFiles((list) => {
      const f = list.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return list.filter((x) => x.id !== id);
    });

  const mediaUrls = files
    .filter((f) => f.status === "done" && f.url)
    .map((f) => f.url);

  /* ---------- chat ---------- */
  async function handleSend(text) {
    if (done) return;
    const history = messages.map((m) => ({
      sender: m.role === "user" ? "user" : "bot",
      text: m.text,
    }));
    setMessages((m) => [...m, { role: "user", text }]);
    setTyping(true);
    try {
      const data = await sendChat({
        message: text,
        history,
        media_urls: mediaUrls,
        gps: gpsLocation,
      });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      if (data.is_complete && data.report && data.report.id) {
        const id = data.report.id;
        setDone({ id });
        redirectTimer.current = setTimeout(
          () => navigate(`/status/${encodeURIComponent(id)}`),
          4000,
        );
      }
    } catch (err) {
      notify({
        variant: "error",
        title: "Patch couldn't reply",
        text: err.message,
      });
    } finally {
      setTyping(false);
    }
  }

  const STEPS = [
    { label: "Add photos & GPS", note: "Optional" },
    { label: "Describe the problem", note: "" },
    { label: "Get confirmation", note: "" },
  ];

  // Contextual quick-reply chips
  const lastMsg = messages[messages.length - 1];
  const isAssistant = lastMsg?.role === "assistant";
  const isLocationPrompt =
    isAssistant &&
    /where|location|place|spot|street|landmark/i.test(lastMsg?.text || "");
  const isInitialPrompt = messages.length === 1 && isAssistant;

  const quickChips = isLocationPrompt
    ? ["Near the main gate", "Near the park", "Outside Block A", "Type a location"]
    : isInitialPrompt
      ? ["Broken streetlight", "Pothole on the road", "Flooding / sewage leak", "Damaged park equipment"]
      : null;

  const showChips = !done && Boolean(quickChips && quickChips.length > 0);

  return (
    <div className="page" style={{ position: "relative" }}>
      {/* ── Aurora background ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <BgCanvas mode="aurora" />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <header className="nav">
          <div className="container nav-inner">
            <a className="brand" href="https://patch-work-app.vercel.app">
              <span className="brand-mark">
                <img
                  src="/patchwork-logo.jpeg"
                  alt="PatchWork"
                  style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", display: "block" }}
                />
              </span>
              PatchWork
            </a>
            <div className="nav-right">
              <Link className="nav-link" to="/dashboard">
                Dashboard <ArrowUpRight size={14} />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <div>
              <p className="kicker">
                <i className="dot" /> SMALL REPORTS. BETTER NEIGHBORHOODS.
              </p>
              <h1>
                See a problem?
                <br />
                Report it in under a minute.
              </h1>
              <p className="lead">
                Upload photos or video, then describe the issue to our AI
                assistant by chat or voice call. Your manager is alerted
                instantly. You get a confirmation email.
              </p>
            </div>
            <aside className="hero-card">
              <Heart size={26} />
              <h2>A little care goes a long way.</h2>
              <p>Help your society manager see what needs attention.</p>
              <span className="badge-plain">No account needed</span>
            </aside>
          </section>

          {/* ── Animated step tracker ── */}
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.label} className={i <= activeStep ? "step-active" : ""}>
                <b className={i <= activeStep ? "step-num-active" : ""}>{i + 1}.</b>
                <span>
                  {s.label}
                  {s.note && <small>{s.note}</small>}
                </span>
                {i <= activeStep && i < activeStep && (
                  <CircleCheck size={14} style={{ color: "var(--teal)", marginLeft: 6, flexShrink: 0 }} />
                )}
              </li>
            ))}
          </ol>

          <div className="main-grid">
            {/* Upload card with burst ref */}
            <div ref={uploadZoneRef} style={{ position: "relative" }}>
              <UploadCard
                files={files}
                errors={uploadErrors}
                onAdd={addFiles}
                onRemove={removeFile}
                onDismissError={(id) =>
                  setUploadErrors((e) => e.filter((x) => x.id !== id))
                }
                gpsLocation={gpsLocation}
                onGpsChange={setGpsLocation}
                notify={notify}
              />
            </div>

            <section
              className={`card${typing ? " is-typing-glow" : ""}`}
              aria-labelledby="assistant-title"
            >
              <div className="card-head">
                <span className="step-badge">2</span>
                <div>
                  <h2 id="assistant-title">Tell our AI assistant</h2>
                  <p className="muted">
                    A quick conversation. We'll handle the details.
                  </p>
                </div>
              </div>

              <div className="tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "chat"}
                  className={tab === "chat" ? "is-active" : ""}
                  onClick={() => setTab("chat")}
                >
                  <MessageCircle size={18} /> Chat
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "voice"}
                  className={tab === "voice" ? "is-active" : ""}
                  onClick={() => setTab("voice")}
                >
                  <Phone size={18} /> Voice Call
                </button>
              </div>

              <div hidden={tab !== "chat"}>
                <ChatPanel
                  messages={messages}
                  typing={typing}
                  onSend={handleSend}
                  showChips={showChips}
                  chips={quickChips || undefined}
                >
                  {done && (
                    <div className="st-done">
                      <CircleCheck size={22} />
                      <div>
                        <strong>Report {done.id} recorded</strong>
                        <span>Taking you to your status page...</span>
                      </div>
                      <Link
                        className="btn btn-primary btn-sm"
                        to={`/status/${encodeURIComponent(done.id)}`}
                      >
                        View status
                      </Link>
                    </div>
                  )}
                </ChatPanel>
              </div>

              <div hidden={tab !== "voice"}>
                <VoicePanel
                  notify={notify}
                  mediaUrls={mediaUrls}
                  gpsLocation={gpsLocation}
                />
              </div>
            </section>
          </div>
        </main>

        <footer className="footer">
          <div className="container foot-inner">
            <p>
              <ShieldCheck size={18} /> Your report is shared only with your
              society manager. Your contact details stay private.
            </p>
            <div className="foot-row">
              <span>© 2026 PatchWork</span>
              <span>
                <button
                  className="link-btn"
                  onClick={() =>
                    notify({
                      variant: "info",
                      title: "Your privacy",
                      text: "Your phone and email are only sent to your society manager, never shown publicly.",
                    })
                  }
                >
                  Privacy
                </button>
                {" · "}
                <button
                  className="link-btn"
                  onClick={() =>
                    notify({
                      variant: "info",
                      title: "Need help?",
                      text: "Ask your society manager or the PatchWork team.",
                    })
                  }
                >
                  Get help
                </button>
              </span>
            </div>
          </div>
        </footer>
      </div>

      <Toasts
        toasts={toasts}
        onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
      />
    </div>
  );
}
