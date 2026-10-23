import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Phone, PhoneOff, PhoneOutgoing, Check, ArrowRight } from 'lucide-react';
import { MOCK, getVapiConfig, getLatestVoiceTicket } from '../services/api';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const BARS = [10, 18, 28, 16, 34, 22, 40, 26, 14, 36, 20, 30, 12, 38, 24, 16, 32, 22, 12, 28];
const TICKET_RE = /\bPW-\d{3,8}\b/i;

/* ── Procedural audio wave canvas: concentric rings + bezier ribbons ── */
function WaveCanvas({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let animId = 0;
    let t = 0;
    const dpr = window.devicePixelRatio || 1;

    const fit = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, 1, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const teal = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#066b5e';

    function tick() {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      t += 0.03;

      const cx = W / 2;
      const cy = H / 2;

      /* concentric oscillating rings */
      for (let i = 0; i < 3; i++) {
        const baseR = 10 + i * 9;
        const r = baseR + Math.sin(t * (1.4 + i * 0.35)) * (active ? 4.5 : 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = teal;
        ctx.globalAlpha = 0.5 - i * 0.13;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* smooth bezier ribbon waves with swimming fish accents */
      for (let b = 0; b < 2; b++) {
        const amp = (active ? 13 : 5) + b * 4;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 5) {
          const y =
            cy +
            Math.sin(x * 0.024 + t * (2.2 + b * 0.6)) * amp * 0.5 +
            Math.sin(x * 0.011 - t * (1.1 + b * 0.4)) * amp * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = teal;
        ctx.globalAlpha = (b === 0 ? 0.75 : 0.4) * (active ? 1 : 0.55);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      /* Draw swimming fish accents along the wave */
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const fishColors = isDark
        ? ["#3fb5a2", "#38bdf8", "#f2bc57"]
        : ["#066b5e", "#0ea5e9", "#d97706"];

      for (let f = 0; f < 3; f++) {
        const fishX = ((t * (20 + f * 10)) + f * 100) % (W + 40) - 20;
        const amp = (active ? 13 : 5);
        const fishY = cy + Math.sin(fishX * 0.024 + t * 2.2) * amp * 0.5;

        ctx.save();
        ctx.translate(fishX, fishY);
        ctx.fillStyle = fishColors[f % fishColors.length];
        ctx.globalAlpha = active ? 0.8 : 0.4;

        // Simple fish shape
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); // Body
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-10, -3);
        ctx.lineTo(-10, 3);
        ctx.closePath(); // Tail
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [active]);

  return <canvas ref={ref} className="rp3-wave-canvas" aria-hidden="true" />;
}

function Transcript({ lines, label, status }) {
  return (
    <div className="transcript">
      <div className="transcript-head">
        <span>{label}</span>
        <span>{status}</span>
      </div>
      {lines.length === 0 && <p className="muted small">Your conversation will appear here.</p>}
      {lines.map((l, i) => (
        <div key={i} className="t-line">
          <span className="eyebrow">{l.role === 'user' ? 'YOU' : 'PATCH'}</span>
          <p>{l.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function VoicePanel({ notify, mediaUrls = [], gpsLocation = null }) {
  const navigate = useNavigate();
  const [state, setState] = useState('idle'); // idle | permission | connecting | active | ended
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [manualId, setManualId] = useState('');
  const vapiRef = useRef(null);
  const mockTimers = useRef([]);

  useEffect(() => {
    if (state !== 'active') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(
    () => () => {
      vapiRef.current?.stop?.();
      mockTimers.current.forEach(clearTimeout);
    },
    []
  );

  const addLine = (line) => {
    setTranscript((t) => [...t, line]);
    const hit = line.text.match(TICKET_RE);
    if (hit) setTicket(hit[0].toUpperCase());
  };

  async function allowMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setState('idle');
      notify({
        variant: 'warning',
        title: 'Microphone access is blocked',
        text: 'Enable your microphone in browser settings, or use Chat to finish your report.',
      });
      return;
    }
    setTranscript([]);
    setTicket(null);
    setManualId('');
    setSeconds(0);
    setState('connecting');

    if (MOCK) {
      mockTimers.current = [
        setTimeout(() => setState('active'), 1200),
        setTimeout(() => addLine({ role: 'assistant', text: 'Where is the problem, and how long has it been there?' }), 2200),
        setTimeout(() => addLine({ role: 'user', text: 'Street 5, near the park entrance. It has been out for two nights.' }), 4000),
        setTimeout(() => addLine({ role: 'assistant', text: 'Thank you! I have logged your report. Your ticket ID is PW-1048.' }), 5500),
      ];
      return;
    }

    try {
      const cfg = await getVapiConfig();
      if (!cfg.publicKey || !cfg.assistantId || cfg.ready === false) throw new Error('The voice assistant is not ready yet. Use Chat for now.');
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(cfg.publicKey);
      vapiRef.current = vapi;
      vapi.on('call-start', () => setState('active'));
      vapi.on('call-end', async () => {
        setState((s) => (s === 'idle' ? 'idle' : 'ended'));
        // Fallback: if transcript regex didn't catch ticket, query latest ticket from backend
        try {
          const d = await getLatestVoiceTicket();
          if (d?.ticket_id) {
            setTicket((prev) => prev || d.ticket_id);
          }
        } catch {
          /* ignore fallback error */
        }
      });
      vapi.on('message', (m) => {
        if (m.type === 'transcript' && m.transcriptType === 'final') {
          addLine({ role: m.role, text: m.transcript });
        } else if (/tool|function/i.test(m.type || '')) {
          const hit = JSON.stringify(m).match(TICKET_RE);
          if (hit) setTicket(hit[0].toUpperCase());
        }
      });
      vapi.on('error', () => {
        notify({ variant: 'error', title: 'The call was interrupted', text: 'Check your connection and try again, or use Chat.' });
        setState('idle');
      });

      const startOverrides = { variableValues: {} };
      if (mediaUrls && mediaUrls.length > 0) {
        startOverrides.variableValues.media_urls = mediaUrls.join(',');
      }
      if (gpsLocation) {
        startOverrides.variableValues.gps_lat = String(gpsLocation.lat);
        startOverrides.variableValues.gps_lng = String(gpsLocation.lng);
        startOverrides.variableValues.gps_address = gpsLocation.address || '';
        startOverrides.variableValues.gps_text = gpsLocation.address
          ? `📍 GPS: ${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)} (${gpsLocation.address})`
          : `📍 GPS: ${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)}`;
      }
      await vapi.start(cfg.assistantId, startOverrides);
    } catch (err) {
      notify({ variant: 'error', title: "Couldn't start the call", text: err.message });
      setState('idle');
    }
  }

  function cancel() {
    mockTimers.current.forEach(clearTimeout);
    vapiRef.current?.stop?.();
    setState('idle');
  }

  function hangUp() {
    mockTimers.current.forEach(clearTimeout);
    if (MOCK || !vapiRef.current) setState('ended');
    else vapiRef.current.stop();
  }

  const openManual = (e) => {
    e.preventDefault();
    const id = manualId.trim().toUpperCase();
    if (id) navigate(`/status/${encodeURIComponent(id)}`);
  };

  if (state === 'idle')
    return (
      <div className="voice">
        <span className="orb"><Mic size={30} /></span>
        <h3>Let's talk it through</h3>
        <p className="muted center">Tell us what happened, in your own words. Patch will ask a few helpful questions.</p>
        <button className="btn btn-primary full" onClick={() => setState('permission')}>
          <Phone size={18} /> Start voice call
        </button>
        <p className="muted tiny">Microphone required · No phone number needed</p>
      </div>
    );

  if (state === 'permission')
    return (
      <div className="voice">
        <span className="orb"><Mic size={30} /></span>
        <h3>One quick permission</h3>
        <p className="muted center">Allow your microphone to start your call.</p>
        <div className="perm-card">
          <span className="icon-tile sm"><Mic size={18} /></span>
          <h4>Allow microphone access?</h4>
          <p className="muted small">PatchWork needs your microphone to talk with the AI assistant. Your voice is used only for this report.</p>
          <button className="btn btn-primary full" onClick={allowMic}><Mic size={18} /> Allow microphone</button>
          <button className="btn btn-secondary full" onClick={() => setState('idle')}>Not now</button>
          <p className="muted tiny left">Your browser will also ask for permission. Prefer typing? Switch to Chat anytime.</p>
        </div>
      </div>
    );

  if (state === 'connecting')
    return (
      <div className="voice">
        <span className="orb"><PhoneOutgoing size={30} /></span>
        <h3>Connecting to Patch...</h3>
        <p className="muted center">Setting up a secure voice connection. This usually takes a few seconds.</p>
        <div className="typing solo"><span /><span /><span /></div>
        <button className="btn btn-secondary full" onClick={cancel}>Cancel connection</button>
      </div>
    );

  if (state === 'active')
    return (
      <div className="voice">
        <span className="orb is-live"><Mic size={30} /></span>
        <h3>We're listening</h3>
        <p className="muted center">Speak naturally. Your transcript appears below.</p>
        <WaveCanvas active />
        <div className="wave rm-fallback" aria-hidden="true">
          {BARS.map((h, i) => (
            <span key={i} style={{ height: h }} />
          ))}
        </div>
        <span className="badge badge-teal"><i className="dot" /> In call · {fmt(seconds)}</span>
        <button className="btn btn-danger full" onClick={hangUp}><PhoneOff size={18} /> Hang Up</button>
        <Transcript lines={transcript} label="LIVE TRANSCRIPT" status="Live" />
      </div>
    );

  return (
    <div className="voice">
      <span className="orb"><Check size={30} /></span>
      <h3>Call ended</h3>
      <p className="muted center">
        Call length · {fmt(seconds)}
        <br />
        {ticket ? `Your ticket ID is ${ticket}.` : 'If the assistant gave you a ticket ID, you can open your status page below.'}
      </p>
      <Transcript lines={transcript} label="CALL TRANSCRIPT" status="Saved" />
      {ticket ? (
        <Link className="btn btn-primary full" to={`/status/${encodeURIComponent(ticket)}`}>
          <ArrowRight size={18} /> View report status
        </Link>
      ) : (
        <form className="voice-find" onSubmit={openManual}>
          <div className="input">
            <input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Ticket ID, e.g. PW-526666" aria-label="Ticket ID" />
          </div>
          <button className="btn btn-primary full" type="submit" disabled={!manualId.trim()}>
            <ArrowRight size={18} /> View report status
          </button>
        </form>
      )}
      <button className="btn btn-secondary full" onClick={() => { setTranscript([]); setSeconds(0); setTicket(null); setState('permission'); }}>
        Call again
      </button>
    </div>
  );
}
