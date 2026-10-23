import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import CategoryIllustration from './CategoryIllustration.jsx';

const CHIPS = ['Near the main gate', 'Near the park', 'Type a location'];

const QUICK_PICKS = [
  'Broken Streetlight',
  'Pothole',
  'Sewage',
  'Flooding',
  'Damaged Park',
  'Damaged Building',
  'Other',
];

export default function ChatPanel({ messages, typing, onSend, children, showChips, chips = CHIPS, done = false }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, typing, children]);

  const send = (value) => {
    const v = value.trim();
    if (!v || typing) return;
    onSend(v);
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat-head">
        <span className={`icon-tile sm${typing ? ' rp3-synaptic' : ''}`}>
          <Sparkles size={16} />
        </span>
        <strong>Patch is here to help</strong>
        <span className="badge badge-teal">Online</span>
      </div>

      <div className="messages" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-bot'}${m.role === 'assistant' && typing && i === messages.length - 1 ? ' rp3-synaptic' : ''}`}
          >
            <span className="bubble-label">{m.role === 'user' ? 'You' : 'Patch · AI assistant'}</span>
            <p>{m.text}</p>
          </div>
        ))}
        {showChips && !typing && (
          <div className="chips">
            {(chips || CHIPS).map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                onClick={() => (c === 'Type a location' ? inputRef.current?.focus() : send(c))}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {typing && (
          <div className="typing" aria-label="Patch is typing">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {children}

      {!done && (
        <div className="rp3-quickpick" role="group" aria-label="Common categories">
          {QUICK_PICKS.map((c) => (
            <button
              key={c}
              type="button"
              className="rp3-qp-card"
              onClick={() => send(c)}
              disabled={typing}
              title={`Report: ${c}`}
            >
              <span className="rp3-qp-ill" style={{ color: 'var(--teal)' }}>
                <CategoryIllustration category={c} />
              </span>
              {c}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add more details..." aria-label="Message" />
        <button type="submit" className="send-btn" aria-label="Send message" disabled={!text.trim() || typing}>
          <ArrowUp size={18} />
        </button>
      </form>
      <p className="hint">AI can make mistakes. Please check your report before submitting.</p>
    </div>
  );
}
