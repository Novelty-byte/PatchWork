import { useEffect, useRef } from "react";

/**
 * BgCanvas — animated background canvas
 * mode: 'icons' | 'aurora' | 'dots'
 * Respects prefers-reduced-motion; auto-cancels on unmount.
 */
export default function BgCanvas({ mode = "aurora" }) {
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

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── helper: get CSS var colour ── */
    function cssVar(name) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    }
    function isDark() {
      return (
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    }

    /* ══════════════ ICONS MODE ══════════════ */
    if (mode === "icons") {
      const ICON_PATHS = [
        // house
        "M12 3L2 12h3v9h6v-6h2v6h6v-9h3z",
        // wrench
        "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
        // map pin
        "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z",
        // leaf
        "M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-11 6 1-1 3.5-2 6-2z",
        // people
        "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
        // alert triangle (for reports)
        "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
        // check circle (solved)
        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z",
      ];

      const icons = [];
      const COUNT = 14;

      function makeIcon() {
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: 18 + Math.random() * 14,
          alpha: 0.04 + Math.random() * 0.06,
          path: ICON_PATHS[Math.floor(Math.random() * ICON_PATHS.length)],
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.003,
        };
      }
      for (let i = 0; i < COUNT; i++) icons.push(makeIcon());

      function drawIcon(ic) {
        const dark = isDark();
        const teal = dark ? "#3fb5a2" : "#066b5e";
        ctx.save();
        ctx.translate(ic.x, ic.y);
        ctx.rotate(ic.rot);
        ctx.globalAlpha = ic.alpha;
        const scale = ic.size / 24;
        ctx.scale(scale, scale);
        ctx.translate(-12, -12);
        ctx.fillStyle = teal;
        const p = new Path2D(ic.path);
        ctx.fill(p);
        ctx.restore();
      }

      function tick() {
        ctx.clearRect(0, 0, W, H);
        for (const ic of icons) {
          ic.x += ic.vx;
          ic.y += ic.vy;
          ic.rot += ic.rotV;
          if (ic.x < -40) ic.x = W + 40;
          if (ic.x > W + 40) ic.x = -40;
          if (ic.y < -40) ic.y = H + 40;
          if (ic.y > H + 40) ic.y = -40;
          drawIcon(ic);
        }
        animId = requestAnimationFrame(tick);
      }
      tick();
    }

    /* ══════════════ AURORA MODE ══════════════ */
    if (mode === "aurora") {
      let t = 0;
      const bands = [
        { freq: 0.0007, phase: 0, amp: 0.12, yBase: 0.3 },
        { freq: 0.0005, phase: 1.5, amp: 0.1, yBase: 0.55 },
        { freq: 0.0009, phase: 3.0, amp: 0.09, yBase: 0.75 },
      ];

      function tick() {
        ctx.clearRect(0, 0, W, H);
        const dark = isDark();
        t += 1;

        for (const b of bands) {
          const alpha = dark ? 0.055 : 0.07;
          const yCenter = H * b.yBase + Math.sin(t * b.freq + b.phase) * H * b.amp;

          const grad = ctx.createLinearGradient(0, yCenter - 120, 0, yCenter + 120);
          // alternate green / blue bands
          const isBlue = bands.indexOf(b) % 2 === 1;
          if (dark) {
            grad.addColorStop(0, "transparent");
            grad.addColorStop(0.5, isBlue ? `rgba(56,189,248,${alpha})` : `rgba(63,181,162,${alpha})`);
            grad.addColorStop(1, "transparent");
          } else {
            grad.addColorStop(0, "transparent");
            grad.addColorStop(0.5, isBlue ? `rgba(14,165,233,${alpha})` : `rgba(6,107,94,${alpha})`);
            grad.addColorStop(1, "transparent");
          }

          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let x = 0; x <= W; x += 6) {
            const y =
              yCenter +
              Math.sin(x * 0.008 + t * b.freq * 80 + b.phase) * 40 +
              Math.sin(x * 0.003 + t * b.freq * 40) * 20;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        animId = requestAnimationFrame(tick);
      }
      tick();
    }

    /* ══════════════ DOTS MODE ══════════════ */
    if (mode === "dots") {
      const NODE_COUNT = 44;
      const CONNECT_DIST = 130;
      let nodes = [];
      let pulseT = 0;

      function makeNodes() {
        nodes = [];
        for (let i = 0; i < NODE_COUNT; i++) {
          nodes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            r: 2 + Math.random() * 2,
            pulseOffset: Math.random() * Math.PI * 2,
          });
        }
      }
      makeNodes();

      function tick() {
        ctx.clearRect(0, 0, W, H);
        pulseT += 0.02;
        const dark = isDark();
        const tealRgb = dark ? "63,181,162" : "6,107,94";
        const blueRgb = dark ? "56,189,248" : "14,165,233";

        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }

        // draw connections
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONNECT_DIST) {
              const alpha = (1 - dist / CONNECT_DIST) * (dark ? 0.12 : 0.09);
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.strokeStyle = `rgba(${tealRgb},${alpha})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // draw nodes
        for (const n of nodes) {
          const pulse = 0.5 + 0.5 * Math.sin(pulseT + n.pulseOffset);
          const alpha = (dark ? 0.18 : 0.13) * (0.6 + 0.4 * pulse);
          const useBlue = n.pulseOffset > Math.PI;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${useBlue ? blueRgb : tealRgb},${alpha})`;
          ctx.fill();
        }

        animId = requestAnimationFrame(tick);
      }
      tick();
    }

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="bg-canvas"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
