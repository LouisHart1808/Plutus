"use client";

import { useEffect, useRef } from "react";

export default function CyberpunkBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let rafId = 0;
    let t = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    // Pre-generate some "data rain" streak seeds
    const streaks = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: rand(14, 80),
      spd: rand(0.3, 1.4),
      w: rand(0.6, 1.2),
      a: rand(0.06, 0.16),
      hue: Math.random() < 0.72 ? "g" : Math.random() < 0.5 ? "c" : "m",
    }));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // Base plate (dark steel/terminal)
      ctx.fillStyle = "rgba(2, 6, 23, 0.86)";
      ctx.fillRect(0, 0, w, h);

      // Cyber-industrial haze (cyan/magenta + green core)
      {
        const gC = ctx.createRadialGradient(w * 0.18, h * 0.18, 0, w * 0.18, h * 0.18, Math.max(w, h) * 0.85);
        gC.addColorStop(0, "rgba(34,211,238,0.16)");
        gC.addColorStop(0.45, "rgba(34,211,238,0.07)");
        gC.addColorStop(1, "rgba(34,211,238,0.00)");
        ctx.fillStyle = gC;
        ctx.fillRect(0, 0, w, h);

        const gM = ctx.createRadialGradient(w * 0.82, h * 0.16, 0, w * 0.82, h * 0.16, Math.max(w, h) * 0.75);
        gM.addColorStop(0, "rgba(236,72,153,0.13)");
        gM.addColorStop(0.5, "rgba(236,72,153,0.055)");
        gM.addColorStop(1, "rgba(236,72,153,0.00)");
        ctx.fillStyle = gM;
        ctx.fillRect(0, 0, w, h);

        const gG = ctx.createRadialGradient(w * 0.52, h * 0.28, 0, w * 0.52, h * 0.28, Math.max(w, h) * 0.95);
        gG.addColorStop(0, "rgba(34,197,94,0.10)");
        gG.addColorStop(0.55, "rgba(34,197,94,0.05)");
        gG.addColorStop(1, "rgba(34,197,94,0.00)");
        ctx.fillStyle = gG;
        ctx.fillRect(0, 0, w, h);
      }

      // Mild CRT flicker (global alpha modulation)
      const flicker = 0.985 + Math.sin(t * 0.013) * 0.01 + (Math.random() < 0.018 ? 0.02 : 0);
      ctx.globalAlpha = flicker;

      // Perspective grid floor
      {
        const horizonY = h * 0.34;
        const centerX = w * 0.5;
        const gridColor = "rgba(34,197,94,0.10)";
        const gridStrong = "rgba(34,197,94,0.16)";

        // Vertical converging lines
        const cols = 20;
        for (let i = -cols; i <= cols; i++) {
          const x = centerX + (i / cols) * w * 0.6;
          const drift = (t * 0.08) % 18;
          ctx.strokeStyle = i % 6 === 0 ? gridStrong : gridColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + drift, h);
          ctx.lineTo(centerX + (i / cols) * w * 0.13, horizonY);
          ctx.stroke();
        }

        // Horizontal lines
        const rows = 28;
        for (let r = 0; r < rows; r++) {
          const p = r / rows;
          const y = horizonY + (p * p) * (h - horizonY);
          const drift = (t * 0.28) % 42;
          ctx.strokeStyle = r % 6 === 0 ? gridStrong : gridColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y + drift);
          ctx.lineTo(w, y + drift);
          ctx.stroke();
        }

        // Horizon glow line
        const horizonGrad = ctx.createLinearGradient(0, horizonY - 10, 0, horizonY + 40);
        horizonGrad.addColorStop(0, "rgba(34,197,94,0.00)");
        horizonGrad.addColorStop(0.35, "rgba(34,197,94,0.08)");
        horizonGrad.addColorStop(1, "rgba(34,197,94,0.00)");
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, horizonY - 10, w, 50);
      }

      // Radar sweep cluster
      {
        const cx = w * 0.78;
        const cy = h * 0.22;
        const radius = Math.min(w, h) * 0.32;
        const angle = (t * 0.006) % (Math.PI * 2);

        ctx.strokeStyle = "rgba(34,197,94,0.08)";
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, (radius * i) / 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        const wedge = Math.PI / 8;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, "rgba(34,197,94,0.13)");
        grad.addColorStop(0.6, "rgba(34,197,94,0.045)");
        grad.addColorStop(1, "rgba(34,197,94,0.00)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + wedge);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(34,197,94,0.22)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle + wedge) * radius, cy + Math.sin(angle + wedge) * radius);
        ctx.stroke();

        // Blips
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.12) {
            const a = angle + rand(-wedge, wedge * 2);
            const rr = rand(radius * 0.15, radius * 0.95);
            const bx = cx + Math.cos(a) * rr;
            const by = cy + Math.sin(a) * rr;
            ctx.fillStyle = "rgba(34,197,94,0.22)";
            ctx.beginPath();
            ctx.arc(bx, by, rand(1.2, 2.2), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Diagonal hazard beams (very subtle)
      {
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        const beamCount = 2;
        for (let i = 0; i < beamCount; i++) {
          const y = h * (0.22 + i * 0.18) + Math.sin((t * 0.01) + i) * 18;
          const g = ctx.createLinearGradient(0, y, w, y + 120);
          g.addColorStop(0, "rgba(245,158,11,0.00)");
          g.addColorStop(0.35, "rgba(245,158,11,0.055)");
          g.addColorStop(0.7, "rgba(34,211,238,0.035)");
          g.addColorStop(1, "rgba(245,158,11,0.00)");
          ctx.fillStyle = g;
          ctx.fillRect(0, y, w, 140);
        }

        ctx.restore();
      }

      // Data rain micro-streaks
      {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (const s of streaks) {
          s.y += (s.spd / 900) * (h / 800);
          if (s.y > 1.05) {
            s.y = -0.05;
            s.x = Math.random();
            s.len = rand(14, 80);
            s.spd = rand(0.3, 1.4);
            s.a = rand(0.06, 0.16);
            s.hue = Math.random() < 0.72 ? "g" : Math.random() < 0.5 ? "c" : "m";
          }

          const x = s.x * w;
          const y = s.y * h;
          const col =
            s.hue === "g"
              ? `rgba(34,197,94,${s.a})`
              : s.hue === "c"
                ? `rgba(34,211,238,${s.a * 0.9})`
                : `rgba(236,72,153,${s.a * 0.75})`;

          ctx.strokeStyle = col;
          ctx.lineWidth = s.w;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + s.len);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Scanline drift band
      {
        const bandY = (t * 0.55) % h;
        const band = ctx.createLinearGradient(0, bandY - 26, 0, bandY + 26);
        band.addColorStop(0, "rgba(255,255,255,0.00)");
        band.addColorStop(0.5, "rgba(255,255,255,0.016)");
        band.addColorStop(1, "rgba(255,255,255,0.00)");
        ctx.fillStyle = band;
        ctx.fillRect(0, bandY - 26, w, 52);
      }

      // Occasional glitch bars
      {
        if (Math.random() < 0.04) {
          const gy = rand(h * 0.12, h * 0.82);
          const gh = rand(8, 26);
          const gx = rand(0, w * 0.25);
          const gw = rand(w * 0.35, w * 0.9);

          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = Math.random() < 0.6 ? "rgba(34,211,238,0.075)" : "rgba(236,72,153,0.06)";
          ctx.fillRect(gx, gy, gw, gh);

          // thin separator line
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(gx, gy + gh - 1, gw, 1);
          ctx.restore();
        }
      }

      // Noise / sparkles
      {
        const count = Math.floor((w * h) / 72000);
        ctx.fillStyle = "rgba(255,255,255,0.032)";
        for (let i = 0; i < count; i++) {
          ctx.fillRect(rand(0, w), rand(0, h), 1, 1);
        }

        if (Math.random() < 0.05) {
          ctx.fillStyle = "rgba(245,158,11,0.09)";
          ctx.beginPath();
          ctx.arc(rand(w * 0.12, w * 0.88), rand(h * 0.12, h * 0.88), rand(8, 20), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      t += 1;
      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-[5] h-full w-full" aria-hidden />;
}
