import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';

const ICONS = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info };

export default function Toasts({ toasts, onClose }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant] || CircleCheck;
        return (
          <div key={t.id} className={`toast toast-${t.variant}`} role={t.variant === 'error' ? 'alert' : 'status'}>
            <Icon size={20} className="toast-icon" />
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.text && <span>{t.text}</span>}
            </div>
            <button className="icon-btn" onClick={() => onClose(t.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
