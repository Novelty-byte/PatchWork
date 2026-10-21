import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  MessageCircle,
  Phone,
  MapPin,
  ThumbsUp,
  ShieldCheck,
  LayoutGrid,
  Clock,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import "../landing.css";

const LOGO = "/PatchWork_Community_Logo.webp";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

const STEPS = [
  {
    icon: Camera,
    title: "Snap it",
    text: "Add a photo or video of the problem. It is optional, but it helps.",
  },
  {
    icon: MessageCircle,
    title: "Tell our AI",
    text: "Chat or talk by voice call. The assistant asks for the location and details, so there is no form to fill.",
  },
  {
    icon: CircleCheck,
    title: "Get your ticket",
    text: "You receive a ticket ID like PW-482915 and a confirmation email. Your manager is alerted instantly.",
  },
];

const FEATURES = [
  {
    icon: Phone,
    title: "Voice or chat",
    text: "Report hands-free from the street. Just speak, and the AI creates the ticket.",
  },
  {
    icon: MapPin,
    title: "GPS and map view",
    text: "Share your exact spot with one tap. See every report on a live map.",
  },
  {
    icon: LayoutGrid,
    title: "Public live dashboard",
    text: "Everyone can see what is reported and what is fixed. That is real transparency.",
  },
  {
    icon: ThumbsUp,
    title: "+1 Confirm",
    text: "Neighbors confirm a problem so the most important ones rise to the top.",
  },
  {
    icon: Clock,
    title: "Solved, then cleared",
    text: "Fixed reports are marked solved and disappear 12 hours later.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    text: "Your phone and email are never shown publicly. No account needed.",
  },
];

export default function Landing() {
  useReveal();

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link to="/report" className="lp-brand">
            <img src={LOGO} alt="" className="lp-brand-logo" />
            PatchWork
          </Link>
          <div className="lp-nav-right">
            <Link to="/dashboard" className="lp-nav-link">
              Dashboard <ArrowUpRight size={14} />
            </Link>
            <Link to="/report" className="lp-btn lp-btn-sm">
              Report a problem
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-blob lp-blob-a" aria-hidden="true" />
        <div className="lp-blob lp-blob-b" aria-hidden="true" />
        <div className="lp-wrap lp-hero-in">
          <p className="lp-eyebrow">Report · Get Noticed · See It Fixed</p>
          <h1 className="lp-h1">
            Small reports.
            <br />
            <span className="lp-grad">Better neighborhoods.</span>
          </h1>
          <p className="lp-lead">
            PatchWork lets anyone report a broken streetlight, pothole, flooding
            or damaged property in under a minute. Just talk to our AI. No
            forms, no account.
          </p>
          <Link to="/report" className="lp-btn lp-btn-lg">
            Report a problem <ArrowRight size={20} />
          </Link>
          <p className="lp-note">
            Free · No account needed · Works on your phone
          </p>

          <div className="lp-ticket" aria-hidden="true">
            <span className="lp-chip">PW-482915</span>
            <span className="lp-chip lp-chip-amber">Medium</span>
            <strong>Broken Streetlight</strong>
            <span className="lp-ticket-sub">Open · waiting for a fix</span>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <h2 className="lp-h2 lp-reveal">How it works</h2>
          <p className="lp-sub lp-reveal">
            Three simple steps, and you are done.
          </p>
          <div className="lp-grid lp-grid-3">
            {STEPS.map((s, i) => (
              <div
                className="lp-card lp-reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
                key={s.title}
              >
                <span className="lp-num">{i + 1}</span>
                <span className="lp-icon">
                  <s.icon size={24} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-wrap">
          <h2 className="lp-h2 lp-reveal">Built for the community</h2>
          <p className="lp-sub lp-reveal">
            Everything a neighborhood needs to get problems seen and fixed.
          </p>
          <div className="lp-grid lp-grid-3">
            {FEATURES.map((f, i) => (
              <div
                className="lp-card lp-reveal"
                style={{ transitionDelay: `${(i % 3) * 100}ms` }}
                key={f.title}
              >
                <span className="lp-icon">
                  <f.icon size={24} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta lp-reveal">
        <div className="lp-wrap">
          <h2 className="lp-h2">See a problem? Let us patch it.</h2>
          <p className="lp-sub">It takes less than a minute.</p>
          <Link to="/report" className="lp-btn lp-btn-lg">
            Report a problem <ArrowRight size={20} />
          </Link>
          <p className="lp-note">
            or{" "}
            <Link to="/dashboard" className="lp-inline">
              view the live dashboard
            </Link>
          </p>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          © 2026 PatchWork · Report · Get Noticed · See It Fixed
        </div>
      </footer>
    </div>
  );
}
