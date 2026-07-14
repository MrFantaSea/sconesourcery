/* ══════════════════════════════════════════════════════════════════════════
   SCONE SOURCERY — scone.js · "Old-World Bakehouse"
   Box builder (per-flavor qty → tally with true box math), theme toggle,
   mobile menu, reveal. Progressive enhancement: the four + prices + the reserve
   form all work with JS off; this only adds the running tally + niceties.
   Box math: $4 ea · 6→$22 · 12→$40. Self-contained, reduced-motion aware.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var d = document;
  var rmq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = rmq ? rmq.matches : false;
  if (rmq && rmq.addEventListener) rmq.addEventListener('change', function (e) { reduce = e.matches; });

  /* theme toggle */
  d.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = d.documentElement.dataset.theme
        || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      d.documentElement.dataset.theme = next;
      var m = d.querySelector('meta[name="theme-color"]');
      if (m) m.content = next === 'dark' ? '#1C1409' : '#F1E7CE';
      try { localStorage.setItem('ss-theme', next); } catch (e) {}
    });
  });

  /* mobile menu */
  var bar = d.querySelector('.bar'), toggle = d.querySelector('.bar-toggle');
  if (bar && toggle) {
    var setOpen = function (o) { toggle.setAttribute('aria-expanded', String(o)); bar.classList.toggle('open', o); };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    bar.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
    });
  }

  /* reveal */
  var reveals = [].slice.call(d.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* box math: $4 ea · 6→$22 · 12→$40 (true box pricing, no fake inventory caps) */
  var SINGLE = 4, SIX = 22, DOZEN = 40, MAX = 60;
  function priceFor(n) {
    var dz = Math.floor(n / 12), r = n % 12, half = Math.floor(r / 6);
    return dz * DOZEN + half * SIX + (r % 6) * SINGLE;
  }

  var flavorsEl = d.getElementById('flavors');
  var noteEl = d.getElementById('tally-note');
  var ctaEl = d.getElementById('tally-cta');
  var sumEl = d.getElementById('tally-sum');
  var summaryInput = d.getElementById('order-summary');
  var formNote = d.getElementById('r-note');

  if (flavorsEl) {
    var cards = [].slice.call(flavorsEl.querySelectorAll('.item[data-id]'));
    var state = {}, noteTouched = false;
    if (formNote) formNote.addEventListener('input', function () { noteTouched = true; });

    function render() {
      var picks = [], count = 0;
      cards.forEach(function (c) {
        var q = state[c.dataset.id] || 0;
        if (q > 0) { count += q; picks.push({ name: c.dataset.name.replace(/&amp;/g, '&'), q: q }); }
      });
      var price = priceFor(count), saved = count * SINGLE - price;

      if (!count) {
        if (noteEl) noteEl.textContent = 'Mix them however you like.';
        if (ctaEl) ctaEl.style.display = 'none';
      } else {
        if (noteEl) noteEl.textContent = count + (count === 1 ? ' scone · $' : ' scones · $') + price + (saved > 0 ? ' · save $' + saved : '');
        if (ctaEl) { ctaEl.style.display = ''; if (sumEl) sumEl.textContent = '$' + price + ' box'; }
      }
      var summary = picks.length
        ? picks.map(function (p) { return p.q + '× ' + p.name; }).join(', ') + ' — $' + price + ' (' + count + ' scones)'
        : '(none picked yet)';
      if (summaryInput) summaryInput.value = summary;
      if (formNote && !noteTouched) formNote.value = picks.length ? summary : '';
    }

    cards.forEach(function (c) {
      var id = c.dataset.id;
      var qEl = c.querySelector('[data-qty]'), inc = c.querySelector('[data-inc]'), dec = c.querySelector('[data-dec]');
      state[id] = 0;
      function set(q) {
        q = Math.max(0, Math.min(MAX, q));
        state[id] = q; qEl.textContent = q;
        dec.disabled = q <= 0; inc.disabled = q >= MAX;
        render();
      }
      inc.addEventListener('click', function () { set((state[id] || 0) + 1); });
      dec.addEventListener('click', function () { set((state[id] || 0) - 1); });
      set(0);
    });
    render();
  }

  /* ── the interactive hearth — the fire follows the cursor, embers rise ──── */
  (function () {
    var svg = d.getElementById('hearth'); if (!svg) return;
    var flames = d.getElementById('h-flames'), glow = d.getElementById('h-glow'),
        fl = d.getElementById('h-firelight'), embersG = d.getElementById('h-embers');
    var NS = 'http://www.w3.org/2000/svg', W = 420;
    var cur = { x: 210, y: 300, inside: false }, embers = [], last = 0, raf;
    if (reduce || !window.requestAnimationFrame) return; // static warm scene otherwise
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * W }; }
    svg.addEventListener('pointermove', function (e) { var p = pt(e); cur.x = p.x; cur.y = p.y; cur.inside = true; });
    svg.addEventListener('pointerleave', function () { cur.inside = false; });
    function spawn() {
      if (embers.length > 28) return;
      var el = d.createElementNS(NS, 'circle'), x = 188 + Math.random() * 44;
      el.setAttribute('cx', x); el.setAttribute('cy', 336);
      el.setAttribute('r', (0.9 + Math.random() * 1.9).toFixed(1));
      el.setAttribute('fill', Math.random() < 0.5 ? '#FFD265' : '#F5872A');
      embersG.appendChild(el);
      embers.push({ el: el, x: x, y: 336, vx: (Math.random() - 0.5) * 0.5, vy: -(0.55 + Math.random() * 0.9), life: 1 });
    }
    function frame(t) {
      var lean = cur.inside ? Math.max(-15, Math.min(15, (cur.x - 210) / 8)) : Math.sin(t / 700) * 3.5;
      flames.setAttribute('transform', 'translate(210 342) skewX(' + (-lean) + ') translate(-210 -342)');
      var gx = cur.inside ? 210 + (cur.x - 210) * 0.28 : 210;
      glow.setAttribute('cx', gx.toFixed(0));
      glow.setAttribute('opacity', (cur.inside ? 0.78 : 0.48 + Math.sin(t / 600) * 0.06).toFixed(2));
      if (fl) fl.setAttribute('opacity', (cur.inside ? 1 : 0.8 + Math.sin(t / 500) * 0.08).toFixed(2));
      if (t - last > (cur.inside ? 85 : 210)) { spawn(); last = t; }
      for (var i = embers.length - 1; i >= 0; i--) {
        var em = embers[i];
        if (cur.inside) em.vx += (cur.x - em.x) * 0.0009;
        em.x += em.vx; em.y += em.vy; em.vy *= 0.996; em.life -= 0.011;
        em.el.setAttribute('cx', em.x.toFixed(1)); em.el.setAttribute('cy', em.y.toFixed(1));
        em.el.setAttribute('opacity', Math.max(0, em.life).toFixed(2));
        if (em.life <= 0) { embersG.removeChild(em.el); embers.splice(i, 1); }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    d.addEventListener('visibilitychange', function () {
      if (d.hidden) { cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(frame); }
    });
  })();

  /* ── Renaissance-fair jig — synthesized live, no audio file, no autoplay ────
     A lively festive tune: a bright fife over a bouncing bass and a tabor drum.
     Off by default; starts only when the visitor taps the sound toggle. */
  (function () {
    var btn = d.getElementById('sound-btn');
    if (!btn || !(window.AudioContext || window.webkitAudioContext)) { if (btn) btn.style.display = 'none'; return; }
    var ctx, master, timer, playing = false, step = 0;
    // G mixolydian — bright, festive
    var S = [392.00,440.00,493.88,523.25,587.33,659.25,698.46,783.99,880.00];
    // melody at eighth-note resolution (4 bars of 6/8); -1 = rest
    var MEL  = [0,2,4, 5,4,2, 3,1,3, 4,2,0, 4,5,7, 6,5,4, 2,4,2, 1,0,-1];
    // bass: oom (root) on beat 1, pah (fifth/other) on beat 2 of each 6/8 bar
    var BASS = [0,-9,-9, 4,-9,-9, -1,-9,-9, 4,-9,-9, 0,-9,-9, 3,-9,-9, 0,-9,-9, 4,-9,-9];
    var DRUM = [1,0,1, 1,0,0, 1,0,1, 1,0,0, 1,0,1, 1,0,0, 1,0,1, 1,1,0];
    var STEP_MS = 178; // sprightly

    function flute(freq, t, dur) {
      var o = ctx.createOscillator(), sub = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'triangle'; sub.type = 'sine';
      o.frequency.value = freq; sub.frequency.value = freq;
      var vib = ctx.createOscillator(), vg = ctx.createGain(); // soft breath vibrato
      vib.frequency.value = 5.5; vg.gain.value = freq * 0.008;
      vib.connect(vg); vg.connect(o.frequency); vg.connect(sub.frequency);
      var subg = ctx.createGain(); subg.gain.value = 0.5; sub.connect(subg);
      lp.type = 'lowpass'; lp.frequency.value = 2300;
      o.connect(g); subg.connect(g); g.connect(lp); lp.connect(master);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.17, t + 0.05);      // soft flute attack
      g.gain.setValueAtTime(0.17, t + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      // a whisper of breath at the note's start
      var nb = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate), nd = nb.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = (Math.random()*2-1) * (1 - i/nd.length);
      var ns = ctx.createBufferSource(); ns.buffer = nb;
      var nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = freq * 1.5; nf.Q.value = 0.6;
      var ng = ctx.createGain(); ng.gain.value = 0.05; ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start(t);
      o.start(t); sub.start(t); vib.start(t);
      var e = t + dur + 0.03; o.stop(e); sub.stop(e); vib.stop(e);
    }
    function bass(freq, t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.26);
    }
    function tabor(t, strong) {
      // a short filtered-noise drum hit
      var len = 0.12, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      var dta = buf.getChannelData(0);
      for (var i = 0; i < dta.length; i++) dta[i] = (Math.random()*2-1) * Math.pow(1 - i/dta.length, 3);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = strong ? 180 : 320; f.Q.value = 1.2;
      var g = ctx.createGain(); g.gain.value = strong ? 0.5 : 0.28;
      src.connect(f); f.connect(g); g.connect(master); src.start(t);
    }

    function tick() {
      if (!playing) return;
      var t = ctx.currentTime + 0.04, i = step % MEL.length;
      var m = MEL[i]; if (m >= 0) flute(S[m], t, STEP_MS/1000 * 0.92);
      var b = BASS[i]; if (b > -9) bass(S[(b+7)%S.length] / 2, t); // an octave down
      if (DRUM[i]) tabor(t, i % 3 === 0);
      step++;
      timer = setTimeout(tick, STEP_MS);
    }
    function start() {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
      playing = true; step = 0; tick();
    }
    function stop() {
      playing = false; clearTimeout(timer);
      if (master) master.gain.setValueAtTime(0.0001, ctx.currentTime);
    }
    function setBtn() { btn.setAttribute('aria-pressed', String(playing)); btn.classList.toggle('on', playing); }
    btn.addEventListener('click', function () {
      playing ? stop() : start(); setBtn();
      try { localStorage.setItem('ss-music', playing ? 'on' : 'off'); } catch (e) {}
    });
    // start automatically on the visitor's first interaction (autoplay is blocked until then)
    var pref; try { pref = localStorage.getItem('ss-music'); } catch (e) {}
    if (pref !== 'off') {
      var gestures = ['pointerdown','keydown','wheel','touchstart'];
      var go = function () { if (!playing) { start(); setBtn(); } gestures.forEach(function (g) { d.removeEventListener(g, go); }); };
      gestures.forEach(function (g) { d.addEventListener(g, go, { once: true, passive: true }); });
    }
    d.addEventListener('visibilitychange', function () {
      if (d.hidden && playing) { stop(); btn.dataset.resume = '1'; btn.classList.remove('on'); }
      else if (!d.hidden && btn.dataset.resume === '1') { btn.dataset.resume = ''; start(); btn.setAttribute('aria-pressed','true'); btn.classList.add('on'); }
    });
  })();
})();
