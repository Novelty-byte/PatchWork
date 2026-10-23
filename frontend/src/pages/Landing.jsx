import { useEffect, useRef, useState } from "react";
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
  ArrowDown,
  CircleCheck,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import BgCanvas from "../components/BgCanvas.jsx";
import { fetchReports } from "../services/managerApi";
import useSpotlight from "../hooks/useSpotlight.js";
import "../styles/landing.css";

const LOGO = "/patchwork-logo.jpeg";

/* ── Enhanced Scroll reveal with parallax-like scaling ── */
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
            // Don't unobserve, so it stays responsive to scroll up/down
          } else {
            en.target.classList.remove("is-in");
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/* ── Scroll progress bar ── */
function useScrollBar() {
  useEffect(() => {
    const bar = document.getElementById("lp-scroll-bar");
    if (!bar) return;
    function onScroll() {
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/* ── Count-up hook ── */
function useCountUp(target, duration = 1600) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    let animId;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) animId = requestAnimationFrame(step);
          }
          animId = requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [target, duration]);

  return [value, ref];
}

/* ── Stats items ── */
const STATS = [
  { value: 0, label: "Reports tracked",  suffix: "+" },
  { value: 0, label: "Neighbors helped", suffix: "+" },
  { value: 0, label: "Issues resolved",  suffix: "%" },
];

function StatItem({ value, label, suffix }) {
  const [count, ref] = useCountUp(value);
  return (
    <div className="lp-stat-item" ref={ref}>
      <span className="lp-stat-val">
        {count}
        <span className="lp-stat-suffix">{suffix}</span>
      </span>
      <span className="lp-stat-label">{label}</span>
    </div>
  );
}

/* ── Community quotes ── */
const QUOTES = [
  {
    text: "The streetlight outside my building was fixed in two days. I never expected it to be this easy!",
    name: "Aisha K.",
    area: "Block C",
    initials: "AK",
  },
  {
    text: "I reported a pothole and 12 neighbors confirmed it — the patch team came the very next morning.",
    name: "Omar F.",
    area: "Sector 7",
    initials: "OF",
  },
  {
    text: "Finally, a real way to be heard by our manager. PatchWork actually works.",
    name: "Priya S.",
    area: "Tower 2",
    initials: "PS",
  },
  {
    text: "Used voice call while standing at the broken gate. Done in under a minute. Amazing.",
    name: "Daud M.",
    area: "Phase 4",
    initials: "DM",
  },
];

function QuoteCarousel() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const hovered = useRef(false);

  function goTo(idx) {
    if (idx === active) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 120);
  }

  useEffect(() => {
    function next() {
      if (!hovered.current) {
        goTo((active + 1) % QUOTES.length);
      }
    }
    timerRef.current = setTimeout(next, 5000);
    return () => clearTimeout(timerRef.current);
  }, [active]);

  const q = QUOTES[active];
  const isBlue = active % 2 === 1;

  return (
    <section className="lp-quotes lp-section">
      <div className="lp-wrap lp-quotes-wrap">
        <p className="lp-quotes-label lp-reveal">What the community says</p>
        <div
          className={`lp-quote-card lp-reveal is-in${isBlue ? " is-blue" : ""}${animating ? " animating" : ""}`}
          onMouseEnter={() => (hovered.current = true)}
          onMouseLeave={() => (hovered.current = false)}
        >
          <p className="lp-quote-text">"{q.text}"</p>
          <div className="lp-quote-author">
            <div className="lp-quote-avatar">{q.initials}</div>
            <div>
              <div className="lp-quote-name">{q.name}</div>
              <div className="lp-quote-area">{q.area}</div>
            </div>
          </div>
        </div>
        <div className="lp-quote-dots">
          {QUOTES.map((_, i) => (
            <button
              key={i}
              className={`lp-quote-dot${i === active ? " is-active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Quote ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
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
  useScrollBar();
  const [stats, setStats] = useState(STATS);
  const spotlight = useSpotlight();
  const [scrollIndicatorActive, setScrollIndicatorActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Enhanced scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
      setScrollProgress(scrollPercent);
      setScrollIndicatorActive(scrollPercent < 95);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Ticket tilt on cursor (skipped on touch / reduced motion) ── */
  function handleTilt(e) {
    const el = e.currentTarget;
    if (window.matchMedia("(hover: none)").matches) return;
    if (
      window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    )
      return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${px * 12}deg) rotateX(${-(py * 12)}deg)`;
  }
  function resetTilt(e) {
    e.currentTarget.style.transform = "";
  }

  useEffect(() => {
    let unmounted = false;
    fetchReports()
      .then((data) => {
        if (unmounted) return;
        const reports = Array.isArray(data) ? data : (data?.reports || []);

        // Use the total historical counts if provided, otherwise fallback to dashboard count
        const totalReportsTracked = data?.total_reports_tracked || reports.length;
        const totalNeighborsHelped = data?.total_neighbors_helped || reports.filter(
          (r) => String(r.status).toLowerCase() === "solved"
        ).length;

        const solveRate = totalReportsTracked > 0
          ? Math.round((totalNeighborsHelped / totalReportsTracked) * 100)
          : 0;

        setStats([
          { value: totalReportsTracked, label: "Reports tracked", suffix: totalReportsTracked >= 10 ? "+" : "" },
          { value: totalNeighborsHelped, label: "Neighbors helped", suffix: totalNeighborsHelped >= 10 ? "+" : "" },
          { value: solveRate, label: "Issues resolved", suffix: "%" },
        ]);
      })
      .catch(() => {});

    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <div className="lp">
      {/* ── Scroll progress ── */}
      <div id="lp-scroll-bar" className="scroll-bar" style={{ width: `${scrollProgress}%` }} />
      {/* ── Scroll indicator ── */}
      <div className={`lp-scroll-indicator${scrollIndicatorActive ? ' is-active' : ''}`}>
        <ArrowDown size={18} />
      </div>

      {/* ── Floating neighborhood icons across the whole page ── */}
      <BgCanvas mode="icons-page" fixed />

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <a href="https://patch-work-app.vercel.app" className="lp-brand">
            <img src={LOGO} alt="" className="lp-brand-logo" />
            PatchWork
          </a>
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

      {/* ── Hero ── */}
      <section className="lp-hero">
        <BgCanvas mode="scene" />
        <div className="lp-blob lp-blob-a" aria-hidden="true" />
        <div className="lp-blob lp-blob-b" aria-hidden="true" />
        <div className="lp-blob lp-blob-c" aria-hidden="true" />
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
          <Link to="/report" className="lp-btn lp-btn-lg shine-sweep">
            Report a problem <ArrowRight size={20} />
          </Link>
          <p className="lp-note">
            Free · No account needed · Works on your phone
          </p>

          <div className="lp2-tilt-wrap">
            <div
              className="lp-ticket border-flow"
              aria-hidden="true"
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
            >
              <span className="lp-chip">PW-482915</span>
              <span className="lp-chip lp-chip-amber">Medium</span>
              <span className="lp-chip lp-chip-blue">👍 +3 neighbors confirmed</span>
              <strong>Broken Streetlight</strong>
              <span className="lp-ticket-sub">Open · waiting for a fix</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Community stats bar ── */}
      <section className="lp-stats">
        <div className="lp-wrap lp-stats-in">
          {stats.map((s) => (
            <StatItem key={s.label} value={s.value} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <h2 className="lp-h2 lp-reveal">How it works</h2>
          <p className="lp-sub lp-reveal">
            Three simple steps, and you are done.
          </p>
          <div className="lp-grid lp-grid-3">
            {STEPS.map((s, i) => (
              <div
                className="lp-card lp-reveal lp2-step-glow spotlight"
                style={{ transitionDelay: `${i * 100}ms` }}
                onMouseMove={spotlight}
                key={s.title}
              >
                <span className="lp-num lp2-card">{i + 1}</span>
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

      {/* ── Community quotes ── */}
      <QuoteCarousel />

      {/* ── Features ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-wrap">
          <h2 className="lp-h2 lp-reveal">Built for the community</h2>
          <p className="lp-sub lp-reveal">
            Everything a neighborhood needs to get problems seen and fixed.
          </p>
          <div className="lp-grid lp-grid-3">
            {FEATURES.map((f, i) => (
              <div
                className="lp-card lp-reveal spotlight"
                style={{ transitionDelay: `${(i % 3) * 100}ms` }}
                onMouseMove={spotlight}
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

      {/* ── CTA ── */}
      <section className="lp-cta lp-reveal">
        <div className="lp-wrap">
          <h2 className="lp-h2 lp-reveal">See a problem? Let us patch it.</h2>
          <p className="lp-sub lp-reveal">It takes less than a minute.</p>
          <div className="lp-reveal">
            <Link to="/report" className="lp-btn lp-btn-lg">
              Report a problem <ArrowRight size={20} />
            </Link>
          </div>
          <p className="lp-note lp-reveal">
            or{" "}
            <Link to="/dashboard" className="lp-inline">
              view the live dashboard
            </Link>
          </p>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-content">
          <img 
            src="/PatchWork_Community_Logo.webp" 
            alt="PatchWork Community" 
            className="lp-footer-logo lp-reveal"
          />
          <p className="lp-footer-text">© 2026 PatchWork · Report · Get Noticed · See It Fixed</p>
        </div>
      </footer>
    </div>
  );
}
