import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function Select({ label, value, options, onChange, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="field" ref={ref}>
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className={`select-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <ul className="select-list" role="listbox">
          {options.map((o) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              className={o === value ? 'is-selected' : ''}
              tabIndex={0}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(o);
                  setOpen(false);
                }
              }}
            >
              {o}
              {o === value && <Check size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
