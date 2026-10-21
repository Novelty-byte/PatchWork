$file = 'C:\agy\PatchWork\frontend\src\pages\StatusPage.jsx'
$content = [System.IO.File]::ReadAllText($file)

# 1. Add useRef to imports
$content = $content.Replace(
  'import { useCallback, useEffect, useState } from "react";',
  'import { useCallback, useEffect, useRef, useState } from "react";'
)

# 2. Add BgCanvas + Confetti imports after ThemeToggle import
$content = $content.Replace(
  'import ThemeToggle from "../components/ThemeToggle.jsx";',
  'import ThemeToggle from "../components/ThemeToggle.jsx";
import BgCanvas from "../components/BgCanvas.jsx";
import Confetti from "../components/Confetti.jsx";'
)

# 3. Wrap st-page with bg canvas (add it inside Layout render)
$content = $content.Replace(
  '<div className="st-page">',
  '<div className="st-page">
      <div className="st-bg-wrap" aria-hidden="true"><BgCanvas mode="aurora" /></div>'
)

# 4. Add timeline animation trigger to ReportView — add useEffect after useState for copied
$content = $content.Replace(
  'function ReportView({ report }) {
  const [copied, setCopied] = useState(false);',
  'function ReportView({ report }) {
  const [copied, setCopied] = useState(false);
  const confettiShown = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animate timeline in
  useEffect(() => {
    const items = document.querySelectorAll(".st-timeline li");
    if (!items.length) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      items.forEach((el) => el.classList.add("tl-in"));
      return;
    }
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add("tl-in"), i * 200 + 300);
    });
  }, []);

  // One-shot confetti for solved status
  useEffect(() => {
    const solved = String(report.status).toLowerCase() === "solved";
    if (solved && !confettiShown.current) {
      confettiShown.current = true;
      setTimeout(() => setShowConfetti(true), 600);
      setTimeout(() => setShowConfetti(false), 3200);
    }
  }, [report.status]);'
)

# 5. Enhanced copy function with flash class
$content = $content.Replace(
  '  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };',
  '  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      // Flash animation on copy button
      const btn = document.querySelector(".st-copy");
      if (btn) {
        btn.classList.add("copy-flashed");
        setTimeout(() => btn.classList.remove("copy-flashed"), 600);
      }
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };'
)

# 6. Add confetti render + glow class on circle + tooltip on copy
$content = $content.Replace(
  '  return (
    <>
      <div className="st-head">
        <span className="st-circle">
          <Check size={30} />
        </span>',
  '  const solved = String(report.status).toLowerCase() === "solved";
  return (
    <>
      {showConfetti && <Confetti duration={2600} />}
      <div className="st-head">
        <span className={`st-circle${solved ? " is-solved-glow" : ""}`}>
          <Check size={30} />
        </span>'
)

# 7. Remove the duplicate solved const that was earlier in the file (it''s now declared above return)
# The original had: const solved = String(report.status).toLowerCase() === "solved";
# We need to remove it from the old location
$content = $content.Replace(
  '  const solved = String(report.status).toLowerCase() === "solved";
  const photos = Array.isArray(report.media_urls) ? report.media_urls : [];',
  '  const photos = Array.isArray(report.media_urls) ? report.media_urls : [];'
)

# 8. Add tooltip to copy button 
$content = $content.Replace(
  '          <button
            className="st-copy"
            onClick={copy}
            aria-label="Copy report number"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>',
  '          <button
            className="st-copy"
            onClick={copy}
            aria-label="Copy report number"
            style={{ position: "relative" }}
          >
            {copied && <span className="st-copy-tooltip">Copied!</span>}
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>'
)

[System.IO.File]::WriteAllText($file, $content)
Write-Host "Done"
