/**
 * Streak Celebration Engine
 *
 * Provides a self-contained, theme-agnostic confetti + toast celebration for
 * streak milestones.  The engine exposes a single entry point:
 *
 *   celebrateStreak(streak, { pillEl, toastEl })
 *
 * It is dependency-free, framework-agnostic, and respects
 * `prefers-reduced-motion: reduce` by skipping all animation.
 */
(function () {
  "use strict";

  /* ── Canvas setup ── */
  let canvas = null;
  let ctx = null;
  let particles = [];
  let rafId = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "celebrationCanvas";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9999",
      pointerEvents: "none",
      width: "100%",
      height: "100%"
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /* ── Reduced-motion check ── */
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Color palettes per tier ── */
  const PALETTES = {
    start: ["#e86a2a", "#ffc857", "#ff9e44", "#ffe0b2", "#ffcc80", "#607df0"],
    milestone: ["#607df0", "#8ea4ff", "#b6c4ff", "#ffc857", "#e86a2a", "#c5cae9"],
    mega: ["#e86a2a", "#ff6b6b", "#ffc857", "#607df0", "#a855f7", "#f472b6", "#34d399", "#fbbf24"],
    legendary: ["#ff6b6b", "#ffc857", "#a855f7", "#607df0", "#34d399", "#f472b6", "#e86a2a", "#fbbf24", "#06b6d4", "#f97316"]
  };

  /* ── Particle class ── */
  class Particle {
    constructor(x, y, color, type) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.type = type;

      if (type === "confetti") {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 4;
        this.gravity = 0.12;
        this.friction = 0.99;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 12;
        this.size = 4 + Math.random() * 5;
        this.width = this.size;
        this.height = this.size * (0.4 + Math.random() * 0.6);
        this.opacity = 1;
        this.decay = 0.008 + Math.random() * 0.008;
        this.shape = Math.random() > 0.5 ? "rect" : "circle";
      } else if (type === "sparkle") {
        this.size = 2 + Math.random() * 3;
        this.opacity = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 2 + Math.random() * 3;
        this.decay = 0.012 + Math.random() * 0.008;
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        this.vx = Math.cos(angle) * dist * 0.04;
        this.vy = Math.sin(angle) * dist * 0.04;
      } else if (type === "ring") {
        this.radius = 0;
        this.speed = 3 + Math.random() * 2;
        this.opacity = 0.6;
        this.decay = 0.015;
        this.lineWidth = 2 + Math.random() * 2;
      }
    }

    update() {
      if (this.type === "confetti") {
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.opacity -= this.decay;
      } else if (this.type === "sparkle") {
        this.phase += this.speed * 0.05;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity = Math.max(0, Math.sin(this.phase)) * 0.9;
        this.opacity -= this.decay * 0.3;
      } else if (this.type === "ring") {
        this.radius += this.speed;
        this.opacity -= this.decay;
      }
      return this.opacity > 0;
    }

    draw(c) {
      c.save();
      c.globalAlpha = Math.max(0, this.opacity);

      if (this.type === "confetti") {
        c.translate(this.x, this.y);
        c.rotate((this.rotation * Math.PI) / 180);
        c.fillStyle = this.color;
        if (this.shape === "rect") {
          c.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        }
      } else if (this.type === "sparkle") {
        c.fillStyle = this.color;
        c.shadowColor = this.color;
        c.shadowBlur = 6;
        const s = this.size * (0.6 + Math.sin(this.phase) * 0.4);
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          const r = i % 2 === 0 ? s : s * 0.3;
          c.lineTo(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
        }
        c.closePath();
        c.fill();
      } else if (this.type === "ring") {
        c.strokeStyle = this.color;
        c.lineWidth = this.lineWidth * this.opacity;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.stroke();
      }

      c.restore();
    }
  }

  /* ── Emission helpers ── */
  function emitConfetti(x, y, count, palette) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, palette[Math.floor(Math.random() * palette.length)], "confetti"));
    }
  }

  function emitSparkles(x, y, count, palette) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, palette[Math.floor(Math.random() * palette.length)], "sparkle"));
    }
  }

  function emitRings(x, y, count, palette) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y, palette[Math.floor(Math.random() * palette.length)], "ring");
      p.radius = i * 8;
      particles.push(p);
    }
  }

  /* ── Animation loop ── */
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((p) => {
      p.draw(ctx);
      return p.update();
    });
    if (particles.length > 0) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
    }
  }

  function startAnimation() {
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  /* ── Toast helper ── */
  let toastTimeout = null;

  function showToast(toastEl, emoji, title, subtitle, streakText) {
    if (!toastEl) return;
    clearTimeout(toastTimeout);
    toastEl.querySelector("[data-celebration-emoji]").textContent = emoji;
    toastEl.querySelector("[data-celebration-title]").textContent = title;
    toastEl.querySelector("[data-celebration-subtitle]").textContent = subtitle;
    toastEl.querySelector("[data-celebration-streak]").textContent = streakText;
    toastEl.classList.add("celebration-toast--visible");
    toastTimeout = setTimeout(() => toastEl.classList.remove("celebration-toast--visible"), 3200);
  }

  /* ── Pill glow pulse ── */
  function pulsePill(pillEl) {
    if (!pillEl) return;
    pillEl.classList.remove("streak-pill--celebrating");
    void pillEl.offsetWidth; // force reflow
    pillEl.classList.add("streak-pill--celebrating");
  }

  /* ── Shimmer overlay ── */
  function flashShimmer() {
    let shimmer = document.getElementById("celebrationShimmer");
    if (!shimmer) {
      shimmer = document.createElement("div");
      shimmer.id = "celebrationShimmer";
      shimmer.className = "celebration-shimmer";
      document.body.appendChild(shimmer);
    }
    shimmer.classList.add("celebration-shimmer--visible");
    setTimeout(() => shimmer.classList.remove("celebration-shimmer--visible"), 3000);
  }

  /* ── Public: determine celebration tier from streak ── */
  function celebrationTier(streak) {
    if (!Number.isInteger(streak) || streak < 1) return null;
    if (streak === 1) return "start";
    if (streak % 5 === 0) return streak >= 20 ? "legendary" : "mega";
    if (streak % 3 === 0) return "milestone";
    return null;
  }

  /* ── Public: trigger celebration ── */
  function celebrateStreak(streak, opts = {}) {
    const tier = celebrationTier(streak);
    if (!tier) return false;

    const { pillEl, toastEl, copy } = opts;
    const reducedMotion = prefersReducedMotion();

    // Update pill text
    if (pillEl) {
      const countEl = pillEl.querySelector("#streakPillCount");
      const labelEl = pillEl.querySelector("#streakPillLabel");
      if (countEl) countEl.textContent = String(streak);
      if (labelEl) labelEl.textContent = "-day streak";
      pillEl.setAttribute("aria-label", `${streak}-day streak`);
    }

    if (reducedMotion) {
      // Show toast only, no particles
      if (copy && copy[tier]) {
        const c = copy[tier];
        showToast(toastEl, c.emoji, c.title, c.subtitle, `🔥 ${streak}-day streak`);
      }
      return true;
    }

    const palette = PALETTES[tier];

    // Pill center for particle origin
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight * 0.35;
    if (pillEl) {
      const r = pillEl.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
    }

    ensureCanvas();

    // Determine particle counts by tier
    const counts = {
      start: { confetti: 50, sparkle: 12, ring: 1 },
      milestone: { confetti: 60, sparkle: 14, ring: 2 },
      mega: { confetti: 80, sparkle: 20, ring: 3 },
      legendary: { confetti: 120, sparkle: 24, ring: 4 }
    }[tier];

    // Emit particles
    emitConfetti(canvas.width / 2, canvas.height * 0.35, counts.confetti, palette);
    setTimeout(() => emitConfetti(cx, cy, Math.round(counts.confetti * 0.4), palette), 150);
    if (tier === "mega" || tier === "legendary") {
      setTimeout(() => emitConfetti(canvas.width * 0.2, canvas.height * 0.3, Math.round(counts.confetti * 0.3), palette), 300);
      setTimeout(() => emitConfetti(canvas.width * 0.8, canvas.height * 0.3, Math.round(counts.confetti * 0.3), palette), 350);
    }
    emitSparkles(cx, cy, counts.sparkle, palette);
    emitRings(cx, cy, counts.ring, palette);

    pulsePill(pillEl);
    flashShimmer();
    startAnimation();

    // Show toast
    if (copy && copy[tier]) {
      const c = copy[tier];
      showToast(toastEl, c.emoji, c.title, c.subtitle, `🔥 ${streak}-day streak`);
    }

    return true;
  }

  /* ── Expose on globalThis for script.js ── */
  globalThis.CelebrationEngine = Object.freeze({
    celebrateStreak,
    celebrationTier
  });
})();
