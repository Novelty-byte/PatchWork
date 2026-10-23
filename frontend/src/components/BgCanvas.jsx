import { useEffect, useRef } from "react";

/**
 * BgCanvas — animated background canvas
 * mode: 'icons' | 'icons-page' | 'aurora' | 'dots' | 'radar' | 'dashboard' | 'scene'
 * Respects prefers-reduced-motion; auto-cancels on unmount.
 */
export default function BgCanvas({ mode = "aurora", fixed = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;
    let sceneRo = null;

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function isDark() {
      return document.documentElement.getAttribute("data-theme") === "dark";
    }

    function mulberry(seed) {
      return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      };
    }

    const ICON_PATHS = [
      "M12 3L2 12h3v9h6v-6h2v6h6v-9h3z",
      "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
      "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z",
      "M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-11 6 1-1 3.5-2 6-2z",
      "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
      "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z",
    ];

    if (mode === "icons" || mode === "icons-page") {
      const icons = Array.from({ length: 16 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 32 + Math.random() * 24,
        alpha: (mode === "icons" ? 0.12 : 0.1) + Math.random() * 0.15,
        path: ICON_PATHS[Math.floor(Math.random() * ICON_PATHS.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.004,
      }));

      function tick() {
        ctx.clearRect(0, 0, W, H);
        const dark = isDark();
        const teal = dark ? "#3fb5a2" : "#066b5e";
        for (const ic of icons) {
          ic.x += ic.vx; ic.y += ic.vy; ic.rot += ic.rotV;
          if (ic.x < -40) ic.x = W + 40; if (ic.x > W + 40) ic.x = -40;
          if (ic.y < -40) ic.y = H + 40; if (ic.y > H + 40) ic.y = -40;
          ctx.save();
          ctx.translate(ic.x, ic.y);
          ctx.rotate(ic.rot);
          ctx.globalAlpha = ic.alpha;
          const scale = ic.size / 24;
          ctx.scale(scale, scale);
          ctx.translate(-12, -12);
          ctx.fillStyle = teal;
          ctx.fill(new Path2D(ic.path));
          ctx.restore();
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    } else if (mode === "aurora") {
      let t = 0;
      const bands = [
        { freq: 0.0007, phase: 0, amp: 0.12, yBase: 0.3 },
        { freq: 0.0005, phase: 1.5, amp: 0.1, yBase: 0.55 },
        { freq: 0.0009, phase: 3.0, amp: 0.09, yBase: 0.75 },
        { freq: 0.0006, phase: 4.2, amp: 0.11, yBase: 0.42, violet: true },
      ];
      function fishRgb() {
        const th = document.documentElement.getAttribute("data-theme");
        if (th === "cyberpunk") return ["0,240,255", "168,85,247", "242,188,87"];
        if (th === "nordic") return ["125,211,252", "165,243,252", "242,188,87"];
        if (th === "solar-punk") return ["4,120,87", "132,204,22", "234,179,8"];
        if (th === "dark") return ["56,189,248", "63,181,162", "242,188,87"];
        return ["6,107,94", "14,165,233", "226,123,115"];
      }
      const fishes = Array.from({ length: 7 }, (_, i) => {
        const r = mulberry(i * 97 + 13);
        return {
          x: r() * (W + 200), y: r() * H,
          size: 10 + r() * 16,
          speed: 0.6 + r() * 1.2,
          waveAmp: 8 + r() * 18,
          waveFreq: 0.008 + r() * 0.01,
          wavePhase: r() * Math.PI * 2,
          variant: Math.floor(r() * 3),
        };
      });
      function drawFish(f, rgb, y) {
        const dark = isDark();
        const s = f.size;
        ctx.save();
        ctx.translate(f.x, y);
        ctx.rotate(Math.atan(-f.waveAmp * f.waveFreq * Math.cos(f.x * f.waveFreq + f.wavePhase)));
        ctx.scale(-1, 1);
        ctx.globalAlpha = dark ? 0.5 : 0.4;
        const bob = Math.sin(t * 0.08 + f.wavePhase) * f.size * 0.06;
        ctx.translate(0, bob);
        ctx.fillStyle = `rgba(${rgb},1)`;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.55, s * 0.7, 0);
        ctx.quadraticCurveTo(-s * 0.3, s * 0.55, -s, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-s * 0.95, 0);
        ctx.lineTo(-s * 1.5, -s * 0.45);
        ctx.lineTo(-s * 1.5, s * 0.45);
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb},0.8)`;
        ctx.fill();
        ctx.fillStyle = dark ? "rgba(10,25,20,0.9)" : "rgba(255,255,255,0.95)";
        ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.12, Math.max(1, s * 0.09), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      function tick() {
        ctx.clearRect(0, 0, W, H);
        t += 1;
        const dark = isDark();
        for (const b of bands) {
          const alpha = dark ? 0.15 : 0.12;
          const yCenter = H * b.yBase + Math.sin(t * b.freq + b.phase) * H * b.amp;
          const grad = ctx.createLinearGradient(0, yCenter - 120, 0, yCenter + 120);
          const isViolet = b.violet;
          const isBlue = bands.indexOf(b) % 2 === 1;
          grad.addColorStop(0, "transparent");
          if (dark) {
            grad.addColorStop(0.5, isViolet ? `rgba(139,92,246,${alpha})` : isBlue ? `rgba(56,189,248,${alpha})` : `rgba(63,181,162,${alpha})`);
          } else {
            grad.addColorStop(0.5, isViolet ? `rgba(109,40,217,${alpha})` : isBlue ? `rgba(14,165,233,${alpha})` : `rgba(6,107,94,${alpha})`);
          }
          grad.addColorStop(1, "transparent");
          ctx.beginPath();
          for (let x = 0; x <= W; x += 6) {
            const y = yCenter + Math.sin(x * 0.008 + t * b.freq * 80 + b.phase) * 40 + Math.sin(x * 0.003 + t * b.freq * 40) * 20;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
          ctx.fillStyle = grad; ctx.fill();
        }
        for (const f of fishes) {
          f.x -= f.speed;
          if (f.x < -f.size * 2.2) {
            f.x = W + f.size * 2 + Math.random() * 300;
            f.y = Math.random() * H;
            f.speed = 0.6 + Math.random() * 1.2;
            f.wavePhase = Math.random() * Math.PI * 2;
          }
          const y = f.y + Math.sin(f.x * f.waveFreq + f.wavePhase) * f.waveAmp;
          drawFish(f, fishRgb()[f.variant], y);
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    } else if (mode === "dots") {
      const nodes = Array.from({ length: 44 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        r: 2 + Math.random() * 2, pulseOffset: Math.random() * Math.PI * 2
      }));
      let pulseT = 0;
      function tick() {
        ctx.clearRect(0, 0, W, H);
        pulseT += 0.02;
        const dark = isDark();
        const tealRgb = dark ? "63,181,162" : "6,107,94";
        const blueRgb = dark ? "56,189,248" : "14,165,233";
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            if (dist < 130) {
              ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.strokeStyle = `rgba(${tealRgb},${(1 - dist / 130) * (dark ? 0.22 : 0.16)})`;
              ctx.stroke();
            }
          }
        }
        for (const n of nodes) {
          const pulse = 0.5 + 0.5 * Math.sin(pulseT + n.pulseOffset);
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${n.pulseOffset > Math.PI ? blueRgb : tealRgb},${(dark ? 0.35 : 0.25) * (0.6 + 0.4 * pulse)})`;
          ctx.fill();
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    } else if (mode === "radar") {
      let t = 0;
      const nodes = Array.from({ length: 26 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 1.6 + Math.random() * 1.8, blink: Math.random() * Math.PI * 2
      }));
      function tick() {
        ctx.clearRect(0, 0, W, H);
        t += 1;
        const dark = isDark();
        const cx = W * 0.5, cy = H * 0.12, maxR = Math.hypot(W, H), ringColor = dark ? "63,181,162" : "6,107,94";
        for (let i = 1; i <= 6; i++) {
          ctx.beginPath(); ctx.arc(cx, cy, (maxR / 6) * i, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ringColor},${dark ? 0.07 : 0.05})`; ctx.stroke();
        }
        const sweepAngle = (t * 0.006) % (Math.PI * 2);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, maxR, sweepAngle - 0.5, sweepAngle); ctx.closePath();
        const wg = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
        wg.addColorStop(0, `rgba(${ringColor},${dark ? 0.18 : 0.1})`); wg.addColorStop(1, "transparent");
        ctx.fillStyle = wg; ctx.fill(); ctx.restore();
        for (const n of nodes) {
          n.blink += 0.02;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ringColor},${(dark ? 0.4 : 0.28) * (0.5 + 0.5 * Math.sin(n.blink))})`; ctx.fill();
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    } else if (mode === "dashboard") {
      const PX_GRIDS = {
        tree: [
          "....GGGG....",
          "..GGGGGGGG..",
          ".GGGGGGGGGG.",
          "  GGGGGGGG  ",
          "   GGGGGG   ",
          "    TTTT    ",
          "    TTTT    ",
        ],
        pine: [
          "....P....",
          "...PPP...",
          "..PPPPPP.",
          ".PPPPPPPP.",
          "...PPPP...",
          "....TT....",
          "....TT....",
        ],
        house: [
          "..RRRR..",
          ".RRRRRR.",
          "RRRRRRRR",
          "..WWWW..",
          "..WDDW..",
          "..WDDW..",
          "..WWWW..",
        ],
        soil: [
          "..........",
          ".B..B..B..",
          ".D..D..D..",
          "DDDDDDDDDD",
          "DDDDDDDDDD",
        ],
        bush: [
          "...GG...",
          ".GGGGGG.",
          "GGGGGGGG",
          "GGGGGGGG",
        ],
        flower: [
          ".P.P.",
          "PPPPP",
          ".P.P.",
          "..G..",
          "..G..",
          "..G..",
        ],
        bench: [
          "TTTTTTTT",
          "TTTTTTTT",
          "..T..T..",
          "..T..T..",
        ],
      };
      const PX_COLORS = {
        G: dark => (dark ? "rgba(63,181,162,0.9)" : "#066b5e"),
        T: dark => (dark ? "rgba(166,124,82,0.9)" : "rgba(120,85,50,0.9)"),
        P: dark => (dark ? "rgba(99,220,196,0.9)" : "rgba(4,120,87,0.9)"),
        R: dark => (dark ? "rgba(226,123,115,0.9)" : "rgba(194,65,12,0.9)"),
        D: dark => (dark ? "rgba(101,132,117,0.9)" : "rgba(101,119,98,0.9)"),
        W: dark => (dark ? "rgba(232,242,238,0.85)" : "rgba(255,251,240,0.9)"),
        B: dark => (dark ? "rgba(99,220,196,0.9)" : "rgba(242,188,87,0.9)"),
        F: dark => (dark ? "rgba(242,188,87,0.9)" : "rgba(226,123,115,0.9)"),
      };
      const PX_TYPES = Object.keys(PX_GRIDS);
      const rand = mulberry(2026);
      const elements = Array.from({ length: 16 }, () => {
        const type = PX_TYPES[Math.floor(rand() * PX_TYPES.length)];
        return {
          x: rand() * W, y: rand() * H,
          type, size: 5 + Math.floor(rand() * 3), rot: (rand() - 0.5) * 0.5,
          alpha: 0.08 + rand() * 0.1,
          vx: (0.25 + rand() * 0.35) * (rand() > 0.5 ? 1 : -1),
          vy: (rand() - 0.5) * 0.14,
        };
      });
      function tick() {
        ctx.clearRect(0, 0, W, H);
        const dark = isDark();
        for (const el of elements) {
          el.x += el.vx; el.y += el.vy;
          if (el.x < -60) { el.x = W + 50; el.y = Math.random() * H; }
          else if (el.x > W + 60) { el.x = -60; el.y = Math.random() * H; }
          if (el.y < -60) { el.y = H + 60; el.x = Math.random() * W; }
          else if (el.y > H + 60) { el.y = -60; el.x = Math.random() * W; }
          const grid = PX_GRIDS[el.type];
          const rows = grid.length, cols = grid[0].length;
          const cell = el.size;
          ctx.save();
          ctx.translate(el.x, el.y);
          ctx.rotate(el.rot);
          ctx.globalAlpha = el.alpha * (dark ? 1 : 0.9);
          grid.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) {
              const ch = row[c];
              if (ch === " " || ch === ".") continue;
              const colorFn = PX_COLORS[ch];
              if (!colorFn) continue;
              ctx.fillStyle = colorFn(dark);
              ctx.fillRect((c - cols / 2) * cell, (r - rows / 2) * cell, cell, cell);
            }
          });
          ctx.restore();
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    } else if (mode === "scene") {
      let t = 0;
      let far = [], near = [], windows = [], stars = [];
      function meteorRgb() {
        const th = document.documentElement.getAttribute("data-theme");
        if (th === "cyberpunk") return "0,240,255";
        if (th === "nordic") return "125,211,252";
        if (th === "solar-punk") return "4,120,87";
        if (th === "dark") return "255,255,255";
        return "6,107,94";
      }
      function meteorDim() {
        const th = document.documentElement.getAttribute("data-theme");
        return th === "light" || th === "solar-punk" ? 0.55 : 1;
      }
      function buildScene() {
        const rand = mulberry(42); far = []; near = []; windows = []; stars = [];
        let x = -20;
        while (x < W + 60) {
          const w = 40 + rand() * 70, h = H * (0.18 + rand() * 0.22);
          far.push({ x, w, h }); x += w + 6 + rand() * 30;
        }
        x = -20;
        while (x < W + 80) {
          const w = 70 + rand() * 90, h = H * (0.12 + rand() * 0.14);
          near.push({ x, w, h });
          for (let c = 0; c < Math.max(1, Math.floor(w / 46)); c++) {
            if (rand() > 0.45) windows.push({ x: x + 10 + c * 46 + rand() * 10, y: H - h + 14 + rand() * Math.max(1, h - 34), w: 10 + rand() * 6, h: 10 + rand() * 6, on: rand() > 0.35, nextFlip: 2000 + rand() * 5000 });
          }
          x += w + rand() * 30;
        }
        for (let i = 0; i < 36; i++) stars.push({ x: rand() * W, y: rand() * H * 0.5, phase: rand() * Math.PI * 2, meteor: false });
        for (let i = 0; i < 6; i++) {
          stars.push({
            x: rand() * W, y: rand() * H * 0.35, phase: 0, meteor: true,
            vx: 2.2 + rand() * 2.6, vy: (rand() - 0.3) * 0.7,
            life: rand() * 400, len: 10 + rand() * 26,
          });
        }
      }
      buildScene();
      sceneRo = new ResizeObserver(buildScene); sceneRo.observe(canvas);
      function drawLamp(x, y, dark, flicker, rgb) {
        const glowR = dark ? 46 : 30;
        const g = ctx.createRadialGradient(x, y - 52, 2, x, y - 52, glowR);
        g.addColorStop(0, `rgba(${rgb},${(dark ? 0.5 : 0.25) * flicker})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y - 52, glowR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = dark ? "rgba(63,181,162,0.5)" : "rgba(6,107,94,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 48); ctx.stroke();
        ctx.fillStyle = dark ? "rgba(242,188,87,0.9)" : "rgba(242,188,87,0.55)";
        ctx.beginPath(); ctx.arc(x, y - 54, 3, 0, Math.PI * 2); ctx.fill();
      }
      function tick() {
        ctx.clearRect(0, 0, W, H);
        t += 1;
        const dark = isDark();
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, dark ? "#0a1512" : "#dcefe6"); sky.addColorStop(1, dark ? "#0e1a17" : "#f6f6f1");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        const mRgb = meteorRgb(), mDim = meteorDim();
        const meteors = stars.filter(s => s.meteor);
        const still = stars.filter(s => !s.meteor);
        for (const s of still) {
          const tw = 0.25 + 0.45 * Math.abs(Math.sin(t * 0.01 + s.phase));
          ctx.globalAlpha = tw * mDim;
          ctx.fillStyle = `rgb(${mRgb})`;
          ctx.fillRect(s.x, s.y, 1.6, 1.6);
        }
        for (const m of meteors) {
          m.x += m.vx; m.y += m.vy;
          m.life -= 1;
          if (m.life <= 0 || m.x > W + 80) {
            m.x = -60 - Math.random() * W * 0.4;
            m.y = Math.random() * H * 0.4;
            m.vx = 2.2 + Math.random() * 2.6;
            m.vy = (Math.random() - 0.3) * 0.7;
            m.life = 220 + Math.random() * 260;
            m.len = 10 + Math.random() * 26;
          }
          const a = Math.min(1, m.life / 40) * mDim;
          const trail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.len * 0.4, m.y - m.vy * m.len * 0.4);
          trail.addColorStop(0, `rgba(${mRgb},${0.8 * a})`);
          trail.addColorStop(1, `rgba(${mRgb},0)`);
          ctx.strokeStyle = trail;
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * m.len * 0.4, m.y - m.vy * m.len * 0.4); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
          ctx.fillRect(m.x, m.y, 1.8, 1.8);
        }
        const farOff = (t * 0.04) % (W + 120);
        ctx.save(); ctx.translate(-farOff, 0);
        ctx.fillStyle = dark ? "rgba(63,181,162,0.10)" : "rgba(6,107,94,0.10)";
        far.forEach(b => ctx.fillRect(b.x, H - b.h, b.w, b.h));
        far.forEach(b => ctx.fillRect(b.x + W + 120, H - b.h, b.w, b.h));
        ctx.restore();
        const nearOff = (t * 0.1) % 220;
        ctx.save(); ctx.translate(-nearOff, 0);
        ctx.fillStyle = dark ? "rgba(20,58,53,0.85)" : "rgba(6,60,52,0.22)";
        near.forEach(b => ctx.fillRect(b.x, H - b.h, b.w, b.h));
        windows.forEach(wd => {
          wd.nextFlip -= 1;
          if (wd.nextFlip <= 0) { wd.on = !wd.on; wd.nextFlip = 2000 + Math.random() * 5000; }
          if (wd.on) { ctx.fillStyle = dark ? "rgba(242,188,87,0.75)" : "rgba(14,165,233,0.35)"; ctx.fillRect(wd.x, wd.y, wd.w, wd.h); }
        });
        ctx.restore();
        for (let i = 0; i < 5; i++) {
          const lampX = W * (0.08 + i * 0.21);
          const flicker = dark ? 0.75 + 0.25 * Math.sin(t * 0.05 + i * 2) : 0.35;
          drawLamp(lampX, H - 4, dark, flicker, "242,188,87");
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    }

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (sceneRo) sceneRo.disconnect();
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="bg-canvas"
      aria-hidden="true"
      style={{
        position: fixed ? "fixed" : "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: fixed ? 1 : 0,
      }}
    />
  );
}
