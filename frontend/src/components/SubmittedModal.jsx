import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Check, Mail } from "lucide-react";

export default function SubmittedModal({
  id,
  category,
  location,
  email,
  onReset,
}) {
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
  }, []);

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="done-title"
    >
      <div className="modal">
        <span className="icon-tile lg round">
          <Check size={28} />
        </span>
        <span className="badge badge-teal">REPORT {id}</span>
        <h2 id="done-title" className="modal-title">
          Reported. Thank you for caring.
        </h2>
        <p className="muted">
          Your society manager has been alerted about the{" "}
          {category.toLowerCase()} report at {location}.
        </p>
        <div className="mail-box">
          <Mail size={18} />
          <strong>Confirmation email sent</strong>
          <span>{email}</span>
          <p className="muted small">
            Keep report {id} handy if you need to follow up with your manager.
          </p>
        </div>
        <p className="muted small">
          What's next? Your manager will review the report and coordinate the
          repair.
        </p>
        <Link
          ref={btn}
          className="btn btn-primary full"
          to={`/report/${encodeURIComponent(id)}`}
        >
          View report status
        </Link>
        <button className="btn btn-secondary full" onClick={onReset}>
          Report another problem
        </button>
      </div>
    </div>
  );
}
