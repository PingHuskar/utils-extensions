(() => {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#ff6ec4', '#7873f5', '#4ade80', '#facc15', '#38bdf8', '#fb7185'];
  const TITLES = [
    'A brand new repo! Time to party 🎉',
    'Empty today, legendary tomorrow ✨',
    'Fresh repo smell detected 👃',
    'One small push for you, one giant leap for main 🚀',
    'Zero commits. Infinite potential. 🌌',
  ];
  const SUBS = [
    'Click any command line to copy just that line. Click the rocket for liftoff.',
    'Pro tip: the first commit is always the hardest. Then it is “fix typo” forever.',
    'Tip: commit early, commit often, never commit your .env.',
    'You are one git push away from greatness.',
  ];
  const TOASTS = ['Copied! 📋', 'Nice! ✨', 'Ctrl+V away from glory 🚀', 'Boom! 💥', 'Got it! 🎯'];

  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- confetti ----------
  let canvas, ctx, particles = [], raf = 0;

  function ensureCanvas() {
    if (canvas && canvas.isConnected) return;
    canvas = document.createElement('canvas');
    canvas.className = 'rp-canvas';
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
  }

  function burst(x, y, count = 80, spread = Math.PI * 2, angle = -Math.PI / 2) {
    if (REDUCED) return;
    ensureCanvas();
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = 4 + Math.random() * 9;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        c: pick(COLORS),
        life: 90 + Math.random() * 60,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((p) => p.life > 0 && p.y < canvas.height + 20);
    for (const p of particles) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life--;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (particles.length) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      canvas.remove();
    }
  }

  function rain() {
    burst(innerWidth * 0.15, innerHeight, 70, 1.2, -Math.PI / 3);
    burst(innerWidth * 0.85, innerHeight, 70, 1.2, (-2 * Math.PI) / 3);
    setTimeout(() => burst(innerWidth / 2, innerHeight * 0.6, 100), 250);
  }

  // ---------- toast ----------
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement('div');
      toastEl.className = 'rp-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('rp-show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('rp-show'), 1600);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---------- page detection ----------
  function findSetupHeading() {
    for (const h of document.querySelectorAll('h1, h2, h3')) {
      if (/^\s*Quick setup/i.test(h.textContent)) return h;
    }
    return null;
  }

  function enhance() {
    const heading = findSetupHeading();
    if (!heading) return;
    const section = heading.closest('div') || heading.parentElement;
    if (!section || section.dataset.rpDone) return;
    section.dataset.rpDone = '1';

    // banner
    const banner = document.createElement('div');
    banner.className = 'rp-banner';
    banner.innerHTML =
      '<span class="rp-rocket" title="Launch!">🚀</span>' +
      '<div class="rp-banner-text"><p class="rp-banner-title"></p><p class="rp-banner-sub"></p></div>' +
      '<button type="button" class="rp-banner-btn">🎉 Party</button>';
    banner.querySelector('.rp-banner-title').textContent = pick(TITLES);
    banner.querySelector('.rp-banner-sub').textContent = pick(SUBS);
    section.parentElement.insertBefore(banner, section);

    const rocket = banner.querySelector('.rp-rocket');
    rocket.addEventListener('click', () => {
      const r = rocket.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 60);
      rocket.classList.add('rp-launch');
      setTimeout(() => {
        rocket.classList.remove('rp-launch');
        rain();
      }, 1100);
      toast('Houston, we have a repo 🌍');
    });
    banner.querySelector('.rp-banner-btn').addEventListener('click', rain);

    // per-line copy on command blocks
    section.querySelectorAll('pre').forEach((pre) => {
      if ([...pre.childNodes].some((n) => n.nodeType !== Node.TEXT_NODE)) return;
      const lines = pre.textContent.split('\n');
      pre.textContent = '';
      lines.forEach((line, i) => {
        if (line.trim()) {
          const span = document.createElement('span');
          span.className = 'rp-line';
          span.textContent = line;
          span.title = 'Click to copy this line';
          pre.appendChild(span);
        } else {
          pre.appendChild(document.createTextNode(line));
        }
        if (i < lines.length - 1) pre.appendChild(document.createTextNode('\n'));
      });
    });

    section.addEventListener('click', async (e) => {
      const line = e.target.closest('.rp-line');
      if (line) {
        if (await copy(line.textContent)) {
          line.classList.remove('rp-copied');
          void line.offsetWidth;
          line.classList.add('rp-copied');
          burst(e.clientX, e.clientY, 30);
          toast(pick(TOASTS));
        }
        return;
      }
      if (e.target.closest('clipboard-copy')) {
        burst(e.clientX, e.clientY, 40);
        toast(pick(TOASTS));
      }
    });

    // celebrate once per repo per tab session
    const key = 'rp-seen:' + location.pathname;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setTimeout(rain, 400);
      }
    } catch (_) {
      setTimeout(rain, 400);
    }
  }

  // GitHub navigates without full reloads, so re-check on those events too.
  enhance();
  document.addEventListener('turbo:load', enhance);
  document.addEventListener('pjax:end', enhance);
  new MutationObserver(() => enhance()).observe(document.body, { childList: true, subtree: true });
})();
