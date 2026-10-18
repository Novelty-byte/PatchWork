import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, ArrowUpRight, Heart, ShieldCheck, MessageCircle, Phone, CircleCheck } from 'lucide-react';
import UploadCard from './components/UploadCard.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import VoicePanel from './components/VoicePanel.jsx';
import Toasts from './components/Toasts.jsx';
import { uploadFile, sendChat } from './api';

const MAX_FILES = 5;
const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = ['jpg', 'jpeg', 'png', 'heic', 'mp4', 'mov'];
const GREETING = 'Hello! Welcome to PatchWork. What problem would you like to report today?';

export default function App() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([{ role: 'assistant', text: GREETING }]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(null);
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const redirectTimer = useRef(null);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    document.title = 'PatchWork – Report a neighborhood problem';
    return () => clearTimeout(redirectTimer.current);
  }, []);

  const notify = (t) => {
    const id = nextId();
    setToasts((list) => [...list, { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 6000);
  };

  /* ---------- uploads ---------- */
  const patchFile = (id, patch) => setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function startUpload(file, ext) {
    const id = nextId();
    setFiles((list) => [
      ...list,
      {
        id,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video') || ['mp4', 'mov'].includes(ext),
        progress: 0,
        status: 'uploading',
        url: null,
      },
    ]);
    uploadFile(file, (p) => patchFile(id, { progress: p }))
      .then((url) => patchFile(id, { status: 'done', progress: 100, url }))
      .catch(() => patchFile(id, { status: 'error' }));
  }

  function addFiles(fileList) {
    let slots = MAX_FILES - files.length;
    const errs = [];
    [...fileList].forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED.includes(ext)) {
        errs.push({ id: nextId(), title: 'Unsupported file type', text: `${file.name} couldn't be added. Use JPG, PNG, HEIC, MP4 or MOV.` });
      } else if (file.size > MAX_SIZE) {
        errs.push({ id: nextId(), title: 'This file is too large', text: `${file.name} is ${(file.size / 1048576).toFixed(0)}MB. Choose a file under 25MB.` });
      } else if (slots <= 0) {
        errs.push({ id: nextId(), title: 'Too many files', text: `You can add up to ${MAX_FILES} files. Remove one to add another.` });
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

  const mediaUrls = files.filter((f) => f.status === 'done' && f.url).map((f) => f.url);

  /* ---------- chat ---------- */
  async function handleSend(text) {
    if (done) return;
    const history = messages.map((m) => ({ sender: m.role === 'user' ? 'user' : 'bot', text: m.text }));
    setMessages((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    try {
      const data = await sendChat({ message: text, history, media_urls: mediaUrls });
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
      if (data.is_complete && data.report && data.report.id) {
        const id = data.report.id;
        setDone({ id });
        redirectTimer.current = setTimeout(() => navigate(`/status/${encodeURIComponent(id)}`), 4000);
      }
    } catch (err) {
      notify({ variant: 'error', title: "Patch couldn't reply", text: err.message });
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark"><Sprout size={20} /></span>
            PatchWork
          </Link>
          <Link className="nav-link" to="/dashboard">
            Dashboard <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="kicker"><i className="dot" /> SMALL REPORTS. BETTER NEIGHBORHOODS.</p>
            <h1>
              See a problem?
              <br />
              Report it in under a minute.
            </h1>
            <p className="lead">
              Upload photos or video, then describe the issue to our AI assistant by chat or voice call. Your manager is alerted instantly. You get a confirmation email.
            </p>
          </div>
          <aside className="hero-card">
            <Heart size={26} />
            <h2>A little care goes a long way.</h2>
            <p>Help your society manager see what needs attention.</p>
            <span className="badge-plain">No account needed</span>
          </aside>
        </section>

        <ol className="steps">
          <li><b>1.</b><span>Add photos/video<small>Optional</small></span></li>
          <li><b>2.</b><span>Describe the problem</span></li>
          <li><b>3.</b><span>Get confirmation</span></li>
        </ol>

        <div className="main-grid">
          <UploadCard
            files={files}
            errors={uploadErrors}
            onAdd={addFiles}
            onRemove={removeFile}
            onDismissError={(id) => setUploadErrors((e) => e.filter((x) => x.id !== id))}
          />

          <section className="card" aria-labelledby="assistant-title">
            <div className="card-head">
              <span className="step-badge">2</span>
              <div>
                <h2 id="assistant-title">Tell our AI assistant</h2>
                <p className="muted">A quick conversation. We'll handle the details.</p>
              </div>
            </div>

            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'is-active' : ''} onClick={() => setTab('chat')}>
                <MessageCircle size={18} /> Chat
              </button>
              <button role="tab" aria-selected={tab === 'voice'} className={tab === 'voice' ? 'is-active' : ''} onClick={() => setTab('voice')}>
                <Phone size={18} /> Voice Call
              </button>
            </div>

            <div hidden={tab !== 'chat'}>
              <ChatPanel messages={messages} typing={typing} onSend={handleSend} showChips={false}>
                {done && (
                  <div className="st-done">
                    <CircleCheck size={22} />
                    <div>
                      <strong>Report {done.id} recorded</strong>
                      <span>Taking you to your status page...</span>
                    </div>
                    <Link className="btn btn-primary btn-sm" to={`/status/${encodeURIComponent(done.id)}`}>View status</Link>
                  </div>
                )}
              </ChatPanel>
            </div>

            <div hidden={tab !== 'voice'}>
              <VoicePanel notify={notify} mediaUrls={mediaUrls} />
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container foot-inner">
          <p><ShieldCheck size={18} /> Your report is shared only with your society manager. Your contact details stay private.</p>
          <div className="foot-row">
            <span>© 2026 PatchWork</span>
            <span>
              <button className="link-btn" onClick={() => notify({ variant: 'info', title: 'Your privacy', text: 'Your phone and email are only sent to your society manager, never shown publicly.' })}>Privacy</button>
              {' · '}
              <button className="link-btn" onClick={() => notify({ variant: 'info', title: 'Need help?', text: 'Ask your society manager or the PatchWork team.' })}>Get help</button>
            </span>
          </div>
        </div>
      </footer>

      <Toasts toasts={toasts} onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))} />
    </div>
  );
}
