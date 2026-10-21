import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Phone, PhoneOff, PhoneOutgoing, Check, ArrowRight } from 'lucide-react';
import { MOCK, getVapiConfig, getLatestVoiceTicket } from '../api';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const BARS = [10, 18, 28, 16, 34, 22, 40, 26, 14, 36, 20, 30, 12, 38, 24, 16, 32, 22, 12, 28];
const TICKET_RE = /\bPW-\d{3,8}\b/i;

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
        <div className="wave" aria-hidden="true">
          {BARS.map((h, i) => (
            <span key={i} style={{ height: h, animationDelay: `${i * 70}ms` }} />
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
