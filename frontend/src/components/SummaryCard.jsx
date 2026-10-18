import { ClipboardCheck, Info } from 'lucide-react';

export const SEVERITIES = ['low', 'medium', 'high'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function SeverityBadge({ level }) {
  return <span className={`badge badge-sev-${level}`}>{cap(level)}</span>;
}

export default function SummaryCard({ report, category, editing, onChange }) {
  return (
    <div className="summary">
      <div className="summary-head">
        <span>
          <ClipboardCheck size={18} /> Your report summary
        </span>
        <span className="badge-plain">Ready for review</span>
      </div>

      <div className="summary-grid">
        <div>
          <span className="eyebrow">CATEGORY</span>
          <strong>{category}</strong>
        </div>
        <div>
          <span className="eyebrow">SEVERITY</span>
          {editing ? (
            <select value={report.severity} onChange={(e) => onChange({ severity: e.target.value })} aria-label="Severity">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {cap(s)}
                </option>
              ))}
            </select>
          ) : (
            <SeverityBadge level={report.severity} />
          )}
        </div>
      </div>

      <div className="summary-row">
        <span className="eyebrow">LOCATION</span>
        {editing ? (
          <input value={report.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="Street, landmark" aria-label="Location" />
        ) : (
          <p>{report.location || 'Not added yet'}</p>
        )}
      </div>

      <div className="summary-row">
        <span className="eyebrow">DESCRIPTION</span>
        {editing ? (
          <textarea rows={3} value={report.description} onChange={(e) => onChange({ description: e.target.value })} aria-label="Description" />
        ) : (
          <p>{report.description || 'Not added yet'}</p>
        )}
      </div>

      {editing && (
        <div className="summary-row two">
          <div>
            <span className="eyebrow">YOUR NAME</span>
            <input value={report.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Optional" aria-label="Your name" />
          </div>
          <div>
            <span className="eyebrow">PHONE</span>
            <input value={report.contact} onChange={(e) => onChange({ contact: e.target.value })} placeholder="Optional" aria-label="Phone" />
          </div>
        </div>
      )}

      <p className="note tight">
        <Info size={14} /> Nothing is sent until you confirm.
      </p>
    </div>
  );
}
