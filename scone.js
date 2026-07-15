/* Scone Sourcery — progressive enhancement for the bakehouse and spellbook. */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduceMotion = motionQuery ? motionQuery.matches : false;
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', function (event) { reduceMotion = event.matches; });
  }

  /* Theme: the bakehouse opens by candlelight, with an explicit day mode. */
  function applyTheme(theme) {
    var next = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = next;
    var themeMeta = d.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = next === 'light' ? '#e7d8b9' : '#100b08';
    d.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-label', next === 'dark' ? 'Open the shutters for day mode' : 'Return to candlelight mode');
      button.title = next === 'dark' ? 'Open the shutters' : 'Return to candlelight';
    });
  }
  applyTheme(root.dataset.theme);
  d.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('ss-theme', next); } catch (error) {}
    });
  });

  /* Mobile navigation stays operable with Escape and closes after selection. */
  var bar = d.getElementById('bar') || d.querySelector('.bar');
  var navToggle = d.querySelector('.bar-toggle');
  if (bar && navToggle) {
    function setNavigation(open) {
      bar.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    navToggle.addEventListener('click', function () {
      setNavigation(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    bar.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNavigation(false);
    });
    d.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setNavigation(false);
        navToggle.focus();
      }
    });
  }

  /* Reveal only when motion is welcome; content is never hidden without JS. */
  var reveals = Array.prototype.slice.call(d.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (element) { element.classList.add('in'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.08 });
    reveals.forEach(function (element) { observer.observe(element); });
  }

  /* Load the cinematic art only after proving it is available. The CSS room is
     a complete fallback, so an interrupted asset request never leaves a hole. */
  var heroArtwork = d.getElementById('hero-artwork');
  if (heroArtwork) {
    var heroImage = new Image();
    heroImage.onload = function () { heroArtwork.classList.add('has-hero-art'); };
    heroImage.src = 'assets/sconesourcery-enchanted-bakeshop-v2.webp';
    if (heroImage.complete && heroImage.naturalWidth) heroArtwork.classList.add('has-hero-art');

    if (!reduceMotion) {
      heroArtwork.addEventListener('pointermove', function (event) {
        var rect = heroArtwork.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
        var y = ((event.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
        heroArtwork.parentElement.style.setProperty('--hero-x', x);
        heroArtwork.parentElement.style.setProperty('--hero-y', y);
      });
      heroArtwork.addEventListener('pointerleave', function () {
        heroArtwork.parentElement.style.removeProperty('--hero-x');
        heroArtwork.parentElement.style.removeProperty('--hero-y');
      });
    }
  }

  /* Spellbook: accessible tabs plus one shared box ledger. Without JavaScript,
     all five recipe pages remain visible and the interest form still works. */
  var flavors = d.getElementById('flavors');
  var tabList = d.querySelector('[data-flavor-tabs]');
  if (flavors && tabList) {
    var SINGLE = 4;
    var HALF_DOZEN = 22;
    var DOZEN = 40;
    var MAX_PER_FLAVOR = 60;
    var panels = Array.prototype.slice.call(flavors.querySelectorAll('.spell-page[data-id]'));
    var tabs = Array.prototype.slice.call(tabList.querySelectorAll('[data-flavor-tab]'));
    var mapPins = Array.prototype.slice.call(d.querySelectorAll('[data-flavor-map]'));
    var state = {};
    var activeId = panels[0] ? panels[0].dataset.id : '';
    var noteWasEdited = false;
    var summaryInput = d.getElementById('order-summary');
    var formNote = d.getElementById('r-note');
    var countElement = d.getElementById('box-count');
    var summaryElement = d.getElementById('box-summary');
    var totalElement = d.getElementById('box-total');
    var savingElement = d.getElementById('box-saving');
    var carryButton = d.getElementById('tally-cta');
    var clearButton = d.querySelector('[data-clear-box]');
    var packButtons = Array.prototype.slice.call(d.querySelectorAll('[data-add-pack]'));
    var spellbook = d.querySelector('.spellbook');

    function priceFor(count) {
      var dozens = Math.floor(count / 12);
      var remainder = count % 12;
      var halves = Math.floor(remainder / 6);
      return dozens * DOZEN + halves * HALF_DOZEN + (remainder % 6) * SINGLE;
    }

    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Planned scone recipes');
    tabs.forEach(function (tab) {
      var id = tab.dataset.flavorTab;
      tab.id = 'tab-' + id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'flavor-' + id);
    });
    panels.forEach(function (panel) {
      state[panel.dataset.id] = 0;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + panel.dataset.id);
      panel.setAttribute('tabindex', '0');
    });

    function setActive(id, options) {
      if (!state.hasOwnProperty(id)) return;
      activeId = id;
      tabs.forEach(function (tab) {
        var selected = tab.dataset.flavorTab === id;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && options && options.focusTab) tab.focus({ preventScroll: true });
      });
      panels.forEach(function (panel) {
        var selected = panel.dataset.id === id;
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
      });
      mapPins.forEach(function (pin) {
        var selected = pin.dataset.flavorMap === id;
        pin.classList.toggle('is-active', selected);
        if (selected) pin.setAttribute('aria-current', 'true');
        else pin.removeAttribute('aria-current');
      });
      if (options && options.scroll && spellbook) {
        spellbook.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { setActive(tab.dataset.flavorTab); });
      tab.addEventListener('keydown', function (event) {
        var nextIndex = index;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        setActive(tabs[nextIndex].dataset.flavorTab, { focusTab: true });
      });
    });
    mapPins.forEach(function (pin) {
      pin.addEventListener('click', function () {
        setActive(pin.dataset.flavorMap, { scroll: true });
      });
    });

    function setQuantity(id, quantity) {
      state[id] = Math.max(0, Math.min(MAX_PER_FLAVOR, quantity));
      renderBox();
    }

    function renderBox() {
      var picks = [];
      var count = 0;
      panels.forEach(function (panel) {
        var id = panel.dataset.id;
        var quantity = state[id] || 0;
        var output = panel.querySelector('[data-qty]');
        var decrement = panel.querySelector('[data-dec]');
        var increment = panel.querySelector('[data-inc]');
        if (output) {
          output.value = quantity;
          output.textContent = quantity;
        }
        if (decrement) decrement.disabled = quantity <= 0;
        if (increment) increment.disabled = quantity >= MAX_PER_FLAVOR;
        if (quantity > 0) {
          count += quantity;
          picks.push({ name: panel.dataset.name, quantity: quantity });
        }
        var tab = tabs.find(function (candidate) { return candidate.dataset.flavorTab === id; });
        var badge = tab ? tab.querySelector('[data-tab-count]') : null;
        if (badge) {
          badge.textContent = quantity;
          badge.dataset.zero = String(quantity === 0);
        }
        var mapPin = mapPins.find(function (candidate) { return candidate.dataset.flavorMap === id; });
        if (mapPin) mapPin.classList.toggle('has-picks', quantity > 0);
      });

      var price = priceFor(count);
      var retail = count * SINGLE;
      var saved = retail - price;
      var shortSummary = picks.length
        ? picks.map(function (pick) { return pick.quantity + '× ' + pick.name; }).join(', ')
        : 'Choose a page and add a scone to begin.';
      var formSummary = picks.length
        ? shortSummary + ' — proposed $' + price + ' (' + count + (count === 1 ? ' scone)' : ' scones)')
        : '(none picked yet)';

      if (countElement) countElement.textContent = count;
      if (summaryElement) summaryElement.textContent = shortSummary;
      if (totalElement) totalElement.textContent = '$' + price;
      if (savingElement) {
        savingElement.textContent = saved > 0
          ? 'Proposed box pricing saves $' + saved + ' against singles.'
          : 'Box pricing applies automatically at 6 and 12.';
      }
      if (carryButton) carryButton.hidden = count === 0;
      if (clearButton) clearButton.disabled = count === 0;
      if (summaryInput) summaryInput.value = formSummary;
      if (formNote && !noteWasEdited) formNote.value = picks.length ? formSummary : '';
    }

    panels.forEach(function (panel) {
      var id = panel.dataset.id;
      var increment = panel.querySelector('[data-inc]');
      var decrement = panel.querySelector('[data-dec]');
      if (increment) increment.addEventListener('click', function () { setQuantity(id, state[id] + 1); });
      if (decrement) decrement.addEventListener('click', function () { setQuantity(id, state[id] - 1); });
    });
    packButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setQuantity(activeId, state[activeId] + Number(button.dataset.addPack || 0));
      });
    });
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        Object.keys(state).forEach(function (id) { state[id] = 0; });
        renderBox();
      });
    }
    if (formNote) formNote.addEventListener('input', function () { noteWasEdited = true; });

    setActive(activeId);
    renderBox();
  }

  /* Optional, quiet room tone. It never autoplays and is discarded when the
     page is hidden. No audio, tracking, or media file leaves the browser. */
  (function () {
    var button = d.getElementById('sound-btn');
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!button || !AudioContext) {
      if (button) button.hidden = true;
      return;
    }
    var context = null;
    var master = null;
    var sources = [];
    var playing = false;

    function stop() {
      sources.forEach(function (source) {
        try { source.stop(); } catch (error) {}
      });
      sources = [];
      if (master && context) {
        try { master.gain.setTargetAtTime(0.0001, context.currentTime, 0.03); } catch (error) {}
      }
      if (context) {
        try { context.close(); } catch (error) {}
      }
      context = null;
      master = null;
      playing = false;
      button.classList.remove('on');
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Turn on quiet bakehouse ambience');
    }

    function start() {
      context = new AudioContext();
      master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.35);
      master.connect(context.destination);

      var seconds = 3;
      var noiseBuffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
      var channel = noiseBuffer.getChannelData(0);
      var last = 0;
      for (var i = 0; i < channel.length; i += 1) {
        var white = Math.random() * 2 - 1;
        last = last * 0.985 + white * 0.015;
        var crackle = Math.random() > 0.9992 ? white * 0.9 : 0;
        channel[i] = last * 0.42 + crackle;
      }
      var fire = context.createBufferSource();
      var fireFilter = context.createBiquadFilter();
      var fireGain = context.createGain();
      fire.buffer = noiseBuffer;
      fire.loop = true;
      fireFilter.type = 'bandpass';
      fireFilter.frequency.value = 520;
      fireFilter.Q.value = 0.35;
      fireGain.gain.value = 0.46;
      fire.connect(fireFilter);
      fireFilter.connect(fireGain);
      fireGain.connect(master);
      fire.start();
      sources.push(fire);

      [98, 147].forEach(function (frequency, index) {
        var tone = context.createOscillator();
        var gain = context.createGain();
        tone.type = index ? 'sine' : 'triangle';
        tone.frequency.value = frequency;
        gain.gain.value = index ? 0.015 : 0.009;
        tone.connect(gain);
        gain.connect(master);
        tone.start();
        sources.push(tone);
      });

      playing = true;
      button.classList.add('on');
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', 'Turn off quiet bakehouse ambience');
    }

    button.addEventListener('click', function () { playing ? stop() : start(); });
    d.addEventListener('visibilitychange', function () { if (d.hidden && playing) stop(); });
    window.addEventListener('pagehide', function () { if (playing) stop(); });
  })();
})();
