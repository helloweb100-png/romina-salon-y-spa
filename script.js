/* =====================================================================
   MARIBELLA · script.js  (vanilla JS, sin librerías)
   Cada módulo va en su propio try/catch: si uno falla, la página sigue completa.
   El contenido es visible por defecto; las animaciones solo lo mejoran.
   ===================================================================== */

/* ÚNICA constante del número de WhatsApp (formato internacional sin +). Vacía = se oculta todo lo de WhatsApp. */
const WHATSAPP_NUMBER = '529992258236';

(function () {
  'use strict';

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const RM = root.classList.contains('rm');
  const FINE = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  function waLink(msg) {
    return WHATSAPP_NUMBER ? 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg) : '#cita';
  }
  function safe(fn) {
    try { fn(); } catch (e) { if (window.console) console.warn('[maribella]', fn.name, e); }
  }

  /* ---------- Estado de scroll compartido y bucle único ---------- */
  const S = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth, dy: 0, vel: 0 };
  const frameFns = [];
  const resizeFns = [];
  let ticking = false;
  function run() {
    ticking = false;
    const y = window.scrollY;
    S.dy = y - S.y; S.y = y; S.vel = S.dy;
    for (let i = 0; i < frameFns.length; i++) { try { frameFns[i](S); } catch (e) { /* un módulo no rompe a los demás */ } }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
  window.addEventListener('scroll', request, { passive: true });
  let rzT = 0;
  window.addEventListener('resize', function () {
    S.vh = window.innerHeight; S.vw = window.innerWidth;
    clearTimeout(rzT);
    rzT = setTimeout(function () { resizeFns.forEach(function (f) { try { f(S); } catch (e) {} }); request(); }, 120);
    request();
  });
  const pinProgress = r => clamp(-r.top / Math.max(1, r.height - S.vh));

  /* ---------- Cargador (≤ 2.3 s, con respaldo CSS) ---------- */
  function initLoader() {
    const l = $('#loader'), num = $('#loader-num');
    let done = false;
    function finish() {
      if (done) return; done = true;
      root.classList.add('is-ready');
      if (l) {
        l.classList.add('is-done');
        setTimeout(function () { l.style.display = 'none'; }, 700);
      }
    }
    setTimeout(finish, 1700); // garantía dura
    if (num) {
      const t0 = performance.now(), dur = 1600;
      (function tick(now) {
        const t = clamp((now - t0) / dur);
        num.textContent = Math.round(easeIO(t) * 100);
        if (t < 1) requestAnimationFrame(tick);
      })(t0);
    }
  }

  /* ---------- WhatsApp: enlaces, ocultar si no hay número ---------- */
  function initWhatsApp() {
    const has = !!WHATSAPP_NUMBER;
    $$('[data-wa]').forEach(function (a) {
      if (!has) { a.hidden = true; a.setAttribute('aria-hidden', 'true'); return; }
      a.href = waLink(a.getAttribute('data-wa'));
      a.target = '_blank'; a.rel = 'noopener';
    });
    if (!has) {
      const w = $('#wa-wrap'); if (w) w.hidden = true;
      const sub = $('#f-submit'); if (sub) sub.hidden = true;
      const note = $('#form-note'); if (note) note.hidden = true;
      const off = $('#form-off'); if (off) off.hidden = false;
    }
  }

  /* ---------- Revelados con IntersectionObserver + respaldo por geometría ---------- */
  function initReveal() {
    const els = $$('.rv, .rv--plain, .wm-wrap').filter(function (e, i, arr) { return arr.indexOf(e) === i; });
    const show = function (el) { el.classList.add('in'); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      els.forEach(function (e) { io.observe(e); });
    } else { els.forEach(show); }
    let pending = els.slice();
    function sweep() {
      pending = pending.filter(function (el) {
        if (el.classList.contains('in')) return false;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.96 && r.bottom > 0) { show(el); return false; }
        return true;
      });
    }
    let t = false;
    function req() { if (!t) { t = true; requestAnimationFrame(function () { t = false; sweep(); }); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    window.addEventListener('load', function () { setTimeout(sweep, 300); });
    setTimeout(sweep, 2000);
    setTimeout(sweep, 4500);
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    const b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    function set(o) {
      m.classList.toggle('is-open', o);
      b.setAttribute('aria-expanded', String(o));
      b.setAttribute('aria-label', o ? 'Cerrar menú' : 'Abrir menú');
      m.setAttribute('aria-hidden', String(!o));
      root.classList.toggle('menu-open', o);
    }
    b.addEventListener('click', function () { set(!m.classList.contains('is-open')); });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    if (window.matchMedia) matchMedia('(min-width:1100px)').addEventListener('change', function (e) { if (e.matches) set(false); });
  }

  /* ---------- Barra de progreso, header, puntos laterales, parallax del hero ---------- */
  function initChrome() {
    const bar = $('#progress'), hdr = $('#header'), hero = $('#inicio');
    const dots = $$('#dots a');
    const secs = dots.map(function (a) { return $(a.getAttribute('href')); });
    let lastY = 0;
    frameFns.push(function (S) {
      const max = document.documentElement.scrollHeight - S.vh;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(S.y / max).toFixed(4) : 0) + ')';
      if (hdr) {
        const dy = S.y - lastY;
        if (S.y > 260 && dy > 4 && !root.classList.contains('menu-open')) hdr.classList.add('is-hidden');
        else if (dy < -4 || S.y <= 260) hdr.classList.remove('is-hidden');
      }
      lastY = S.y;
      secs.forEach(function (s, i) {
        if (!s) return;
        const r = s.getBoundingClientRect();
        dots[i].classList.toggle('on', r.top <= S.vh * 0.5 && r.bottom > S.vh * 0.5);
      });
      if (hero && !RM) {
        const h = Math.max(1, hero.offsetHeight);
        hero.style.setProperty('--hp', clamp(S.y / h).toFixed(4));
      }
    });
  }

  /* ---------- Escenas: manifiesto, zoom del espacio, scroll horizontal ---------- */
  function wrapWords(el) {
    const words = [];
    (function walk(node) {
      Array.from(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); words.push(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    return words;
  }

  function initScenes() {
    if (RM) { const p = $('#manifest-p'); if (p) p.classList.add('all'); return; }

    /* Manifiesto */
    const man = $('#manifiesto'), mp = $('#manifest-p');
    if (man && mp) {
      const words = wrapWords(mp);
      let lastN = -1;
      frameFns.push(function (S) {
        const p = pinProgress(man.getBoundingClientRect());
        man.style.setProperty('--p', p.toFixed(4));
        man.style.setProperty('--e', ease(clamp(p / 0.3)).toFixed(4));
        const n = Math.round(clamp((p - 0.08) / 0.7) * words.length);
        if (n !== lastN) {
          words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
          lastN = n;
        }
      });
    }

    /* Zoom del espacio */
    const exp = $('#espacio');
    if (exp) {
      const veil = $('.expand__content', exp);
      frameFns.push(function (S) {
        const p = pinProgress(exp.getBoundingClientRect());
        const mob = S.vw < 720;
        const e = ease(clamp(p / 0.55));
        exp.style.setProperty('--iy', (S.vh * (mob ? 0.14 : 0.16) * (1 - e)).toFixed(1) + 'px');
        exp.style.setProperty('--ix', (S.vw * (mob ? 0.06 : 0.10) * (1 - e)).toFixed(1) + 'px');
        exp.style.setProperty('--r', (36 * (1 - e)).toFixed(1) + 'px');
        exp.style.setProperty('--zs', (1.3 - 0.3 * e).toFixed(4));
        exp.style.setProperty('--veil', (0.66 - 0.31 * e).toFixed(3));
        exp.style.setProperty('--tt', clamp(p / 0.5).toFixed(4));
        exp.style.setProperty('--to', (1 - clamp((p - 0.22) / 0.3)).toFixed(3));
        const c = clamp((p - 0.55) / 0.2);
        exp.style.setProperty('--c', c.toFixed(3));
        if (veil) { veil.style.visibility = c < 0.04 ? 'hidden' : 'visible'; }
      });
    }

    /* Scroll horizontal "Por qué Maribella" */
    const why = $('#porque'), track = $('#why-track');
    if (why && track) {
      const cnt = $('#why-count'), bar = $('#why-bar');
      const n = $$('.why__card', track).length || 1;
      let dist = 0;
      function measure() {
        dist = Math.max(0, track.scrollWidth - S.vw);
        why.style.height = (dist + S.vh) + 'px';
      }
      measure();
      resizeFns.push(measure);
      window.addEventListener('load', function () { measure(); request(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); request(); });
      frameFns.push(function (S) {
        const p = pinProgress(why.getBoundingClientRect());
        track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
        if (bar) bar.style.transform = 'scaleX(' + (0.25 + p * 0.75).toFixed(3) + ')';
        if (cnt) cnt.textContent = '0' + (Math.min(n - 1, Math.round(p * (n - 1))) + 1);
      });
    }
  }

  /* ---------- Pila de servicios: hundimiento y zoom de imagen ---------- */
  function initStack() {
    const lis = $$('.svc-li');
    if (!lis.length) return;
    const cards = lis.map(function (li) { return $('.svc', li); });
    const imgs = lis.map(function (li) { return $('.mask img', li); });
    frameFns.push(function (S) {
      lis.forEach(function (li, i) {
        const r = li.getBoundingClientRect();
        if (r.bottom < -200 || r.top > S.vh + 200) return;
        if (imgs[i] && !RM) {
          const q = clamp((S.vh - r.top) / (S.vh * 0.9));
          imgs[i].style.setProperty('--z', (1.15 - 0.15 * ease(q)).toFixed(3));
        }
        const nx = lis[i + 1];
        let s = 0;
        if (nx && !RM) {
          const nr = nx.getBoundingClientRect();
          s = clamp(1 - (nr.top - (84 + (i + 1) * 22)) / (r.height * 0.85));
        }
        cards[i].style.setProperty('--sink', s.toFixed(3));
      });
    });
  }

  /* ---------- Marquesina con velocidad ligada al scroll ---------- */
  function initTicker() {
    if (RM) return;
    const rows = $$('.ticker__row').map(function (row) {
      const track = $('.ticker__track', row);
      return { row: row, track: track, dir: parseFloat(row.getAttribute('data-dir')) || -1, x: 0, w: 0, skew: 0 };
    }).filter(function (r) { return r.track; });
    if (!rows.length) return;
    function measure() {
      rows.forEach(function (r) {
        r.w = r.track.scrollWidth / 2;
        if (r.dir > 0 && r.x === 0) r.x = -r.w;
      });
    }
    measure();
    window.addEventListener('load', measure);
    resizeFns.push(measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    root.classList.add('ticker-js');
    let vis = true, v = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { rootMargin: '100px' }).observe($('#servicios-ticker'));
    }
    (function loop() {
      if (vis && !document.hidden) {
        v = lerp(v, S.vel, 0.12);
        S.vel *= 0.86;
        rows.forEach(function (r) {
          if (!r.w) return;
          const sp = 0.7 + Math.min(Math.abs(v) * 0.35, 14);
          r.x += r.dir * sp;
          if (r.dir < 0 && r.x <= -r.w) r.x += r.w;
          if (r.dir > 0 && r.x >= 0) r.x -= r.w;
          const target = clamp(v * 0.25, -6, 6);
          r.skew = lerp(r.skew, target, 0.1);
          r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0) skewX(' + r.skew.toFixed(2) + 'deg)';
        });
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Canvas del hero: manchas de pigmento + destellos ---------- */
  function initPigmentCanvas() {
    const cv = $('#pigment');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const hero = $('#inicio');
    let w = 0, h = 0, dpr = 1, vis = true, raf = 0, last = 0;
    const ptr = { x: -999, y: -999 };
    const blobs = [
      { c: '200,54,27', x: .2, y: .3, ax: .12, ay: .14, sp: .00018, ph: 0, r: .55, a: .26 },
      { c: '46,74,125', x: .82, y: .25, ax: .1, ay: .16, sp: .00014, ph: 2, r: .5, a: .22 },
      { c: '243,195,173', x: .55, y: .7, ax: .18, ay: .1, sp: .0002, ph: 4, r: .62, a: .62 },
      { c: '242,106,63', x: .86, y: .82, ax: .1, ay: .12, sp: .00016, ph: 1, r: .42, a: .22 },
      { c: '138,144,160', x: .1, y: .86, ax: .12, ay: .08, sp: .00012, ph: 5, r: .4, a: .2 }
    ];
    let sparks = [];
    function makeSparks() {
      const n = S.vw < 720 ? 28 : 70;
      sparks = [];
      for (let i = 0; i < n; i++) {
        sparks.push({
          x: Math.random() * w, y: Math.random() * h, s: 3 + Math.random() * 7, vy: 0.12 + Math.random() * 0.35,
          ph: Math.random() * 6.28, tw: 0.0008 + Math.random() * 0.002, k: Math.random() < 0.6 ? '200,54,27' : (Math.random() < 0.5 ? '46,74,125' : '242,106,63')
        });
      }
    }
    function resize() {
      const r = hero.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, hero.offsetHeight);
      dpr = Math.min(window.devicePixelRatio || 1, S.vw < 720 ? 1.5 : 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeSparks();
      if (RM || !vis) draw(0, 0);
    }
    function star(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x, y, x + s, y);
      ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y);
      ctx.quadraticCurveTo(x, y, x, y - s);
      ctx.fill();
    }
    function draw(t, dt) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#FBF6EF';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'multiply';
      const big = Math.max(w, h * 0.9) * (S.vw < 720 ? 0.85 : 0.62);
      const par = (S.y || 0) * 0.12;
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const cx = (b.x + b.ax * Math.sin(t * b.sp + b.ph)) * w;
        const cy = (b.y + b.ay * Math.cos(t * b.sp * 1.3 + b.ph)) * h - par * (0.4 + i * 0.15);
        const rad = b.r * big;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')');
        g.addColorStop(0.5, 'rgba(' + b.c + ',' + (b.a * 0.42) + ')');
        g.addColorStop(1, 'rgba(' + b.c + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < sparks.length; i++) {
        const p = sparks[i];
        if (!RM) {
          p.y -= p.vy * (dt / 16 || 1);
          const dx = p.x - ptr.x, dy = p.y - ptr.y, d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.1) { const f = (120 - d) / 120; p.x += (dx / d) * f * 3; p.y += (dy / d) * f * 3; }
          if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
          if (p.x < -12) p.x = w + 12; if (p.x > w + 12) p.x = -12;
        }
        const a = 0.22 + 0.55 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph));
        ctx.fillStyle = 'rgba(' + p.k + ',' + a.toFixed(3) + ')';
        star(p.x, p.y, p.s);
      }
    }
    function loop(now) {
      raf = 0;
      if (!vis || document.hidden) return;
      const dt = Math.min(48, now - (last || now)); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && !RM && vis && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
    resize();
    if (RM) { draw(0, 0); resizeFns.push(resize); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }, { rootMargin: '50px' }).observe(hero);
    }
    document.addEventListener('visibilitychange', start);
    resizeFns.push(resize);
    if ('ResizeObserver' in window) {
      let rt = 0; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(resize, 150); }).observe(hero);
    }
    hero.addEventListener('pointermove', function (e) { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', function () { ptr.x = ptr.y = -999; });
    start();
  }

  /* ---------- Tilt 3D ---------- */
  function initTilt() {
    if (RM) return;
    $$('[data-tilt]').forEach(function (el) {
      const max = parseFloat(el.getAttribute('data-tilt')) || 8;
      const scopeSel = el.getAttribute('data-tilt-scope');
      const scope = scopeSel ? $(scopeSel) : el;
      if (!scope) return;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      function loop() {
        cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
        el.style.setProperty('--rx', cx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', cy.toFixed(2) + 'deg');
        raf = (Math.abs(cx - tx) > 0.02 || Math.abs(cy - ty) > 0.02) ? requestAnimationFrame(loop) : 0;
      }
      function go() { if (!raf) raf = requestAnimationFrame(loop); }
      scope.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        const r = scope.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        ty = clamp(nx * max * 2, -max, max); tx = clamp(-ny * max * 2, -max, max); go();
      }, { passive: true });
      scope.addEventListener('pointerleave', function () { tx = ty = 0; go(); });
      if (scopeSel && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function' && matchMedia('(pointer:coarse)').matches) {
        window.addEventListener('deviceorientation', function (e) {
          if (e.gamma == null || e.beta == null) return;
          ty = clamp(e.gamma / 4, -max, max); tx = clamp(-(e.beta - 45) / 6, -max, max); go();
        }, { passive: true });
      }
    });
  }

  /* ---------- Botones magnéticos y aura de cursor (solo ratón) ---------- */
  function initPointerFx() {
    if (RM || !FINE) return;
    const btns = $$('.btn--primary');
    let raf = 0, mx = 0, my = 0;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        btns.forEach(function (b) {
          const r = b.getBoundingClientRect();
          if (r.bottom < -80 || r.top > S.vh + 80) return;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const dx = mx - cx, dy = my - cy;
          const reach = Math.max(r.width, r.height) * 0.9;
          if (Math.hypot(dx, dy) < reach) b.style.translate = clamp(dx * 0.12, -8, 8).toFixed(1) + 'px ' + clamp(dy * 0.18, -8, 8).toFixed(1) + 'px';
          else if (b.style.translate) b.style.translate = '';
        });
      });
    }, { passive: true });

    if (S.vw < 1100) return;
    $$('[data-aura]').forEach(function (c) {
      const a = $('.aura', c);
      if (!a) return;
      let tx = 0, ty = 0, x = 0, y = 0, on = false, r2 = 0;
      function loop() {
        x = lerp(x, tx, 0.1); y = lerp(y, ty, 0.1);
        a.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        r2 = (on || Math.hypot(x - tx, y - ty) > 1) ? requestAnimationFrame(loop) : 0;
      }
      c.addEventListener('pointermove', function (e) {
        const r = c.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!on) { x = tx; y = ty; }
        on = true; a.classList.add('on');
        if (!r2) r2 = requestAnimationFrame(loop);
      }, { passive: true });
      c.addEventListener('pointerleave', function () { on = false; a.classList.remove('on'); });
    });
  }

  /* ---------- Acordeón "Para todos" ---------- */
  function initAccordion() {
    const acc = $('#acc');
    if (!acc) return;
    const panels = $$('.panel', acc);
    let cur = Math.max(0, panels.findIndex(function (p) { return p.classList.contains('is-active'); }));
    let paused = false, resumeT = 0, vis = true;
    function activate(i) {
      cur = i;
      panels.forEach(function (p, k) {
        p.classList.toggle('is-active', k === i);
        const b = $('.panel__tab', p); if (b) b.setAttribute('aria-expanded', String(k === i));
      });
    }
    function hold(ms) { paused = true; clearTimeout(resumeT); resumeT = setTimeout(function () { paused = false; }, ms); }
    panels.forEach(function (p, i) {
      const b = $('.panel__tab', p);
      if (b) b.addEventListener('click', function () { activate(i); hold(14000); });
    });
    acc.addEventListener('pointerenter', function () { paused = true; clearTimeout(resumeT); });
    acc.addEventListener('pointerleave', function () { hold(2500); });
    acc.addEventListener('focusin', function () { paused = true; clearTimeout(resumeT); });
    acc.addEventListener('focusout', function () { hold(2500); });
    acc.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') hold(14000); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(acc);
    if (RM) return;
    setInterval(function () { if (!paused && vis && !document.hidden) activate((cur + 1) % panels.length); }, 4500);
  }

  /* ---------- Línea de cabello del ritual + cometa ---------- */
  function initPath() {
    const wrap = $('#steps-wrap'), svg = $('#steps-svg');
    if (!wrap || !svg) return;
    const base = $('.base', svg), prog = $('.prog', svg), comet = $('.comet', svg);
    const ol = $('.steps', wrap);
    const steps = $$('.step', ol);
    const dots = steps.map(function (s) { return $('.step__dot', s); });
    let len = 0, marks = [], ready = false;

    function toBezier(pts) {
      let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      return d;
    }
    function build() {
      const wr = wrap.getBoundingClientRect();
      const W = wr.width, H = wr.height;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
      const pts = dots.map(function (d) {
        const r = d.getBoundingClientRect();
        return { x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top };
      });
      const amp = W >= 900 ? 70 : 14;
      const all = [{ x: pts[0].x, y: Math.max(0, pts[0].y - 56) }];
      pts.forEach(function (p, i) {
        all.push(p);
        if (i < pts.length - 1) {
          const n = pts[i + 1];
          all.push({ x: (p.x + n.x) / 2 + (i % 2 ? -amp : amp), y: (p.y + n.y) / 2 });
        }
      });
      const lp = pts[pts.length - 1];
      all.push({ x: lp.x, y: Math.min(H, lp.y + 56) });
      const d = toBezier(all);
      base.setAttribute('d', d); prog.setAttribute('d', d);
      len = base.getTotalLength();
      prog.style.strokeDasharray = len; prog.style.strokeDashoffset = len;
      marks = pts.map(function (p) {
        let best = 0, bd = 1e9;
        for (let i = 0; i <= 300; i++) {
          const q = base.getPointAtLength(len * i / 300);
          const dd = Math.abs(q.y - p.y) + Math.abs(q.x - p.x) * 0.4;
          if (dd < bd) { bd = dd; best = len * i / 300; }
        }
        return best;
      });
      ready = true; ol.classList.add('live');
      update(S);
    }
    function update(S) {
      if (!ready) return;
      const r = wrap.getBoundingClientRect();
      const p = clamp((S.vh * 0.64 - r.top) / (r.height * 0.95));
      const L = p * len;
      prog.style.strokeDashoffset = (len - L).toFixed(1);
      if (p > 0.003) {
        const pt = base.getPointAtLength(L);
        comet.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ')');
        comet.style.opacity = '1';
      } else comet.style.opacity = '0';
      steps.forEach(function (s, i) { s.classList.toggle('lit', L >= marks[i] - 8); });
    }
    frameFns.push(update);
    resizeFns.push(build);
    window.addEventListener('load', function () { setTimeout(build, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(build, 100); });
    setTimeout(build, 600);
    if ('ResizeObserver' in window) { let t = 0; new ResizeObserver(function () { clearTimeout(t); t = setTimeout(build, 200); }).observe(wrap); }
    if (RM) {
      /* estático: línea completa y todos los pasos encendidos */
      ready = false; steps.forEach(function (s) { s.classList.add('lit'); });
      setTimeout(function () { build(); ready = false; prog.style.strokeDashoffset = 0; comet.style.opacity = '0'; ol.classList.remove('live'); }, 700);
    }
  }

  /* ---------- Horario: abierto ahora (zona America/Merida) ---------- */
  function initOpenNow() {
    const HOURS = { 0: [600, 960], 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 960] };
    const NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    function fmt(m) {
      const h = Math.floor(m / 60), mm = ('0' + (m % 60)).slice(-2);
      return ((h % 12) || 12) + ':' + mm + ' ' + (h >= 12 ? 'pm' : 'am');
    }
    function now() {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Merida', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false });
      const o = {}; f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      let h = parseInt(o.hour, 10); if (h === 24) h = 0;
      return { day: map[o.weekday], min: h * 60 + parseInt(o.minute, 10) };
    }
    function status() {
      const n = now(), t = HOURS[n.day];
      if (t && n.min >= t[0] && n.min < t[1]) return { open: true, text: 'Abierto ahora · cierra a las ' + fmt(t[1]), short: 'Abierto ahora · cierra a las ' + fmt(t[1]), day: n.day };
      if (t && n.min < t[0]) return { open: false, text: 'Cerrado · abrimos hoy a las ' + fmt(t[0]), short: 'Cerrado · abrimos hoy a las ' + fmt(t[0]), day: n.day };
      for (let d = 1; d <= 7; d++) {
        const nd = (n.day + d) % 7;
        if (HOURS[nd]) {
          const when = d === 1 ? 'mañana' : 'el ' + NAMES[nd];
          const s = 'Cerrado · abrimos ' + when + ' a las ' + fmt(HOURS[nd][0]);
          return { open: false, text: s, short: s, day: n.day };
        }
      }
      return { open: false, text: 'Cerrado', short: 'Cerrado', day: n.day };
    }
    function paint() {
      let st;
      try { st = status(); } catch (e) { return; }
      const ht = $('#open-hero-txt'), bt = $('#open-txt');
      if (ht) ht.textContent = st.short;
      if (bt) bt.textContent = st.text;
      $$('.pulse-dot--ok').forEach(function (d) { d.style.background = st.open ? '#1FAE5B' : '#C8361B'; });
      $$('.hours>div').forEach(function (row) {
        const days = (row.getAttribute('data-days') || '').split(' ').map(Number);
        row.classList.toggle('today', days.indexOf(st.day) > -1);
      });
    }
    paint();
    setInterval(paint, 60000);
  }

  /* ---------- Formulario → WhatsApp ---------- */
  function initForm() {
    const f = $('#cita-form');
    if (!f) return;
    const nameEl = f.elements.nombre;
    const field = nameEl.closest('.field');
    function validate() {
      const ok = nameEl.value.trim().length >= 2;
      field.classList.toggle('is-bad', !ok);
      nameEl.setAttribute('aria-invalid', String(!ok));
      return ok;
    }
    nameEl.addEventListener('blur', function () { if (nameEl.value.length) validate(); });
    nameEl.addEventListener('input', function () { if (field.classList.contains('is-bad')) validate(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) { nameEl.focus(); return; }
      if (!WHATSAPP_NUMBER) return;
      const nombre = nameEl.value.trim();
      const serv = (f.elements.servicio.value || '').trim();
      const para = (f.elements.para.value || 'para mí');
      const cuando = (f.elements.cuando.value || '').trim();
      const extra = (f.elements.mensaje.value || '').trim();
      let msg = 'Hola Maribella 👋 Soy ' + nombre + '. Quiero agendar ' + (serv && serv !== 'Otro o no lo sé aún' ? serv : 'una cita') + ', ' + para + '.';
      if (cuando) msg += ' Me acomoda: ' + cuando + '.';
      if (extra) msg += ' ' + extra + (/[.!?]$/.test(extra) ? '' : '.');
      msg += ' ¿Tienen disponibilidad?';
      const a = document.createElement('a');
      a.href = waLink(msg); a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      celebrate();
    });
    function celebrate() {
      const btn = $('#f-submit'), t = $('.btn__t', btn), burst = $('#burst');
      btn.classList.add('done'); if (t) t.textContent = '¡Listo! Abriendo WhatsApp';
      if (burst && !RM) {
        burst.innerHTML = '';
        for (let i = 0; i < 14; i++) {
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          u.setAttribute('href', '#i-spark'); s.appendChild(u);
          const el = document.createElement('i');
          el.style.setProperty('--a', (i * 360 / 14) + 'deg');
          el.style.setProperty('--dist', (70 + Math.random() * 60).toFixed(0) + 'px');
          el.style.color = i % 3 === 0 ? '#2E4A7D' : (i % 3 === 1 ? '#F26A3F' : '#C8361B');
          el.appendChild(s); burst.appendChild(el);
        }
        setTimeout(function () { burst.innerHTML = ''; }, 1200);
      }
      setTimeout(function () { btn.classList.remove('done'); if (t) t.textContent = 'Quiero mi cita por WhatsApp'; }, 4200);
    }
  }

  /* ---------- Burbuja del botón flotante, volver arriba ---------- */
  function initMisc() {
    const bub = $('#wa-bubble');
    if (bub && WHATSAPP_NUMBER) {
      setTimeout(function () { bub.classList.add('show'); setTimeout(function () { bub.classList.remove('show'); }, 6000); }, 6000);
    }
    const top = $('#to-top');
    if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });
  }

  /* ---------- Arranque ---------- */
  safe(initLoader);
  function boot() {
    safe(initWhatsApp);
    safe(initReveal);
    safe(initMenu);
    safe(initChrome);
    safe(initScenes);
    safe(initStack);
    safe(initTicker);
    safe(initPigmentCanvas);
    safe(initTilt);
    safe(initPointerFx);
    safe(initAccordion);
    safe(initPath);
    safe(initOpenNow);
    safe(initForm);
    safe(initMisc);
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
