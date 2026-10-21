$file = 'C:\agy\PatchWork\frontend\src\styles.css'
$content = Get-Content $file -Raw

$insert = @"

/* ── Community accent: sky-blue ── */
:root {
  --blue: #0ea5e9;
  --blue-bg: #e0f2fe;
  --blue-ink: #0369a1;
  --green-glow: 0 0 20px rgba(6, 107, 94, 0.30);
  --green-glow-lg: 0 0 40px rgba(6, 107, 94, 0.22);
  --community-grad: linear-gradient(135deg, #066b5e 0%, #0ea5e9 100%);
}
:root[data-theme="dark"] {
  --blue: #38bdf8;
  --blue-bg: #082f49;
  --blue-ink: #7dd3fc;
  --green-glow: 0 0 24px rgba(63, 181, 162, 0.38);
  --green-glow-lg: 0 0 48px rgba(63, 181, 162, 0.22);
  --community-grad: linear-gradient(135deg, #3fb5a2 0%, #38bdf8 100%);
}

/* ── Scroll progress bar ── */
.scroll-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: var(--community-grad);
  z-index: 9999;
  pointer-events: none;
  transition: width 0.08s linear;
  border-radius: 0 2px 2px 0;
}

/* ── Chat typing glow ── */
@keyframes typing-glow {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%       { box-shadow: var(--green-glow); }
}
.is-typing-glow {
  animation: typing-glow 1.4s ease-in-out infinite;
}

/* ── Micro upload burst ── */
@keyframes burst-out {
  from { transform: translate(var(--dx,0px), var(--dy,0px)) scale(1); opacity: 1; }
  to   { transform: translate(calc(var(--dx,0px)*4), calc(var(--dy,0px)*4)) scale(0); opacity: 0; }
}
.upload-burst-dot {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 50%;
  pointer-events: none;
  animation: burst-out 0.6s ease-out forwards;
}

/* ── Reduced motion: kill canvas + heavy anims ── */
@media (prefers-reduced-motion: reduce) {
  canvas.bg-canvas { display: none !important; }
}

"@

$marker = "body {"
$content = $content.Replace($marker, $insert + $marker)
[System.IO.File]::WriteAllText($file, $content)
Write-Host "Done"
