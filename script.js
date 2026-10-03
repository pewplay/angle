(function () {
  'use strict';

  var MAX_ATTEMPTS = 4;
  var PREFIX = 'angle:';

  // ---------- storage (prefixed keys) ----------
  function sGet(key) {
    try { return localStorage.getItem(PREFIX + key); } catch (e) { return null; }
  }
  function sSet(key, value) {
    try { localStorage.setItem(PREFIX + key, String(value)); } catch (e) { /* ignore */ }
  }
  function readInt(key, min, max) {
    var v = parseInt(sGet(key), 10);
    if (isNaN(v) || v < min || v > max) return null;
    return v;
  }

  // ---------- elements ----------
  var canvas = document.getElementById('angle-canvas');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var pipsEl = document.getElementById('pips');
  var streakEl = document.getElementById('streak');
  var bestEl = document.getElementById('best');
  var readout = document.getElementById('readout');
  var readoutLabel = document.getElementById('readout-label');
  var guessEl = document.getElementById('guess');
  var historyEl = document.getElementById('history');
  var messageEl = document.getElementById('message');
  var keypad = document.getElementById('keypad');
  var actionBtn = document.getElementById('action-btn');

  // ---------- state ----------
  var angle = 0;            // the angle shown (degrees, 0-359)
  var attemptsLeft = MAX_ATTEMPTS;
  var streak = 0;
  var best = 0;
  var typed = '';
  var phase = 'play';       // 'play' | 'won' | 'lost'
  var lastGuess = null;
  var drawnAngle = 0;       // animated value
  var animFrom = 0, animStart = 0, animating = false;

  var HINTS = [
    { max: 5, cls: 'hot', word: 'Boiling!', text: 'You are very close!' },
    { max: 10, cls: 'hot', word: 'Hot!', text: 'You are getting closer!' },
    { max: 20, cls: 'warm', word: 'Warm!', text: 'Keep going!' },
    { max: 30, cls: 'cold', word: 'Cold...', text: 'Try another guess!' },
    { max: 45, cls: 'cold', word: 'Very cold...', text: 'Look elsewhere!' },
    { max: Infinity, cls: 'icy', word: 'Freezing!', text: 'Way off.' }
  ];
  function hintFor(diff) {
    for (var i = 0; i < HINTS.length; i++) if (diff <= HINTS[i].max) return HINTS[i];
    return HINTS[HINTS.length - 1];
  }

  function randomAngle() {
    var a;
    do { a = Math.floor(Math.random() * 360); } while (a === angle);
    return a;
  }

  // ---------- drawing ----------
  var cssSize = 300;
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    cssSize = Math.max(120, Math.floor(Math.min(w, h)));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function rays(a, len) {
    var half = a * Math.PI / 360;
    return [
      { x: Math.cos(half) * len, y: -Math.sin(half) * len },
      { x: Math.cos(half) * len, y: Math.sin(half) * len }
    ];
  }

  function draw() {
    var s = cssSize;
    var cx = s / 2, cy = s / 2;
    var len = s * 0.4;
    var a = drawnAngle;
    var half = a * Math.PI / 360;
    ctx.clearRect(0, 0, s, s);

    // faint guide circle
    ctx.save();
    ctx.strokeStyle = '#e3e9f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(cx, cy, len, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // wedge + arc marking the measured angle (canvas y grows downward)
    var r = len * 0.32;
    if (a > 0) {
      ctx.fillStyle = 'rgba(234, 67, 53, 0.13)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -half, half);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ea4335';
      ctx.lineWidth = Math.max(2.5, s * 0.008);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, -half, half);
      ctx.stroke();
    }

    // the player's last guess, after a lost round
    if (phase === 'lost' && lastGuess !== null && !animating) {
      var g = rays(lastGuess, len * 0.92);
      ctx.save();
      ctx.strokeStyle = 'rgba(240, 140, 0, 0.85)';
      ctx.lineWidth = Math.max(2, s * 0.007);
      ctx.setLineDash([8, 7]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + g[0].x, cy + g[0].y);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + g[1].x, cy + g[1].y);
      ctx.stroke();
      ctx.restore();
    }

    // rays
    var p = rays(a, len);
    ctx.strokeStyle = phase === 'won' ? '#1e9e57' : '#1f2a44';
    ctx.lineWidth = Math.max(3, s * 0.014);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + p[0].x, cy + p[0].y);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + p[1].x, cy + p[1].y);
    ctx.lineJoin = 'round';
    ctx.stroke();

    // vertex
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, s * 0.016), 0, Math.PI * 2);
    ctx.fill();

    // legend for the lost state
    if (phase === 'lost' && lastGuess !== null && !animating) {
      var fs = Math.max(12, Math.min(22, Math.round(s * 0.04)));
      ctx.font = '700 ' + fs + 'px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      var y = s - fs * 1.4, x = fs;
      ctx.fillStyle = '#1f2a44';
      ctx.fillRect(x, y - 1.5, fs * 1.4, 3);
      ctx.strokeText('Answer: ' + angle + '°', x + fs * 1.9, y);
      ctx.fillText('Answer: ' + angle + '°', x + fs * 1.9, y);
      y -= fs * 1.5;
      ctx.fillStyle = '#f08c00';
      ctx.fillRect(x, y - 1.5, fs * 0.55, 3);
      ctx.fillRect(x + fs * 0.85, y - 1.5, fs * 0.55, 3);
      ctx.strokeText('Your last guess: ' + lastGuess + '°', x + fs * 1.9, y);
      ctx.fillText('Your last guess: ' + lastGuess + '°', x + fs * 1.9, y);
    }
  }

  function animateTo(target) {
    animFrom = 0;
    animStart = performance.now();
    if (!animating) {
      animating = true;
      requestAnimationFrame(step);
    }
    function step(t) {
      var k = Math.min(1, (t - animStart) / 550);
      var e = 1 - Math.pow(1 - k, 3);
      drawnAngle = animFrom + (target - animFrom) * e;
      if (k >= 1) { drawnAngle = target; animating = false; }
      draw();
      if (animating) requestAnimationFrame(step);
    }
  }

  // ---------- UI ----------
  function renderStats() {
    var pips = pipsEl.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('used', i >= attemptsLeft);
    }
    pipsEl.setAttribute('aria-label', 'Attempts left: ' + attemptsLeft);
    streakEl.textContent = streak;
    bestEl.textContent = best;
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function renderGuess() {
    guessEl.textContent = typed;
  }

  function shakeReadout() {
    readout.classList.remove('shake');
    void readout.offsetWidth;
    readout.classList.add('shake');
  }

  function setMessage(html) {
    messageEl.innerHTML = html;
  }

  function addChip(value, hint) {
    var c = document.createElement('span');
    c.className = 'chip ' + hint.cls;
    c.textContent = value + '°';
    c.title = hint.word;
    historyEl.appendChild(c);
  }

  function setPhase(p) {
    phase = p;
    keypad.classList.toggle('disabled', p !== 'play');
    readout.classList.toggle('win', p === 'won');
    readout.classList.toggle('lose', p === 'lost');
    actionBtn.classList.toggle('primary', p !== 'play');
    actionBtn.classList.toggle('retry', p === 'lost');
    if (p === 'play') {
      readoutLabel.textContent = 'Your guess';
      actionBtn.textContent = 'Skip angle (resets streak)';
    } else if (p === 'won') {
      readoutLabel.textContent = 'Correct!';
      actionBtn.textContent = 'Next angle →';
    } else {
      readoutLabel.textContent = 'The angle was';
      actionBtn.textContent = 'Try a new angle';
    }
  }

  function save() {
    sSet('generatedAngle', angle);
    sSet('attemptsLeft', attemptsLeft);
    sSet('currentStreak', streak);
    sSet('bestStreak', best);
  }

  function newRound() {
    angle = randomAngle();
    attemptsLeft = MAX_ATTEMPTS;
    typed = '';
    lastGuess = null;
    historyEl.textContent = '';
    setPhase('play');
    renderGuess();
    renderStats();
    setMessage('How wide is the red angle? Enter a value from 0 to 359.');
    save();
    animateTo(angle);
  }

  function check() {
    if (phase !== 'play') return;
    if (typed === '') { shakeReadout(); return; }
    var g = parseInt(typed, 10);
    if (g === angle) {
      streak++;
      if (streak > best) best = streak;
      setPhase('won');
      bump(streakEl);
      renderStats();
      var tries = MAX_ATTEMPTS - attemptsLeft + 1;
      setMessage('<b>Well done!</b>&nbsp;The angle was ' + angle + '°' +
        (tries === 1 ? ', first try!' : ' (' + tries + ' tries).'));
      guessEl.textContent = String(angle);
      // store the next angle straight away so a reload cannot replay this one
      var solved = angle;
      angle = randomAngle();
      attemptsLeft = MAX_ATTEMPTS;
      save();
      angle = solved;
      attemptsLeft = MAX_ATTEMPTS - tries + 1;
      draw();
      pendingNext = true;
      return;
    }
    var hint = hintFor(Math.abs(g - angle));
    attemptsLeft--;
    lastGuess = g;
    addChip(g, hint);
    typed = '';
    renderGuess();
    if (attemptsLeft <= 0) {
      attemptsLeft = 0;
      streak = 0;
      setPhase('lost');
      guessEl.textContent = String(angle);
      setMessage('No attempts left. Your streak starts again.');
      sSet('lastGuess', g);
    } else {
      setMessage('<span class="' + hint.cls + '"><b class="' + hint.cls + '">' + hint.word + '</b>&nbsp;' + hint.text + '</span>');
      shakeReadout();
    }
    renderStats();
    save();
    draw();
  }

  var pendingNext = false;
  function nextFromStorage() {
    // after a win the next angle is already stored
    var a = readInt('generatedAngle', 0, 359);
    pendingNext = false;
    if (a === null || a === angle) { newRound(); return; }
    angle = a;
    attemptsLeft = MAX_ATTEMPTS;
    typed = '';
    lastGuess = null;
    historyEl.textContent = '';
    setPhase('play');
    renderGuess();
    renderStats();
    setMessage('How wide is the red angle? Enter a value from 0 to 359.');
    save();
    animateTo(angle);
  }

  function action() {
    if (phase === 'won' && pendingNext) { nextFromStorage(); return; }
    if (phase === 'play') {
      streak = 0;
    }
    newRound();
  }

  function press(k) {
    if (phase !== 'play') {
      if (k === 'ok') action();
      return;
    }
    if (k === 'ok') { check(); return; }
    if (k === 'del') { typed = typed.slice(0, -1); renderGuess(); return; }
    var next = typed === '0' ? k : typed + k;
    if (next.length > 3 || parseInt(next, 10) > 359) { shakeReadout(); return; }
    typed = next;
    renderGuess();
  }

  function flashKey(k) {
    var b = keypad.querySelector('[data-k="' + k + '"]');
    if (!b) return;
    b.classList.add('pressed');
    setTimeout(function () { b.classList.remove('pressed'); }, 110);
  }

  // ---------- input ----------
  keypad.addEventListener('click', function (e) {
    var b = e.target.closest('.key');
    if (!b) return;
    press(b.getAttribute('data-k'));
    b.blur();
  });
  actionBtn.addEventListener('click', function () { action(); actionBtn.blur(); });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === 'Backspace' || e.key === 'Delete') k = 'del';
    else if (e.key === 'Enter' || e.key === ' ') k = 'ok';
    else if (e.key === 'Escape' && phase === 'play') { typed = ''; renderGuess(); e.preventDefault(); return; }
    if (k === null) return;
    e.preventDefault();
    if (e.repeat && k === 'ok') return;
    if (phase === 'play') flashKey(k);
    press(k);
  });

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  // ---------- start ----------
  var savedAngle = readInt('generatedAngle', 0, 359);
  streak = readInt('currentStreak', 0, 1e9) || 0;
  best = readInt('bestStreak', 0, 1e9) || 0;
  if (streak > best) best = streak;
  resize();
  if (savedAngle === null) {
    newRound();
  } else {
    angle = savedAngle;
    var savedAttempts = readInt('attemptsLeft', 0, MAX_ATTEMPTS);
    attemptsLeft = savedAttempts === null ? MAX_ATTEMPTS : savedAttempts;
    if (attemptsLeft === 0) {
      streak = 0;
      lastGuess = readInt('lastGuess', 0, 359);
      setPhase('lost');
      guessEl.textContent = String(angle);
      setMessage('No attempts left. Your streak starts again.');
      drawnAngle = angle;
      draw();
    } else {
      setPhase('play');
      renderGuess();
      if (attemptsLeft < MAX_ATTEMPTS) {
        setMessage('Keep going: ' + attemptsLeft + (attemptsLeft === 1 ? ' attempt' : ' attempts') + ' left for this angle.');
      }
      animateTo(angle);
    }
    renderStats();
    save();
  }

  // small hook for automated screenshots/tests (no effect on the game)
  window.__angle = { get angle() { return angle; }, press: press };
})();
