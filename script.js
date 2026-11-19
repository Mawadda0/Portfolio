(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.getElementById('home');

  /* ---------- theme ---------- */
  var dark = false;
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setTheme(v) {
    root.setAttribute('data-theme', v);
    try { localStorage.setItem('pf-theme', v); } catch (e) { }
  }
  try { var saved = localStorage.getItem('pf-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) { }
  dark = isDark();
  document.getElementById('themeBtn').addEventListener('click', function () { setTheme(isDark() ? 'light' : 'dark'); });

  /* ---------- palettes for the scene (day, dusk, night) ---------- */
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var RAW = {
    day: { skyT: '#BDEBDD', skyB: '#FDDCE8', far: '#A9DDC8', near: '#83CDAB', grass: '#52BA8E', cloud: '#FFF8FA', sun: '#FFD36B', wall: '#FBD3E0', roof: '#F27FA8', roof2: '#E0688F', door: '#8A4A6B', win: '#FFF2B8', trunk: '#8A5A68', bloom: '#F59CBD', bloom2: '#FFC6DA', soil: '#C98AA0', fence: '#FFFFFF' },
    dusk: { skyT: '#F4A3C3', skyB: '#FFD3AE', far: '#8DB9B4', near: '#64A397', grass: '#3E8B7B', cloud: '#FFC2D6', sun: '#FF9C7A', wall: '#F2B4C8', roof: '#D75F8D', roof2: '#C4507F', door: '#74395C', win: '#FFD566', trunk: '#76485A', bloom: '#F27CA5', bloom2: '#FFA9C6', soil: '#B1738C', fence: '#FBE9F0' },
    night: { skyT: '#17122B', skyB: '#3C2B63', far: '#2B4C5A', near: '#244250', grass: '#2F7060', cloud: '#4E4075', sun: '#F7EEDC', wall: '#80597C', roof: '#B34B80', roof2: '#9E3F6E', door: '#4A2A45', win: '#FFE27A', trunk: '#4C3442', bloom: '#C9628F', bloom2: '#E58AB0', soil: '#5C3D55', fence: '#C8B1C6' }
  };
  var STARS = { day: 0, dusk: 0.15, night: 1 };
  var PAL = {};
  Object.keys(RAW).forEach(function (n) { PAL[n] = {}; Object.keys(RAW[n]).forEach(function (k) { PAL[n][k] = hex(RAW[n][k]); }); });
  function mixA(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  function css(a) { return 'rgb(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ')'; }
  function getPal(tt) {
    var a, b, f, sa, sb;
    if (tt < 0.5) { a = PAL.day; b = PAL.dusk; f = tt * 2; sa = STARS.day; sb = STARS.dusk; }
    else { a = PAL.dusk; b = PAL.night; f = (tt - 0.5) * 2; sa = STARS.dusk; sb = STARS.night; }
    var A = {}, S = {};
    Object.keys(a).forEach(function (k) { A[k] = mixA(a[k], b[k], f); S[k] = css(A[k]); });
    return { A: A, S: S, stars: sa + (sb - sa) * f };
  }

  /* ---------- hero scene ---------- */
  var W = 320, H = 128, GY = 112;
  var c = document.getElementById('scene');
  c.width = W; c.height = H;
  var x = c.getContext('2d');
  var SPR = [
    ".kkk....kkk.",
    "kgwwk..kwwgk",
    "kgwkgkkgkwgk",
    "kgpggggggpgk",
    "kgggkkkkgggk",
    ".kgllllllgk.",
    ".kgllllllgk.",
    "..kkkkkkkk.."
  ];
  var LEGS = [
    [".kgk....kgk.", "kggk....kggk"],
    ["kgk......kgk", "kk........kk"]
  ];
  var FROG = { k: '#2A1F2D', g: '#62D3A8', w: '#FFF7F2', p: '#F47FA6', l: '#D8F7E8' };
  function sprite(px, py, frame, flip) {
    var rows = SPR.concat(LEGS[frame]);
    for (var r = 0; r < rows.length; r++) {
      for (var i = 0; i < 12; i++) {
        var ch = rows[r].charAt(flip ? 11 - i : i);
        if (ch === '.') continue;
        x.fillStyle = FROG[ch];
        x.fillRect(px + i, py + r, 1, 1);
      }
    }
  }
  var stars = [];
  (function () { var s = 11; for (var i = 0; i < 46; i++) { s = (s * 9301 + 49297) % 233280; var a = s / 233280; s = (s * 9301 + 49297) % 233280; var b = s / 233280; stars.push([Math.floor(a * W), Math.floor(b * 64)]); } })();
  var clouds = [[10, 14, 0.06], [80, 30, 0.04], [150, 10, 0.05], [230, 24, 0.07], [290, 8, 0.03]];
  var tick = 0, wx = 128, lastWx = 128, sceneT = 0, heroVisible = true;
  var jy = 0, jv = 0, frogBox = null;

  function blob(cx, cy, r, c1, c2) {
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) { x.fillStyle = ((dx * 7 + dy * 13) & 3) === 0 ? c2 : c1; x.fillRect(cx + dx, cy + dy, 1, 1); }
    }
  }
  function bird(bx, by, S, hop) {
    var y = by - (hop ? 2 : 0);
    x.fillStyle = '#F4A6BF'; x.fillRect(bx, y, 6, 4); x.fillRect(bx + 4, y - 2, 3, 3);
    x.fillStyle = '#2A1F2D'; x.fillRect(bx + 5, y - 1, 1, 1);
    x.fillStyle = '#F7C95A'; x.fillRect(bx + 7, y - 1, 2, 1);
    x.fillStyle = '#62D3A8'; x.fillRect(bx + 1, y + 1, 3, 2); x.fillRect(bx - 2, y, 2, 1);
  }

  function drawScene() {
    var rect = hero.getBoundingClientRect();
    var t = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.85)));
    sceneT = t;
    var tt = dark ? 0.7 + 0.3 * t : t;
    var pal = getPal(tt), A = pal.A, S = pal.S;
    var sy = window.scrollY || 0;
    var i, px, py;

    /* sky bands with a dithered seam between each */
    for (i = 0; i < 16; i++) { x.fillStyle = css(mixA(A.skyT, A.skyB, i / 15)); x.fillRect(0, i * 8, W, 8); }
    for (i = 1; i < 16; i++) {
      x.fillStyle = css(mixA(A.skyT, A.skyB, (i - 1) / 15));
      for (px = 1; px < W; px += 2) x.fillRect(px, i * 8, 1, 1);
      for (px = 0; px < W; px += 2) x.fillRect(px, i * 8 + 1, 1, 1);
    }
    if (pal.stars > 0.05) {
      for (i = 0; i < stars.length; i++) {
        if (i / stars.length > pal.stars) break;
        if ((tick + i * 5) % 34 < 28) { x.fillStyle = '#FFF3E0'; x.fillRect(stars[i][0], stars[i][1], 1, 1); }
      }
    }
    /* sun that sets, then a moon that rises */
    var oy = tt < 0.6 ? 22 + (tt / 0.6) * 46 : 68 - ((tt - 0.6) / 0.4) * 46;
    x.globalAlpha = 0.25; x.fillStyle = S.sun;
    for (py = -11; py <= 11; py++) for (px = -11; px <= 11; px++) if (px * px + py * py <= 110) x.fillRect(214 + px, Math.round(oy) + py, 1, 1);
    x.globalAlpha = 1;
    for (py = -7; py <= 7; py++) for (px = -7; px <= 7; px++) if (px * px + py * py <= 50) x.fillRect(214 + px, Math.round(oy) + py, 1, 1);

    /* clouds drift with time and with scroll */
    x.fillStyle = S.cloud;
    for (i = 0; i < clouds.length; i++) {
      var cx = Math.floor(((clouds[i][0] + tick * clouds[i][2] + sy * 0.03) % (W + 60)) - 30), cy = clouds[i][1];
      x.fillRect(cx, cy, 24, 5); x.fillRect(cx + 4, cy - 4, 14, 4); x.fillRect(cx + 14, cy - 3, 8, 3);
    }

    /* two hill layers sink at different speeds as you scroll */
    var yf = Math.round(t * 16), yn = Math.round(t * 8);
    for (px = 0; px < W; px++) {
      var h1 = 78 + yf + Math.round(6 * Math.sin(px / 23) + 3 * Math.sin(px / 9));
      x.fillStyle = S.far; x.fillRect(px, h1, 1, H - h1);
      if (px % 2 === 0) x.fillRect(px, h1 - 1, 1, 1);
      var h2 = 92 + yn + Math.round(4 * Math.sin(px / 15 + 1) + 2 * Math.sin(px / 6));
      x.fillStyle = S.near; x.fillRect(px, h2, 1, H - h2);
      if (px % 2 === 1) x.fillRect(px, h2 - 1, 1, 1);
    }
    x.fillStyle = S.grass; x.fillRect(0, GY, W, 3);
    x.fillStyle = S.soil; x.fillRect(0, GY + 3, W, H - GY - 3);
    x.fillStyle = S.near;
    for (i = 0; i < 70; i++) x.fillRect((i * 37) % W, GY + 5 + ((i * 11) % 10), 2, 1);

    /* lily pond */
    x.fillStyle = css(mixA(A.skyT, [80, 200, 200], 0.5));
    x.fillRect(112, GY + 5, 56, 10); x.fillRect(110, GY + 7, 60, 6);
    x.fillStyle = S.cloud;
    for (i = 0; i < 5; i++) x.fillRect(116 + ((i * 11 + Math.floor(tick / 12)) % 48), GY + 7 + (i % 3) * 3, 3, 1);
    [[120, GY + 9], [138, GY + 11], [155, GY + 8]].forEach(function (lp) {
      x.fillStyle = S.grass; x.fillRect(lp[0], lp[1], 8, 3); x.fillRect(lp[0] + 1, lp[1] - 1, 6, 1);
      x.fillStyle = S.bloom; x.fillRect(lp[0] + 3, lp[1] - 1, 2, 1);
    });

    /* fence and birds */
    x.fillStyle = S.fence;
    x.fillRect(10, 102, 100, 2); x.fillRect(10, 107, 100, 2);
    for (i = 0; i < 8; i++) x.fillRect(14 + i * 14, 97, 3, 15);
    var hop = (tick % 90) < 4;
    bird(34, 98, S, hop); bird(70, 98, S, (tick + 40) % 90 < 4);

    /* mushroom house */
    var lit = pal.stars > 0.4, open = t > 0.96;
    x.fillStyle = S.roof2; x.fillRect(212, 58, 5, 12);
    x.fillStyle = S.roof; x.fillRect(211, 57, 7, 2);
    x.fillStyle = S.wall; x.fillRect(186, 90, 28, 22);
    x.fillStyle = css(mixA(A.wall, [42, 31, 45], 0.16)); x.fillRect(210, 90, 4, 22);
    for (py = 64; py <= 90; py++) {
      var dyv = 90 - py, hw = Math.round(34 * Math.sqrt(1 - (dyv / 26) * (dyv / 26)));
      x.fillStyle = py > 85 ? S.roof2 : S.roof;
      x.fillRect(200 - hw, py, hw * 2, 1);
    }
    x.fillStyle = S.roof2; x.fillRect(166, 90, 68, 3);
    [[184, 79, 4], [203, 71, 3], [216, 81, 3], [193, 86, 2], [226, 87, 2]].forEach(function (dot) { blob(dot[0], dot[1], dot[2], S.fence, S.fence); });
    x.fillStyle = S.door; x.fillRect(195, 99, 10, 13); x.fillRect(196, 97, 8, 2);
    x.fillStyle = open ? S.win : S.roof; x.fillRect(197, 100, 6, 12);
    if (open) { x.fillStyle = '#2A1F2D'; x.fillRect(197, 100, 2, 12); }
    x.fillStyle = '#F7C95A'; x.fillRect(201, 106, 1, 1);
    [[189, 100], [208, 100]].forEach(function (w) {
      if (lit) { x.globalAlpha = 0.22; x.fillStyle = S.win; x.fillRect(w[0] - 3, w[1] - 3, 11, 11); x.globalAlpha = 1; }
      x.fillStyle = S.door; x.fillRect(w[0] - 1, w[1] - 1, 7, 7);
      x.fillStyle = S.win; x.fillRect(w[0], w[1], 5, 5);
      x.fillStyle = S.door; x.fillRect(w[0] + 2, w[1], 1, 5); x.fillRect(w[0], w[1] + 2, 5, 1);
    });
    x.fillStyle = S.soil; x.fillRect(193, 111, 14, 2);
    x.fillStyle = S.cloud;
    for (i = 0; i < 3; i++) {
      var puff = (tick * 0.5 + i * 9) % 27;
      x.globalAlpha = 1 - puff / 27;
      x.fillRect(Math.round(214 + Math.sin((tick + i * 20) / 14) * 3), Math.round(53 - puff), 3 + (i % 2), 3);
    }
    x.globalAlpha = 1;

    /* cherry blossom tree */
    x.fillStyle = S.trunk; x.fillRect(249, 78, 6, 34); x.fillRect(243, 84, 6, 2); x.fillRect(255, 88, 7, 2);
    blob(252, 66, 14, S.bloom, S.bloom2); blob(238, 76, 9, S.bloom, S.bloom2); blob(267, 76, 9, S.bloom, S.bloom2); blob(252, 52, 9, S.bloom, S.bloom2);

    /* bushes and flowers */
    blob(160, 108, 6, S.grass, S.near); blob(238, 108, 6, S.grass, S.near); blob(30, 110, 5, S.grass, S.near);
    for (i = 0; i < 9; i++) {
      var fx = 112 + i * 7; if (fx > 168 && fx < 232) continue;
      x.fillStyle = S.grass; x.fillRect(fx, GY - 2, 1, 2);
      x.fillStyle = (Math.floor(tick / 10) + i) % 3 ? S.bloom2 : '#FFE08A'; x.fillRect(fx, GY - 3, 1, 1);
    }

    /* dragonfly */
    var dfx = Math.round(140 + Math.sin(tick / 30) * 26), dfy = Math.round(96 + Math.sin(tick / 17) * 6);
    x.fillStyle = '#62D3A8'; x.fillRect(dfx, dfy, 5, 1); x.fillRect(dfx + 5, dfy - 1, 2, 2);
    x.fillStyle = '#FFF7F2';
    if (tick % 6 < 3) { x.fillRect(dfx + 1, dfy - 2, 2, 1); x.fillRect(dfx + 3, dfy - 2, 2, 1); }
    else { x.fillRect(dfx + 1, dfy + 1, 2, 1); x.fillRect(dfx + 3, dfy + 1, 2, 1); }

    /* the frog hops toward the door as you scroll */
    var target = 128 + 66 * Math.min(1, t / 0.95);
    wx += (target - wx) * 0.2;
    frogBox = null;
    if (!open) {
      var moving = Math.abs(wx - lastWx) > 0.04;
      var lift = moving ? Math.round(Math.abs(Math.sin(wx * 0.3)) * 5) : 0;
      lift += Math.round(jy);
      var frame = lift > 1 ? 1 : 0;
      x.globalAlpha = 0.25; x.fillStyle = '#2A1F2D'; x.fillRect(Math.round(wx) + 1, GY + 1, 10 - Math.min(lift, 4), 1); x.globalAlpha = 1;
      sprite(Math.round(wx), GY - 9 - lift, frame, false);
      frogBox = { x: Math.round(wx), y: GY - 9 - lift, w: 12, h: 10 };
    }
    lastWx = wx;
  }

  /* ---------- click the frog to make it hop ---------- */
  function overFrog(e) {
    if (!frogBox) return null;
    var r = hero.getBoundingClientRect();
    var sc = Math.max(r.width / W, r.height / H);
    var ox = (r.width - W * sc) * 0.67, oy = r.height - H * sc;
    var lx = (e.clientX - r.left - ox) / sc, ly = (e.clientY - r.top - oy) / sc;
    var pad = 3;
    if (lx >= frogBox.x - pad && lx <= frogBox.x + frogBox.w + pad && ly >= frogBox.y - pad && ly <= frogBox.y + frogBox.h + pad) return { r: r };
    return null;
  }
  hero.addEventListener('click', function (e) {
    if (reduce || e.target.closest('a, button')) return;
    var hit = overFrog(e);
    if (!hit || jy > 0 || jv > 0) return;
    jv = 3.4;
    var b = document.createElement('span');
    b.className = 'ribbit'; b.textContent = 'RIBBIT!';
    b.style.left = (e.clientX - hit.r.left) + 'px';
    b.style.top = (e.clientY - hit.r.top - 34) + 'px';
    hero.appendChild(b);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 900);
  });
  hero.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    hero.style.cursor = overFrog(e) ? 'pointer' : '';
  });

  /* ---------- falling petals ---------- */
  var fx = document.getElementById('fx');
  var fc = fx.getContext('2d');
  var petals = [];
  var PC = ['#F47FA6', '#62D3A8', '#FFC6DA', '#BDEBDD'];
  function sizeFx() { fx.width = window.innerWidth; fx.height = window.innerHeight; }
  sizeFx();
  window.addEventListener('resize', sizeFx);
  for (var p = 0; p < 26; p++) petals.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, s: 4 + Math.floor(Math.random() * 3) * 1, vy: 0.5 + Math.random() * 0.9, ph: Math.random() * 6.28, col: PC[p % PC.length] });
  function drawFx(vel) {
    fc.clearRect(0, 0, fx.width, fx.height);
    var boost = Math.min(Math.abs(vel), 40) * 0.3;
    fc.globalAlpha = 0.85;
    for (var i = 0; i < petals.length; i++) {
      var q = petals[i];
      q.ph += 0.05; q.y += q.vy + boost; q.x += Math.sin(q.ph) * 0.6 + 0.2;
      if (q.y > fx.height + 8) { q.y = -8; q.x = Math.random() * fx.width; }
      if (q.x > fx.width + 8) q.x = -8;
      fc.fillStyle = q.col; fc.fillRect(Math.floor(q.x), Math.floor(q.y), q.s, q.s - 1);
    }
    fc.globalAlpha = 1;
  }

  /* ---------- scroll driven: XP bar, hint ---------- */
  var xp = document.getElementById('xpbar');
  var hint = document.getElementById('hint');
  var lastY = window.scrollY || 0, vel = 0, lastTs = 0;
  function updateXp() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    xp.style.width = Math.min(100, ((window.scrollY || 0) / max) * 100) + '%';
    if ((window.scrollY || 0) > 24) hint.classList.add('gone'); else hint.classList.remove('gone');
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - lastTs < 33) return;
    lastTs = ts;
    var y = window.scrollY || 0;
    vel = vel * 0.8 + (y - lastY) * 0.2; lastY = y;
    tick++;
    if (jy > 0 || jv > 0) { jy += jv; jv -= 0.35; if (jy <= 0) { jy = 0; jv = 0; } }
    if (heroVisible) drawScene();
    drawFx(vel);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }
  window.addEventListener('scroll', updateXp, { passive: true });
  updateXp();
  drawScene();
  if (reduce) {
    var pend = false;
    window.addEventListener('scroll', function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; drawScene(); }); }, { passive: true });
  } else {
    requestAnimationFrame(loop);
  }
  function themeChanged() { dark = isDark(); drawScene(); }
  new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);

  /* ---------- nav spy ---------- */
  if ('IntersectionObserver' in window) {
    var links = document.querySelectorAll('.links a[data-sec]');
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-sec') === e.target.id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section').forEach(function (s) { so.observe(s); });
  }

  /* ---------- typing line ---------- */
  var roles = ['CS student', 'Competitive programmer', 'open-source contributor'];
  var el = document.getElementById('typed');
  var ri = 0, ci = roles[0].length, del = false;
  function type() {
    var w = roles[ri];
    if (!del) {
      if (ci < w.length) { ci++; }
      else { setTimeout(function () { del = true; type(); }, 1500); return; }
    } else {
      if (ci > 0) { ci--; }
      else { del = false; ri = (ri + 1) % roles.length; }
    }
    el.textContent = roles[ri].slice(0, ci) || ' ';
    setTimeout(type, del ? 40 : 85);
  }
  if (!reduce) { setTimeout(function () { del = true; type(); }, 2200); }

  /* ---------- terminal ---------- */
  var out = document.getElementById('out');
  var input = document.getElementById('cmd');
  var history = [], hi = 0;
  function print(text, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
    return d;
  }
  function printLinks(items) {
    var d = document.createElement('div');

    items.forEach(function (item, i) {
      var a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.text;
      a.target = '_blank';
      a.rel = 'noopener';

      if (i > 0) d.append('  |  ');
      d.appendChild(a);
    });

    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  
  var commands = {
    help: function () {
      print('Available commands:');
      print('  about        who I am');
      print('  open-source  contributions and reviews');
      print('  projects     repositories I work in');
      print('  contact      find me online');
      print('  theme        switch light / dark');
      print('  clear        wipe the screen');
    },
    about: function () {
      print('Mawadda, a CS student from Egypt.');
      print('Learning. Exploring. Optimizing');
      print('Current mission: a shell written in Python.');
    },
    'open-source': function () {
      print('Gitlab Hakathons - 16 merged merge requests - 9th stand on July 2026');
    },
    projects: function () {
      print('Azkari            Web          SQLite');
      print('Linear Bits       Encoding     MATLAB');
      print('Music Player      Team work    Algorithms');
      print('Steller Compass   Team work    Three.js');
      printLink('Browse all repositories', 'https://github.com/Mawadda0?tab=repositories');
    },
    contact: function () {
      print('Find me here:');
      printLinks([
        { text: 'GitHub', url: 'https://github.com/Mawadda0' },
        { text: 'CV', url: 'assets/cv.pdf' },
        { text: 'LinkedIn', url: 'https://www.linkedin.com/in/mawadda-gaber/' },
        { text: 'Email', url: 'mailto:mawaddagaber.dev@gmail.com' }
      ]);
    },
    theme: function () { setTheme(isDark() ? 'light' : 'dark'); print('theme switched.', 'dim'); },
    clear: function () { out.textContent = ''; }
  };
  function run(raw) {
    var line = raw.trim();
    if (!line) return;
    print('mawadda@portfolio:~$ ' + line, 'cmd');
    history.push(line); hi = history.length;
    var name = line.toLowerCase().split(/\s+/)[0];
    if (commands[name]) { commands[name](); }
    else if (name === 'sudo') { print('Nice try :>. You are not in the sudoers file. This incident will be reported.'); }
    else if (name === 'ls') { print('about  open-source  projects  contact'); }
    else { print('command not found: ' + name + '. Type "help".', 'dim'); }
  }
  document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault(); run(input.value); input.value = '';
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && history.length) { hi = Math.max(0, hi - 1); input.value = history[hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown' && history.length) { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
  });
  document.getElementById('quick').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cmd]');
    if (b) run(b.getAttribute('data-cmd'));
  });
  print('Welcome to Maw\'s terminal.', 'dim');
  print('Type "help" or tap a button below.', 'dim');

  /* the terminal types "help" for you the first time you scroll to it */
  var typedOnce = false;
  function autoType() {
    if (typedOnce) return; typedOnce = true;
    var word = 'help', n = 0;
    if (reduce) { run(word); return; }
    (function next() {
      if (n < word.length) { n++; input.value = word.slice(0, n); setTimeout(next, 140); }
      else { setTimeout(function () { run(word); input.value = ''; }, 300); }
    })();
  }
  if ('IntersectionObserver' in window) {
    var tobs = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) {
        tobs.disconnect();

        setTimeout(function () {
          autoType();
        }, 1700);
      }
    }, { threshold: 0.5 });
    tobs.observe(document.querySelector('.term'));
  }
})();

var stats = document.querySelectorAll('.count-up');
var statsStarted = false;

function animateCounters() {
  if (statsStarted) return;
  statsStarted = true;

  stats.forEach(function (counter) {
    var target = Number(counter.dataset.target);
    var duration = 1500;
    var startTime = null;

    function update(timestamp) {
      if (!startTime) startTime = timestamp;

      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);

      counter.textContent = Math.floor(eased * target);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        counter.textContent = target;
      }
    }

    requestAnimationFrame(update);
  });
}

var statsObserver = new IntersectionObserver(function (entries) {
  if (entries[0].isIntersecting) {
    animateCounters();
    statsObserver.disconnect();
  }
}, { threshold: 0.5 });

statsObserver.observe(document.querySelector('.oss-stats'));


const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");

      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15
});

document.querySelectorAll(".reveal").forEach(element => {
  observer.observe(element);
});
