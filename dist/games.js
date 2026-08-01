/* Sejong Takgu Games — premium arcade hub */
(function () {
  "use strict";

  var META = {
    tetris: { title: "즐탁 테트리스", hint: "←→ 이동 · ↑/↻ 회전 · ↓ 소프트 · 스페이스 하드드롭", action: "게임 시작", pad: true },
    td: { title: "코트 타워디펜스", hint: "빈 칸 탭 → 라켓 배치 · 웨이브 공 방어", action: "웨이브 시작", pad: false },
    runner: { title: "코트 러너", hint: "탭/스페이스 점프 · 길게 눌러 높이", action: "질주 시작", pad: false },
    kaleido: { title: "드라이브 만화경", hint: "드래그로 궤적 · 시네마틱 파티클", action: "팔레트 변경", pad: false },
    drum: { title: "랠리 비트패드", hint: "8패드 탭 · 비트 시퀀서", action: "비트 토글", pad: false },
    globe: { title: "탁구 지구본", hint: "드래그 회전 · 세종 하이라이트", action: "자동 회전", pad: false },
    particles: { title: "핑퐁 파티클", hint: "터치 중력 · 폭발 필드", action: "폭발", pad: false },
    ripple: { title: "테이블 리플", hint: "탭 리플 · 공 낙하", action: "공 드롭", pad: false },
    bio: { title: "플레이어 카드", hint: "프로필 카드 만들기", action: "PNG 저장", pad: false },
    meme: { title: "즐탁 밈공장", hint: "문구 수정 후 저장", action: "PNG 저장", pad: false }
  };

  var WORDS = [
    "즐탁","조탁","벙개","드라이브","스매시","커트","서브","리시브","랠리","엣지",
    "라켓","러버","코스","8부","7부","9부","복컴","세종이","종촌","집현",
    "고운","새롬","나성","도담","대평","엘스텝","박범근","초심","레슨","한판",
    "백핸드","포핸드","루프","블록","플릭","쇼트","푸시","채프","네트","탁구대"
  ];

  var SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
  };
  var COLORS = {
    I: "#00e5ff", O: "#ffe066", T: "#c77dff", S: "#2ecc71",
    Z: "#ff6b6b", J: "#4dabf7", L: "#ff922b"
  };
  // 타입별 다양 팔레트 (매 피스 랜덤 픽)
  var COLOR_SETS = {
    I: ["#00e5ff","#22d3ee","#67e8f9","#06b6d4","#7dd3fc"],
    O: ["#ffe066","#ffd43b","#fcc419","#fab005","#ffec99"],
    T: ["#c77dff","#da77f2","#e599f7","#be4bdb","#b197fc"],
    S: ["#2ecc71","#40c057","#51cf66","#69db7c","#12b886"],
    Z: ["#ff6b6b","#ff8787","#fa5252","#f06595","#ff8fab"],
    J: ["#4dabf7","#339af0","#74c0fc","#228be6","#748ffc"],
    L: ["#ff922b","#ff9f1c","#ffa94d","#fd7e14","#ff6b35"]
  };
  var EXTRA_COLORS = ["#ff00aa","#00ffc8","#a3ff12","#ff3d81","#7b61ff","#ffd60a","#00f5d4","#f15bb5"];
  var BAG_ORDER = ["I","O","T","S","Z","J","L"];

  var canvas, ctx, wrap, stage, grid, titleEl, hintEl, scoreEl, formHost, toolbar, padEl;
  var raf = 0, running = false, current = null;
  var state = {};
  var pointer = { x: 0, y: 0, down: false };
  var audioCtx = null;
  var particles = [];
  var floats = [];
  var shake = 0;
  var flash = 0;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function esc(s) {
    return String(s || "").replace(/&/g, "&"+"amp;").replace(/</g, "&"+"lt;").replace(/>/g, "&"+"gt;").replace(/"/g, "&"+"quot;");
  }

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, dur, type, vol, slide) {
    var ac = ensureAudio();
    if (!ac) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ac.currentTime + dur);
    g.gain.value = vol == null ? 0.1 : vol;
    o.connect(g); g.connect(ac.destination);
    var t0 = ac.currentTime;
    g.gain.setValueAtTime(g.gain.value, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sfx(name) {
    if (name === "move") tone(520, 0.035, "square", 0.05);
    else if (name === "rot") { tone(640, 0.04, "triangle", 0.07); tone(820, 0.05, "sine", 0.04); }
    else if (name === "drop") {
      // 하드드롭 쾅
      tone(220, 0.06, "square", 0.1, 80);
      tone(110, 0.12, "triangle", 0.12, 55);
      tone(90, 0.08, "sawtooth", 0.06, 40);
    }
    else if (name === "lock") {
      // 착지 톡
      tone(160, 0.05, "square", 0.09);
      tone(240, 0.04, "triangle", 0.05);
    }
    else if (name === "soft") tone(300, 0.025, "sine", 0.035, 180);
    else if (name === "pop" || name === "clear1") {
      // 팡!
      tone(880, 0.07, "square", 0.11);
      tone(1320, 0.09, "triangle", 0.08);
      tone(1760, 0.06, "sine", 0.05);
      tone(440, 0.1, "sine", 0.06);
    }
    else if (name === "pang" || name === "clear2") {
      // 팡팡!!
      tone(660, 0.06, "square", 0.12);
      tone(990, 0.08, "triangle", 0.1);
      tone(1320, 0.1, "sine", 0.08);
      tone(1980, 0.12, "triangle", 0.06);
      tone(330, 0.1, "sawtooth", 0.05, 120);
    }
    else if (name === "tetris") {
      // 테트리스 팡팡팡팡
      tone(523, 0.07, "square", 0.12);
      tone(659, 0.09, "square", 0.11);
      tone(784, 0.11, "square", 0.1);
      tone(1046, 0.16, "triangle", 0.1);
      tone(1319, 0.2, "sine", 0.08);
      tone(100, 0.15, "sawtooth", 0.08, 50);
    }
    else if (name === "smash") {
      tone(80, 0.14, "sawtooth", 0.14, 35);
      tone(200, 0.1, "square", 0.1, 70);
      tone(1500, 0.05, "triangle", 0.06);
    }
    else if (name === "gameover") { tone(200, 0.2, "sawtooth", 0.1, 60); tone(120, 0.3, "triangle", 0.08, 50); }
    else if (name === "coin") tone(880, 0.06, "sine", 0.07);
    else if (name === "hit") tone(160, 0.05, "square", 0.06);
    else if (name === "jump") tone(360, 0.06, "sine", 0.07, 520);
  }

  // ── 테트리스 BGM (Web Audio 루프) ──
  var tetrisBgm = { on: false, timer: null, step: 0, master: null };
  function stopTetrisBgm() {
    tetrisBgm.on = false;
    if (tetrisBgm.timer) { clearTimeout(tetrisBgm.timer); tetrisBgm.timer = null; }
  }
  function startTetrisBgm() {
    stopTetrisBgm();
    var ac = ensureAudio();
    if (!ac) return;
    if (!tetrisBgm.master) {
      tetrisBgm.master = ac.createGain();
      tetrisBgm.master.gain.value = 0.055;
      tetrisBgm.master.connect(ac.destination);
    }
    tetrisBgm.on = true;
    tetrisBgm.step = 0;
    // 가벼운 8비트 코루틴 멜로디 (즐탁 비트)
    var bass = [98, 98, 110, 98, 87, 87, 98, 110];
    var lead = [392, 0, 440, 392, 523, 0, 494, 440, 392, 0, 349, 392, 440, 523, 0, 494];
    function tick() {
      if (!tetrisBgm.on || !audioCtx) return;
      var t0 = audioCtx.currentTime;
      var i = tetrisBgm.step % 16;
      var b = bass[i % 8];
      var l = lead[i];
      function note(freq, type, vol, dur, when) {
        if (!freq) return;
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(vol, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        o.connect(g);
        g.connect(tetrisBgm.master);
        o.start(when);
        o.stop(when + dur + 0.02);
      }
      // kick-ish every 4
      if (i % 4 === 0) note(90, "sine", 0.12, 0.12, t0);
      // hi hat
      note(1800 + (i % 2) * 400, "square", 0.015, 0.03, t0);
      note(b, "triangle", 0.07, 0.18, t0);
      note(l, "square", 0.045, 0.12, t0 + 0.02);
      tetrisBgm.step++;
      tetrisBgm.timer = setTimeout(tick, 175);
    }
    tick();
  }

  function burst(x, y, n, color, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (speed || 120) * (0.4 + Math.random());
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.55,
        max: 0.95,
        r: 1.5 + Math.random() * 3.5,
        color: color || "#d4784a",
        ball: Math.random() > 0.55
      });
    }
  }
  function floatText(x, y, text, color) {
    floats.push({ x: x, y: y, text: text, life: 1.1, color: color || "#e8a57a" });
  }
  function updateFX(dt) {
    shake = Math.max(0, shake - dt * 8);
    flash = Math.max(0, flash - dt * 3);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      p.vx *= 0.98;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (var j = floats.length - 1; j >= 0; j--) {
      var f = floats[j];
      f.life -= dt;
      f.y -= 36 * dt;
      if (f.life <= 0) floats.splice(j, 1);
    }
  }
  function drawFX(ctx) {
    particles.forEach(function (p) {
      var a = clamp(p.life / 0.6, 0, 1);
      ctx.globalAlpha = a;
      if (p.ball) {
        ctx.beginPath();
        ctx.fillStyle = "#f4f6f8";
        ctx.arc(p.x, p.y, p.r + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
    });
    ctx.globalAlpha = 1;
    floats.forEach(function (f) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "700 16px Instrument Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
    if (flash > 0) {
      ctx.fillStyle = "rgba(255,240,220," + (flash * 0.25) + ")";
      ctx.fillRect(0, 0, state.W, state.H);
    }
  }

  function sizeCanvas() {
    if (!canvas || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var isXL = wrap.classList.contains("tetris-xl");
    var dpr = Math.min(window.devicePixelRatio || 1, isXL ? 2.5 : 2);
    var w = Math.max(isXL ? 320 : 280, Math.floor(r.width));
    var h = Math.max(isXL ? 520 : 320, Math.floor(r.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.W = w; state.H = h;
  }
  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function loop(fn) {
    stopLoop();
    running = true;
    var last = performance.now();
    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      fn(dt, t / 1000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }
  function setScore(s) { if (scoreEl) scoreEl.innerHTML = s || ""; }
  function hiGet(k) {
    try { return parseInt(localStorage.getItem("pp_hi_" + k) || "0", 10) || 0; } catch (e) { return 0; }
  }
  function hiSet(k, v) {
    var cur = hiGet(k);
    if (v > cur) {
      try { localStorage.setItem("pp_hi_" + k, String(v)); } catch (e) {}
      return true;
    }
    return false;
  }
  function refreshHi() {
    var el = $("tetrisHi");
    if (el) el.textContent = "최고 기록 " + hiGet("tetris").toLocaleString() + "점 · 테트리스 지금 플레이";
  }

  function showStage(id) {
    current = id;
    stage.classList.add("on");
    if (grid) grid.style.display = "none";
    var feat = document.querySelector(".play-featured");
    if (feat) feat.style.display = "none";
    var m = META[id];
    titleEl.textContent = m.title;
    hintEl.textContent = m.hint;
    $("playAction").textContent = m.action;
    formHost.style.display = "none";
    formHost.innerHTML = "";
    wrap.style.display = "block";
    toolbar.style.display = "flex";
    if (padEl) padEl.classList.toggle("on", !!m.pad);
    // 테트리스 초대형 캔버스
    if (wrap) wrap.classList.toggle("tetris-xl", id === "tetris");
    if (padEl) padEl.classList.toggle("tetris-xl-pad", id === "tetris");
    if (id !== "tetris") stopTetrisBgm();
    particles = []; floats = []; shake = 0; flash = 0;
    sizeCanvas();
    initGame(id);
  }
  function hideStage() {
    stopLoop();
    stopTetrisBgm();
    current = null;
    stage.classList.remove("on");
    if (grid) grid.style.display = "";
    var feat = document.querySelector(".play-featured");
    if (feat) feat.style.display = "";
    if (padEl) {
      padEl.classList.remove("on");
      padEl.classList.remove("tetris-xl-pad");
    }
    if (wrap) wrap.classList.remove("tetris-xl");
    setScore("");
    refreshHi();
  }

  // ═══════════ TETRIS ═══════════════════════════════════
  function newBag() {
    if (!state.bag || !state.bag.length) {
      state.bag = BAG_ORDER.slice();
      for (var i = state.bag.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = state.bag[i]; state.bag[i] = state.bag[j]; state.bag[j] = t;
      }
    }
    var type = state.bag.pop();
    var palette = COLOR_SETS[type] || [COLORS[type]];
    var col = palette[(Math.random() * palette.length) | 0];
    // 가끔 특별 네온 색
    if (Math.random() < 0.12) col = pick(EXTRA_COLORS);
    return {
      type: type,
      m: SHAPES[type].map(function (r) { return r.slice(); }),
      x: 3, y: 0,
      word: pick(WORDS),
      color: col
    };
  }
  function rotateM(m) {
    var h = m.length, w = m[0].length, out = [];
    for (var x = 0; x < w; x++) {
      out[x] = [];
      for (var y = h - 1; y >= 0; y--) out[x].push(m[y][x]);
    }
    return out;
  }
  function collides(board, p, ox, oy, mat) {
    mat = mat || p.m;
    for (var y = 0; y < mat.length; y++) {
      for (var x = 0; x < mat[y].length; x++) {
        if (!mat[y][x]) continue;
        var nx = p.x + x + (ox || 0), ny = p.y + y + (oy || 0);
        if (nx < 0 || nx >= 10 || ny >= 20) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }
  function merge(board, p) {
    for (var y = 0; y < p.m.length; y++) {
      for (var x = 0; x < p.m[y].length; x++) {
        if (!p.m[y][x]) continue;
        var ny = p.y + y, nx = p.x + x;
        if (ny >= 0) board[ny][nx] = { c: p.color, w: p.word };
      }
    }
  }
  function ghostY(board, p) {
    var gy = 0;
    while (!collides(board, p, 0, gy + 1)) gy++;
    return p.y + gy;
  }
  function initTetris(startPlaying) {
    state.mode = "tetris";
    state.cols = 10; state.rows = 20;
    state.board = [];
    for (var r = 0; r < 20; r++) {
      state.board[r] = [];
      for (var c = 0; c < 10; c++) state.board[r][c] = null;
    }
    state.bag = [];
    state.piece = newBag();
    state.next = newBag();
    state.hold = null;
    state.holdUsed = false;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.combo = 0;
    state.drop = 0;
    state.playing = !!startPlaying;
    state.over = false;
    state.clearAnim = null;
    state.menuPulse = 0;
    state.softTick = 0;
    setScore(hudTetris());
    if (startPlaying) {
      ensureAudio();
      startTetrisBgm();
      sfx("coin");
    } else {
      stopTetrisBgm();
    }
    loop(tetrisFrame);
  }
  function hudTetris() {
    var hi = hiGet("tetris");
    return "점수 " + state.score.toLocaleString() +
      "<br>라인 " + state.lines + " · Lv." + state.level +
      (hi ? "<br>BEST " + hi.toLocaleString() : "");
  }
  function tetrisLayout() {
    var W = state.W, H = state.H;
    // 보드를 화면의 대부분 차지 (약 3배 체감)
    // 사이드 패널은 좁게, 셀은 가능한 최대로
    var side = Math.min(Math.max(W * 0.16, 72), 110);
    var pad = 8;
    var maxBoardW = W - side - pad * 3;
    var maxBoardH = H - pad * 2;
    var cell = Math.floor(Math.min(maxBoardW / 10, maxBoardH / 20));
    cell = Math.max(cell, 18); // 최소 셀 크기 보장
    // 높이 우선: 세로로 거의 꽉
    var cellH = Math.floor(maxBoardH / 20);
    var cellW = Math.floor(maxBoardW / 10);
    cell = Math.min(cellH, cellW);
    // 가로가 남으면 셀을 더 키울 여지
    if (cell * 10 + side + pad * 3 < W * 0.98) {
      cell = Math.min(cellH, Math.floor((W - side - pad * 3) / 10));
    }
    var boardW = cell * 10;
    var boardH = cell * 20;
    var ox = Math.max(pad, Math.floor((W - boardW - side - pad) / 2));
    var oy = Math.floor((H - boardH) / 2);
    return { cell: cell, ox: ox, oy: oy, boardW: boardW, boardH: boardH, sideX: ox + boardW + 10 };
  }
  function tetrisFrame(dt) {
    var L = tetrisLayout();
    var W = state.W, H = state.H;
    var sx = 0, sy = 0;
    if (shake > 0) {
      sx = (Math.random() - 0.5) * shake * 6;
      sy = (Math.random() - 0.5) * shake * 6;
    }
    ctx.save();
    ctx.translate(sx, sy);

    // bg
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1018");
    g.addColorStop(1, "#121820");
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // court stripes
    ctx.fillStyle = "rgba(212,120,74,0.04)";
    for (var i = 0; i < 8; i++) ctx.fillRect(0, i * H / 8, W, 2);

    // board panel
    roundRect(ctx, L.ox - 6, L.oy - 6, L.boardW + 12, L.boardH + 12, 10);
    ctx.fillStyle = "#0d141c";
    ctx.fill();
    ctx.strokeStyle = "rgba(212,120,74,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // grid
    for (var y = 0; y < 20; y++) {
      for (var x = 0; x < 10; x++) {
        var px = L.ox + x * L.cell, py = L.oy + y * L.cell;
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.strokeRect(px, py, L.cell, L.cell);
        var cell = state.board[y][x];
        if (cell) drawCell(px, py, L.cell, cell.c, cell.w, 1);
      }
    }

    if (state.playing && state.piece && !state.over) {
      // ghost
      var gy = ghostY(state.board, state.piece);
      drawPiece(state.piece, L, gy, 0.22);
      drawPiece(state.piece, L, state.piece.y, 1);

      state.drop += dt;
      var interval = Math.max(0.08, 0.72 - (state.level - 1) * 0.055);
      if (state.soft) interval = 0.035;
      if (state.drop >= interval) {
        state.drop = 0;
        if (!collides(state.board, state.piece, 0, 1)) {
          state.piece.y++;
          if (state.soft) {
            state.score += 1;
            state.softTick = (state.softTick || 0) + 1;
            if (state.softTick % 2 === 0) sfx("soft");
          }
        } else lockPiece();
      }
    }

    // side panel
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, L.sideX, L.oy, W - L.sideX - 12, L.boardH, 10);
    ctx.fill();
    ctx.fillStyle = "#9aa3b2";
    ctx.font = "600 11px Instrument Sans, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", L.sideX + 10, L.oy + 22);
    if (state.next) {
      var nm = state.next.m;
      var ns = L.cell * 0.7;
      for (var y = 0; y < nm.length; y++) {
        for (var x = 0; x < nm[y].length; x++) {
          if (!nm[y][x]) continue;
          drawCell(L.sideX + 14 + x * ns, L.oy + 36 + y * ns, ns, state.next.color, state.next.word, 1);
        }
      }
    }
    ctx.fillStyle = "#9aa3b2";
    ctx.fillText("WORD", L.sideX + 10, L.oy + 130);
    ctx.fillStyle = "#e8a57a";
    ctx.font = "700 13px Instrument Sans, sans-serif";
    if (state.piece) ctx.fillText(state.piece.word, L.sideX + 10, L.oy + 152);

    ctx.fillStyle = "#6b7382";
    ctx.font = "500 10px Instrument Sans, sans-serif";
    ctx.fillText("HOLD C", L.sideX + 10, L.oy + 190);
    if (state.hold) {
      var hm = state.hold.m;
      var hs = L.cell * 0.55;
      for (var y = 0; y < hm.length; y++) {
        for (var x = 0; x < hm[y].length; x++) {
          if (!hm[y][x]) continue;
          drawCell(L.sideX + 14 + x * hs, L.oy + 200 + y * hs, hs, state.hold.color, "", 0.9);
        }
      }
    }

    updateFX(dt);
    drawFX(ctx);

    if (!state.playing && !state.over) {
      state.menuPulse += dt;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#eef1f5";
      ctx.font = "400 28px Instrument Serif, Georgia, serif";
      ctx.fillText("즐탁 테트리스", W / 2, H * 0.38);
      ctx.fillStyle = "#e8a57a";
      ctx.font = "600 14px Instrument Sans, sans-serif";
      ctx.fillText("블록에 새겨진 우리 방의 말들", W / 2, H * 0.45);
      ctx.fillStyle = "rgba(255,255,255," + (0.55 + Math.sin(state.menuPulse * 3) * 0.35) + ")";
      ctx.font = "600 13px Instrument Sans, sans-serif";
      ctx.fillText("탭 또는 「게임 시작」", W / 2, H * 0.56);
      ctx.fillStyle = "#6b7382";
      ctx.font = "500 12px Instrument Sans, sans-serif";
      ctx.fillText("BEST " + hiGet("tetris").toLocaleString(), W / 2, H * 0.62);
    }
    if (state.over) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#eef1f5";
      ctx.font = "400 26px Instrument Serif, Georgia, serif";
      ctx.fillText("게임 오버", W / 2, H * 0.4);
      ctx.fillStyle = "#d4784a";
      ctx.font = "700 20px Instrument Sans, sans-serif";
      ctx.fillText(state.score.toLocaleString() + "점", W / 2, H * 0.48);
      ctx.fillStyle = "#9aa3b2";
      ctx.font = "500 13px Instrument Sans, sans-serif";
      ctx.fillText("라인 " + state.lines + " · Lv." + state.level, W / 2, H * 0.54);
      ctx.fillText("다시 하려면 리셋 / 시작", W / 2, H * 0.62);
    }
    ctx.restore();
  }
  function drawPiece(p, L, atY, alpha) {
    for (var y = 0; y < p.m.length; y++) {
      for (var x = 0; x < p.m[y].length; x++) {
        if (!p.m[y][x]) continue;
        var py = atY + y;
        if (py < 0) continue;
        drawCell(L.ox + (p.x + x) * L.cell, L.oy + py * L.cell, L.cell, p.color, p.word, alpha);
      }
    }
  }
  function drawCell(px, py, cell, color, word, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    var pad = Math.max(1.5, cell * 0.05);
    var rr = Math.max(3, cell * 0.16);
    roundRect(ctx, px + pad, py + pad, cell - pad * 2, cell - pad * 2, rr);
    var g = ctx.createLinearGradient(px, py, px + cell, py + cell);
    g.addColorStop(0, shade(color, 40));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -25));
    ctx.fillStyle = g;
    ctx.fill();
    // inner gloss
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, px + pad + 2, py + pad + 2, cell - pad * 2 - 4, Math.max(3, cell * 0.28), rr * 0.6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1.5, cell * 0.04);
    roundRect(ctx, px + pad, py + pad, cell - pad * 2, cell - pad * 2, rr);
    ctx.stroke();
    // 탁구공 하이라이트
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.arc(px + cell * 0.7, py + cell * 0.28, Math.max(2.5, cell * 0.11), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.arc(px + cell * 0.7, py + cell * 0.28, Math.max(2.5, cell * 0.11), 0, Math.PI * 2);
    ctx.stroke();
    if (word && cell > 14) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.font = "800 " + Math.max(9, Math.floor(cell * 0.26)) + "px Instrument Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, px + cell / 2 + 0.5, py + cell * 0.58 + 0.5);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(word, px + cell / 2, py + cell * 0.58);
      ctx.textBaseline = "alphabetic";
    }
    ctx.globalAlpha = 1;
  }
  function shade(hex, amt) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var n = parseInt(c, 16);
    var r = clamp(((n >> 16) & 255) + amt, 0, 255);
    var g = clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = clamp((n & 255) + amt, 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function lockPiece() {
    merge(state.board, state.piece);
    sfx("lock");
    var L = tetrisLayout();
    var cx = L.ox + (state.piece.x + 1.5) * L.cell;
    var cy = L.oy + (state.piece.y + 1) * L.cell;
    burst(cx, cy, 8, state.piece.color, 80);
    clearLines();
    state.piece = state.next;
    state.next = newBag();
    state.holdUsed = false;
    state.piece.x = 3; state.piece.y = 0;
    if (collides(state.board, state.piece, 0, 0)) {
      state.over = true;
      state.playing = false;
      stopTetrisBgm();
      sfx("gameover");
      shake = 1.2;
      hiSet("tetris", state.score);
      setScore(hudTetris() + "<br>게임 오버");
      refreshHi();
    }
  }
  function clearLines() {
    var full = [];
    for (var y = 0; y < 20; y++) {
      var ok = true;
      for (var x = 0; x < 10; x++) if (!state.board[y][x]) { ok = false; break; }
      if (ok) full.push(y);
    }
    if (!full.length) { state.combo = 0; return; }
    var L = tetrisLayout();
    full.forEach(function (y) {
      for (var x = 0; x < 10; x++) {
        var cell = state.board[y][x];
        var px = L.ox + (x + 0.5) * L.cell;
        var py = L.oy + (y + 0.5) * L.cell;
        burst(px, py, 18, cell ? cell.c : "#d4784a", 220);
        burst(px, py, 8, "#ffffff", 280);
        burst(px, py, 6, pick(EXTRA_COLORS), 200);
      }
    });
    // remove lines
    full.sort(function (a, b) { return b - a; });
    full.forEach(function (y) {
      state.board.splice(y, 1);
      var row = [];
      for (var i = 0; i < 10; i++) row.push(null);
      state.board.unshift(row);
    });
    var n = full.length;
    state.combo++;
    var base = [0, 100, 300, 500, 800][n] || 800;
    var add = (base * state.level) + (state.combo - 1) * 50;
    state.score += add;
    state.lines += n;
    state.level = 1 + Math.floor(state.lines / 10);
    shake = 0.35 + n * 0.25;
    flash = 0.35 + n * 0.15;
    var labels = ["", "드라이브!", "투핸드!", "트리플 랠리!", "테트리스 스매시!!"];
    var cx = L.ox + L.boardW / 2, cy = L.oy + L.boardH * 0.4;
    floatText(cx, cy, labels[n] || "클리어!", "#e8a57a");
    if (state.combo > 1) floatText(cx, cy + 24, "COMBO x" + state.combo, "#5ec8d6");
    if (n >= 4) { sfx("tetris"); sfx("smash"); }
    else if (n >= 2) { sfx("pang"); sfx("clear2"); }
    else { sfx("pop"); sfx("clear1"); }
    if (n >= 3) sfx("smash");
    setScore(hudTetris());
    hiSet("tetris", state.score);
  }
  function tetrisMove(dx) {
    if (!state.playing || state.over) return;
    if (!collides(state.board, state.piece, dx, 0)) {
      state.piece.x += dx;
      sfx("move");
    }
  }
  function tetrisRot() {
    if (!state.playing || state.over) return;
    var m = rotateM(state.piece.m);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(state.board, state.piece, kicks[i], 0, m)) {
        state.piece.m = m;
        state.piece.x += kicks[i];
        sfx("rot");
        return;
      }
    }
  }
  function tetrisSoft(on) { state.soft = on; }
  function tetrisHard() {
    if (!state.playing || state.over) return;
    var d = 0;
    while (!collides(state.board, state.piece, 0, 1)) { state.piece.y++; d++; }
    state.score += d * 2;
    sfx("drop");
    shake = 0.25;
    lockPiece();
    setScore(hudTetris());
  }
  function tetrisHold() {
    if (!state.playing || state.over || state.holdUsed) return;
    state.holdUsed = true;
    if (!state.hold) {
      state.hold = { type: state.piece.type, m: SHAPES[state.piece.type].map(function (r) { return r.slice(); }), color: state.piece.color, word: state.piece.word, x: 3, y: 0 };
      state.piece = state.next;
      state.next = newBag();
    } else {
      var tmp = state.hold;
      state.hold = { type: state.piece.type, m: SHAPES[state.piece.type].map(function (r) { return r.slice(); }), color: state.piece.color, word: state.piece.word, x: 3, y: 0 };
      state.piece = tmp;
      state.piece.x = 3; state.piece.y = 0;
    }
    sfx("move");
  }

  // ═══════════ TD PREMIUM ═══════════════════════════
  function initTD() {
    state.mode = "td";
    state.cols = 9; state.rows = 6;
    state.grid = new Array(state.cols * state.rows).fill(0);
    state.balls = [];
    state.shots = [];
    state.money = 50;
    state.lives = 12;
    state.wave = 0;
    state.waveLeft = 0;
    state.spawnT = 0;
    state.pathR = 2;
    setScore(tdHud());
    loop(function (dt) {
      var W = state.W, H = state.H;
      var cols = state.cols, rows = state.rows;
      var gw = W / cols, gh = H / rows;
      ctx.fillStyle = "#0b1118";
      ctx.fillRect(0, 0, W, H);
      // table lane
      ctx.fillStyle = "rgba(26,61,46,0.55)";
      ctx.fillRect(0, state.pathR * gh, W, gh);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, state.pathR * gh + 4, W - 8, gh - 8);
      ctx.beginPath();
      ctx.moveTo(W / 2, state.pathR * gh + 4);
      ctx.lineTo(W / 2, (state.pathR + 1) * gh - 4);
      ctx.stroke();

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * gw, y = r * gh;
          if (r !== state.pathR) {
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.strokeRect(x + 2, y + 2, gw - 4, gh - 4);
          }
          var g = state.grid[r * cols + c];
          if (g) {
            // premium paddle
            ctx.save();
            ctx.translate(x + gw / 2, y + gh / 2);
            ctx.rotate(-0.5);
            var grd = ctx.createLinearGradient(-12, -16, 12, 16);
            grd.addColorStop(0, "#e8a57a");
            grd.addColorStop(1, "#d4784a");
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.ellipse(0, 0, gw * 0.2, gh * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#c9a07a";
            ctx.fillRect(-3, gh * 0.18, 6, gh * 0.22);
            ctx.restore();
            // range ring faint
            ctx.strokeStyle = "rgba(212,120,74,0.12)";
            ctx.beginPath();
            ctx.arc(x + gw / 2, y + gh / 2, Math.max(gw, gh) * 1.2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      if (state.waveLeft > 0) {
        state.spawnT -= dt;
        if (state.spawnT <= 0) {
          state.spawnT = Math.max(0.28, 0.6 - state.wave * 0.02);
          state.waveLeft--;
          var hp = 2 + state.wave * 0.85;
          state.balls.push({ t: 0, hp: hp, max: hp, spin: Math.random() * 6 });
        }
      }

      for (var b = state.balls.length - 1; b >= 0; b--) {
        var ball = state.balls[b];
        ball.t += dt * (0.32 + state.wave * 0.025);
        ball.spin += dt * 8;
        if (ball.t >= cols - 0.01) {
          state.balls.splice(b, 1);
          state.lives--;
          sfx("hit");
          shake = 0.5;
          if (state.lives <= 0) setScore("방어 실패 · 웨이브 " + state.wave);
          continue;
        }
        var bx = (ball.t + 0.5) * gw;
        var by = (state.pathR + 0.5) * gh + Math.sin(ball.spin) * 3;

        // towers fire
        for (var ti = 0; ti < state.grid.length; ti++) {
          if (!state.grid[ti]) continue;
          var tr = (ti / cols) | 0, tc = ti % cols;
          var tx = (tc + 0.5) * gw, ty = (tr + 0.5) * gh;
          var dx = bx - tx, dy = by - ty;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var range = Math.max(gw, gh) * 1.35;
          if (dist < range) {
            ball.hp -= dt * (1.8 + state.grid[ti] * 0.4);
            if (Math.random() < dt * 8) {
              state.shots.push({ x: tx, y: ty, tx: bx, ty: by, life: 0.08 });
            }
          }
        }
        if (ball.hp <= 0) {
          burst(bx, by, 14, "#d4784a", 180);
          floatText(bx, by - 10, "+8", "#e8a57a");
          state.balls.splice(b, 1);
          state.money += 8;
          sfx("coin");
          continue;
        }
        // ball
        ctx.beginPath();
        ctx.fillStyle = "#f4f6f8";
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d4784a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(bx - 12, by - 18, 24, 4);
        ctx.fillStyle = "#5d9b7b";
        ctx.fillRect(bx - 12, by - 18, 24 * (ball.hp / ball.max), 4);
      }
      for (var s = state.shots.length - 1; s >= 0; s--) {
        var sh = state.shots[s];
        sh.life -= dt;
        ctx.strokeStyle = "rgba(232,165,122," + clamp(sh.life * 10, 0, 0.8) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.tx, sh.ty);
        ctx.stroke();
        if (sh.life <= 0) state.shots.splice(s, 1);
      }
      updateFX(dt);
      drawFX(ctx);
      if (state.lives > 0) setScore(tdHud());
    });
    wrap._tdClick = function (mx, my) {
      if (state.lives <= 0) return;
      var c = (mx / (state.W / state.cols)) | 0;
      var r = (my / (state.H / state.rows)) | 0;
      if (r === state.pathR) return;
      var idx = r * state.cols + c;
      if (state.grid[idx]) {
        // upgrade
        if (state.money >= 20 && state.grid[idx] < 3) {
          state.money -= 20;
          state.grid[idx]++;
          sfx("coin");
          floatText(mx, my, "강화!", "#5ec8d6");
        }
        return;
      }
      if (state.money < 15) {
        floatText(mx, my, "코인 부족", "#e07a7a");
        return;
      }
      state.grid[idx] = 1;
      state.money -= 15;
      sfx("lock");
      burst(mx, my, 8, "#d4784a", 100);
    };
  }
  function tdHud() {
    return "코인 " + state.money + " · 라이프 " + state.lives + " · W" + state.wave +
      (state.waveLeft ? " (" + state.waveLeft + ")" : "");
  }
  function tdWave() {
    if (state.lives <= 0) { initTD(); return; }
    state.wave++;
    state.waveLeft = 7 + state.wave * 3;
    state.spawnT = 0;
    sfx("clear1");
    floatText(state.W / 2, state.H * 0.2, "WAVE " + state.wave, "#e8a57a");
    setScore(tdHud());
  }

  // ═══════════ RUNNER PREMIUM ═══════════════════════
  function initRunner() {
    state.mode = "runner";
    state.y = 0; state.vy = 0; state.ground = true;
    state.speed = 240; state.dist = 0; state.obs = [];
    state.dead = false; state.spawn = 0; state.coins = 0;
    state.trail = [];
    setScore("0m");
    loop(function (dt) {
      var W = state.W, H = state.H;
      var groundY = H * 0.74;
      if (!state.dead) {
        state.dist += state.speed * dt * 0.06;
        state.speed = Math.min(480, 240 + state.dist * 0.9);
        state.spawn -= dt;
        if (state.spawn <= 0) {
          state.spawn = 0.9 + Math.random() * 0.7;
          var kind = Math.random();
          state.obs.push({
            x: W + 30,
            w: kind > 0.7 ? 40 : 16 + Math.random() * 14,
            h: kind > 0.7 ? 22 : 30 + Math.random() * 40,
            kind: kind > 0.7 ? "table" : kind > 0.35 ? "net" : "cone"
          });
        }
        state.vy += 1700 * dt;
        state.y += state.vy * dt;
        if (state.y >= 0) { state.y = 0; state.vy = 0; state.ground = true; }
        else state.ground = false;
      }
      // bg layers
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(0, 0, W, H);
      var scroll = state.dist * 10;
      ctx.fillStyle = "rgba(212,120,74,0.05)";
      for (var i = 0; i < 6; i++) {
        var bx = ((i * 120 - scroll * 0.3) % (W + 120));
        if (bx < 0) bx += W + 120;
        ctx.fillRect(bx, H * 0.35, 50, H * 0.2);
      }
      ctx.fillStyle = "#151c26";
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.fillStyle = "#d4784a";
      ctx.fillRect(0, groundY, W, 3);

      var px = W * 0.2;
      var py = groundY - 18 + state.y;
      state.trail.push({ x: px, y: py, life: 0.35 });
      for (var t = state.trail.length - 1; t >= 0; t--) {
        state.trail[t].life -= dt;
        if (state.trail[t].life <= 0) state.trail.splice(t, 1);
        else {
          ctx.globalAlpha = state.trail[t].life;
          ctx.fillStyle = "#d4784a";
          ctx.beginPath();
          ctx.arc(state.trail[t].x - 8, state.trail[t].y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // player
      ctx.save();
      ctx.translate(px, py);
      var tilt = state.ground ? 0 : -0.25;
      ctx.rotate(tilt);
      var grd = ctx.createLinearGradient(-10, -24, 10, 10);
      grd.addColorStop(0, "#e8a57a");
      grd.addColorStop(1, "#d4784a");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, -16, 11, 17, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c9a07a";
      ctx.fillRect(-3, -2, 6, 14);
      ctx.fillStyle = "#f4f6f8";
      ctx.beginPath();
      ctx.arc(14, -20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (var i = state.obs.length - 1; i >= 0; i--) {
        var o = state.obs[i];
        if (!state.dead) o.x -= state.speed * dt;
        if (o.x < -50) { state.obs.splice(i, 1); state.coins++; continue; }
        var oy = groundY - o.h;
        if (o.kind === "net") {
          ctx.strokeStyle = "#a8b0bc";
          ctx.lineWidth = 1.5;
          for (var ny = 0; ny < o.h; ny += 5) {
            ctx.beginPath();
            ctx.moveTo(o.x, groundY - ny);
            ctx.lineTo(o.x + o.w, groundY - ny - 2);
            ctx.stroke();
          }
          ctx.strokeStyle = "#eef1f5";
          ctx.strokeRect(o.x, oy, o.w, o.h);
        } else if (o.kind === "table") {
          ctx.fillStyle = "#1a3d2e";
          ctx.fillRect(o.x, oy, o.w, o.h);
          ctx.strokeStyle = "#fff";
          ctx.strokeRect(o.x, oy, o.w, o.h);
        } else {
          ctx.fillStyle = "#d4784a";
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, oy);
          ctx.lineTo(o.x + o.w, groundY);
          ctx.lineTo(o.x, groundY);
          ctx.closePath();
          ctx.fill();
        }
        if (!state.dead) {
          var pr = 13;
          if (px + pr > o.x && px - pr < o.x + o.w && py + 6 > oy) {
            state.dead = true;
            sfx("gameover");
            shake = 1;
            burst(px, py, 20, "#d4784a", 200);
            hiSet("runner", Math.floor(state.dist));
            setScore("OUT " + Math.floor(state.dist) + "m · 다시 시작");
          }
        }
      }
      updateFX(dt);
      drawFX(ctx);
      if (!state.dead) setScore(Math.floor(state.dist) + "m · 속도 " + Math.floor(state.speed) + "<br>BEST " + hiGet("runner") + "m");
    });
    wrap._runnerJump = function () {
      if (state.dead) { initRunner(); return; }
      if (state.ground) {
        state.vy = -640;
        state.ground = false;
        sfx("jump");
      }
    };
  }

  // ═══════════ VISUALS ══════════════════════════════
  function initKaleido() {
    state.mode = "kaleido";
    state.segs = 12;
    state.hue = 22;
    state.trails = [];
    state.t = 0;
    loop(function (dt) {
      state.t += dt;
      var W = state.W, H = state.H, cx = W / 2, cy = H / 2;
      ctx.fillStyle = "rgba(6,9,14,0.2)";
      ctx.fillRect(0, 0, W, H);
      if (pointer.down) state.trails.push({ x: pointer.x - cx, y: pointer.y - cy, life: 1, h: state.hue });
      for (var i = 0; i < 5; i++) {
        var a = state.t * (0.7 + i * 0.15) + i;
        state.trails.push({
          x: Math.cos(a) * (50 + i * 22) + Math.sin(a * 2.1) * 12,
          y: Math.sin(a * 1.2) * (40 + i * 18),
          life: 0.7, h: state.hue + i * 12
        });
      }
      ctx.save();
      ctx.translate(cx, cy);
      for (var s = 0; s < state.segs; s++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * s) / state.segs);
        if (s % 2) ctx.scale(1, -1);
        state.trails.forEach(function (p) {
          ctx.beginPath();
          ctx.fillStyle = "hsla(" + p.h + ",82%,62%," + (0.2 + p.life * 0.7) + ")";
          ctx.arc(p.x, p.y, 3 + p.life * 7, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      ctx.restore();
      state.trails = state.trails.map(function (p) {
        return { x: p.x, y: p.y, life: p.life - dt * 0.5, h: p.h };
      }).filter(function (p) { return p.life > 0; }).slice(-220);
      ctx.beginPath();
      ctx.fillStyle = "#f4f6f8";
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4784a";
      ctx.lineWidth = 2;
      ctx.stroke();
      setScore("세그먼트 " + state.segs + " · 드래그로 페인팅");
    });
  }
  function initDrum() {
    state.mode = "drum";
    state.pads = [
      { n: "드라이브", f: 210, t: "sawtooth" },
      { n: "스매시", f: 95, t: "square" },
      { n: "커트", f: 520, t: "triangle" },
      { n: "서브", f: 160, t: "sine" },
      { n: "엣지", f: 920, t: "square" },
      { n: "테이블", f: 65, t: "triangle" },
      { n: "스코어", f: 700, t: "sine" },
      { n: "함성", f: 340, t: "sawtooth" }
    ];
    state.flash = [0,0,0,0,0,0,0,0];
    state.beat = false; state.seq = 0; state.step = 0;
    state.pattern = [0, 5, 2, 5, 1, 5, 3, 5];
    setScore("패드를 탭하세요");
    loop(function (dt) {
      var W = state.W, H = state.H;
      ctx.fillStyle = "#090d13";
      ctx.fillRect(0, 0, W, H);
      var cols = 4, rows = 2, pw = W / cols, ph = H / rows;
      for (var i = 0; i < 8; i++) {
        var c = i % 4, r = (i / 4) | 0;
        var x = c * pw, y = r * ph;
        state.flash[i] = Math.max(0, state.flash[i] - dt * 2.8);
        var fl = state.flash[i];
        roundRect(ctx, x + 10, y + 10, pw - 20, ph - 20, 16);
        var grd = ctx.createLinearGradient(x, y, x, y + ph);
        grd.addColorStop(0, fl > 0 ? "rgba(212,120,74," + (0.45 + fl * 0.4) + ")" : "#161c26");
        grd.addColorStop(1, fl > 0 ? "rgba(180,90,50," + (0.35 + fl * 0.3) + ")" : "#10151c");
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.strokeStyle = "rgba(232,165,122,0.3)";
        ctx.stroke();
        ctx.fillStyle = "#eef1f5";
        ctx.font = "700 14px Instrument Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(state.pads[i].n, x + pw / 2, y + ph / 2 + 5);
      }
      if (state.beat) {
        state.seq += dt;
        if (state.seq >= 0.24) {
          state.seq = 0;
          hitPad(state.pattern[state.step % state.pattern.length]);
          state.step++;
        }
      }
    });
    wrap._drumClick = function (mx, my) {
      var c = (mx / (state.W / 4)) | 0;
      var r = (my / (state.H / 2)) | 0;
      var i = r * 4 + c;
      if (i >= 0 && i < 8) hitPad(i);
    };
  }
  function hitPad(i) {
    var p = state.pads[i];
    state.flash[i] = 1;
    tone(p.f, 0.1, p.t, 0.13, p.f * 0.7);
    if (i === 1) tone(60, 0.14, "square", 0.1);
    setScore(p.n);
  }
  function initGlobe() {
    state.mode = "globe";
    state.yaw = 0.5; state.pitch = 0.2; state.auto = true;
    state.nodes = [
      { name: "세종", lat: 36.48, lon: 127.28, local: 1 },
      { name: "서울", lat: 37.57, lon: 126.98 },
      { name: "도쿄", lat: 35.68, lon: 139.69 },
      { name: "베이징", lat: 39.9, lon: 116.4 },
      { name: "베를린", lat: 52.52, lon: 13.4 },
      { name: "파리", lat: 48.86, lon: 2.35 },
      { name: "런던", lat: 51.5, lon: -0.12 },
      { name: "뉴욕", lat: 40.71, lon: -74 },
      { name: "상파울루", lat: -23.55, lon: -46.63 },
      { name: "케이프타운", lat: -33.92, lon: 18.42 }
    ];
    loop(function (dt) {
      if (state.auto) state.yaw += dt * 0.32;
      if (pointer.down && state._lx != null) {
        state.yaw += (pointer.x - state._lx) * 0.01;
        state.pitch = clamp(state.pitch + (pointer.y - state._ly) * 0.008, -1.1, 1.1);
        state.auto = false;
      }
      state._lx = pointer.x; state._ly = pointer.y;
      var W = state.W, H = state.H, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
      ctx.fillStyle = "#060910";
      ctx.fillRect(0, 0, W, H);
      for (var s = 0; s < 50; s++) {
        ctx.fillStyle = "rgba(255,255,255," + (0.15 + (s % 5) * 0.05) + ")";
        ctx.fillRect((s * 89) % W, (s * 47) % H, 1.5, 1.5);
      }
      var grd = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
      grd.addColorStop(0, "#3a4f68");
      grd.addColorStop(0.55, "#1a2a3d");
      grd.addColorStop(1, "#0a121c");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = "rgba(212,120,74,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      for (var lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        var first = true;
        for (var lon = -180; lon <= 180; lon += 6) {
          var p = project(lat, lon, R, cx, cy, state.yaw, state.pitch);
          if (!p || p.z < -0.05) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      state.nodes.forEach(function (n) {
        var p = project(n.lat, n.lon, R, cx, cy, state.yaw, state.pitch);
        if (!p || p.z < 0) return;
        ctx.beginPath();
        ctx.fillStyle = n.local ? "#d4784a" : "#e8a57a";
        ctx.arc(p.x, p.y, n.local ? 6 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        if (n.local) {
          ctx.fillStyle = "#eef1f5";
          ctx.font = "600 12px Instrument Sans, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("세종 탁구방", p.x + 10, p.y + 4);
          ctx.beginPath();
          ctx.strokeStyle = "rgba(212,120,74,0.35)";
          ctx.arc(p.x, p.y, 12 + (performance.now() / 200) % 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      setScore("세종 하이라이트 · 드래그 회전");
    });
  }
  function project(lat, lon, R, cx, cy, yaw, pitch) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180 + yaw;
    var x = Math.cos(la) * Math.sin(lo);
    var y = Math.sin(la);
    var z = Math.cos(la) * Math.cos(lo);
    var y2 = y * Math.cos(pitch) - z * Math.sin(pitch);
    var z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
    return { x: cx + x * R, y: cy - y2 * R, z: z2 };
  }
  function initParticles() {
    state.mode = "particles";
    state.parts = [];
    for (var i = 0; i < 110; i++) {
      state.parts.push({
        x: Math.random(), y: Math.random(),
        vx: rand(-0.1, 0.1), vy: rand(-0.1, 0.1),
        r: 2 + Math.random() * 4
      });
    }
    loop(function (dt) {
      var W = state.W, H = state.H;
      ctx.fillStyle = "rgba(8,11,16,0.4)";
      ctx.fillRect(0, 0, W, H);
      var mx = pointer.x, my = pointer.y;
      state.parts.forEach(function (p) {
        var px = p.x * W, py = p.y * H;
        var dx = mx - px, dy = my - py;
        var d2 = dx * dx + dy * dy + 50;
        var f = pointer.down ? 2200 : 500;
        p.vx += (dx / d2) * f * dt * 0.001;
        p.vy += (dy / d2) * f * dt * 0.001;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x = clamp(p.x + p.vx * dt, 0, 1);
        p.y = clamp(p.y + p.vy * dt, 0, 1);
        if (p.x === 0 || p.x === 1) p.vx *= -0.8;
        if (p.y === 0 || p.y === 1) p.vy *= -0.8;
        px = p.x * W; py = p.y * H;
        ctx.beginPath();
        ctx.fillStyle = "#f0f2f5";
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(212,120,74,0.55)";
        ctx.stroke();
      });
      ctx.strokeStyle = "rgba(232,165,122,0.08)";
      for (var i = 0; i < state.parts.length; i++) {
        for (var j = i + 1; j < i + 12 && j < state.parts.length; j++) {
          var a = state.parts[i], b = state.parts[j];
          var dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
          if (dx * dx + dy * dy < 4200) {
            ctx.beginPath();
            ctx.moveTo(a.x * W, a.y * H);
            ctx.lineTo(b.x * W, b.y * H);
            ctx.stroke();
          }
        }
      }
      setScore("입자 " + state.parts.length + " · 터치로 중력");
    });
  }
  function initRipple() {
    state.mode = "ripple";
    var N = 72;
    state.N = N;
    state.buf = new Float32Array(N * N);
    state.buf2 = new Float32Array(N * N);
    state.balls = [];
    loop(function (dt) {
      var N = state.N, b = state.buf, b2 = state.buf2;
      for (var y = 1; y < N - 1; y++) {
        for (var x = 1; x < N - 1; x++) {
          var i = y * N + x;
          var v = (b[i - 1] + b[i + 1] + b[i - N] + b[i + N]) * 0.5 - b2[i];
          b2[i] = v * 0.988;
        }
      }
      var tmp = state.buf; state.buf = state.buf2; state.buf2 = tmp;
      b = state.buf;
      var W = state.W, H = state.H;
      ctx.fillStyle = "#143528";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(W * 0.08, H * 0.14, W * 0.84, H * 0.72);
      ctx.beginPath();
      ctx.moveTo(W / 2, H * 0.14);
      ctx.lineTo(W / 2, H * 0.86);
      ctx.stroke();
      var cellW = W / N, cellH = H / N;
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var v = b[y * N + x];
          if (Math.abs(v) < 0.025) continue;
          var a = Math.min(0.55, Math.abs(v) * 0.35);
          ctx.fillStyle = v > 0 ? "rgba(255,255,255," + a + ")" : "rgba(0,30,20," + a + ")";
          ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
        }
      }
      for (var i = state.balls.length - 1; i >= 0; i--) {
        var ball = state.balls[i];
        ball.vy += 420 * dt;
        ball.y += ball.vy * dt;
        ball.x += ball.vx * dt;
        ctx.beginPath();
        ctx.fillStyle = "#f4f6f8";
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d4784a";
        ctx.stroke();
        if (ball.y > H * 0.82) {
          splash(ball.x, ball.y, 4.5);
          burst(ball.x, ball.y, 12, "#e8a57a", 120);
          state.balls.splice(i, 1);
          sfx("hit");
        }
      }
      updateFX(dt); drawFX(ctx);
      setScore("탭 = 리플 · 공 드롭 가능");
    });
    wrap._rippleClick = function (mx, my) {
      splash(mx, my, 6);
      sfx("move");
    };
  }
  function splash(px, py, force) {
    var N = state.N;
    var x = (px / state.W * N) | 0;
    var y = (py / state.H * N) | 0;
    for (var dy = -3; dy <= 3; dy++) {
      for (var dx = -3; dx <= 3; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx > 0 && xx < N - 1 && yy > 0 && yy < N - 1) {
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 3.2) state.buf[yy * N + xx] += force * (1 - d / 3.2);
        }
      }
    }
  }

  // ═══════════ BIO / MEME ═══════════════════════════
  function initBio() {
    stopLoop();
    state.mode = "bio";
    wrap.style.display = "none";
    formHost.style.display = "grid";
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("pp_bio") || "{}"); } catch (e) {}
    formHost.innerHTML =
      "<label>닉네임</label><input id=\"bioN\" value=\"" + esc(saved.n || "음악시간미술시간") + "\">" +
      "<label>동 · 부수</label><input id=\"bioB\" value=\"" + esc(saved.b || "집현동 · 8부") + "\">" +
      "<label>스타일</label><select id=\"bioS\">" +
      ["드라이브형","수비형","코스형","복식형"].map(function (v) {
        return "<option" + (saved.s === v ? " selected" : "") + ">" + v + "</option>";
      }).join("") +
      "</select>" +
      "<label>모토</label><textarea id=\"bioM\">" + esc(saved.m || "즐탁이 최고 · 오늘도 한 판") + "</textarea>" +
      "<div class=\"bio-card-preview\" id=\"bioPrev\"></div>";
    function render() {
      var n = $("bioN").value.trim() || "플레이어";
      var b = $("bioB").value.trim();
      var s = $("bioS").value;
      var m = $("bioM").value.trim();
      $("bioPrev").innerHTML = "<div class=\"tag\">SEJONG TABLE TENNIS</div><h4>" + esc(n) +
        "</h4><div class=\"meta\">" + esc(b) + " · " + esc(s) + "</div><div class=\"motto\">“" + esc(m) + "”</div>";
      localStorage.setItem("pp_bio", JSON.stringify({ n: n, b: b, s: s, m: m }));
      setScore(n + " 카드 준비");
    }
    ["bioN","bioB","bioS","bioM"].forEach(function (id) {
      $(id).addEventListener("input", render);
      $(id).addEventListener("change", render);
    });
    render();
  }
  function saveBio() {
    wrap.style.display = "block"; formHost.style.display = "none";
    sizeCanvas();
    var data = {};
    try { data = JSON.parse(localStorage.getItem("pp_bio") || "{}"); } catch (e) {}
    var W = state.W, H = state.H;
    ctx.fillStyle = "#12171f";
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W, 0, 0, W * 0.6, 0, W);
    g.addColorStop(0, "rgba(212,120,74,0.4)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8a57a";
    ctx.font = "600 13px Instrument Sans, sans-serif";
    ctx.fillText("SEJONG TABLE TENNIS", 36, 56);
    ctx.fillStyle = "#eef1f5";
    ctx.font = "400 40px Instrument Serif, Georgia, serif";
    ctx.fillText(data.n || "플레이어", 36, 112);
    ctx.fillStyle = "#9aa3b2";
    ctx.font = "500 16px Instrument Sans, sans-serif";
    ctx.fillText((data.b || "") + "  ·  " + (data.s || ""), 36, 150);
    ctx.fillStyle = "#eef1f5";
    ctx.font = "italic 20px Instrument Serif, Georgia, serif";
    ctx.fillText("“" + (data.m || "즐탁") + "”", 36, 210);
    ctx.beginPath();
    ctx.fillStyle = "#f4f6f8";
    ctx.arc(W - 64, H - 64, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4784a";
    ctx.lineWidth = 3;
    ctx.stroke();
    download("sejong-player-card.png");
    setScore("카드 저장 완료");
    setTimeout(function () { wrap.style.display = "none"; formHost.style.display = "grid"; }, 500);
  }
  function initMeme() {
    stopLoop();
    state.mode = "meme";
    wrap.style.display = "block";
    formHost.style.display = "grid";
    formHost.innerHTML =
      "<label>위 문구</label><input id=\"memeTop\" value=\"오늘 조탁 각?\" maxlength=\"36\">" +
      "<label>아래 문구</label><input id=\"memeBot\" value=\"즐탁이 답이다\" maxlength=\"36\">" +
      "<label>배경</label><select id=\"memeBg\"><option value=\"court\">탁구대</option><option value=\"night\">야간 코트</option><option value=\"orange\">오렌지 매치</option></select>";
    function prev() { sizeCanvas(); drawMeme(); }
    ["memeTop","memeBot","memeBg"].forEach(function (id) {
      $(id).addEventListener("input", prev);
      $(id).addEventListener("change", prev);
    });
    setTimeout(prev, 40);
    setScore("문구 수정 후 PNG 저장");
  }
  function drawMeme() {
    var top = ($("memeTop") && $("memeTop").value) || "";
    var bot = ($("memeBot") && $("memeBot").value) || "";
    var bg = ($("memeBg") && $("memeBg").value) || "court";
    var W = state.W, H = state.H;
    if (bg === "night") {
      ctx.fillStyle = "#0a0d12"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#152030"; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    } else if (bg === "orange") {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#3a2218"); g.addColorStop(1, "#d4784a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = "#163528"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3;
      ctx.strokeRect(W * 0.1, H * 0.28, W * 0.8, H * 0.44);
      ctx.beginPath(); ctx.moveTo(W / 2, H * 0.28); ctx.lineTo(W / 2, H * 0.72); ctx.stroke();
    }
    ctx.beginPath(); ctx.fillStyle = "#f4f6f8"; ctx.arc(W * 0.7, H * 0.45, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d4784a";
    ctx.beginPath(); ctx.ellipse(W * 0.32, H * 0.5, 14, 22, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000"; ctx.fillStyle = "#fff";
    ctx.font = "700 " + Math.floor(W * 0.07) + "px Impact, Haettenschweiler, sans-serif";
    ctx.lineWidth = Math.max(3, W * 0.012);
    ctx.strokeText(top.toUpperCase(), W / 2, H * 0.14);
    ctx.fillText(top.toUpperCase(), W / 2, H * 0.14);
    ctx.strokeText(bot.toUpperCase(), W / 2, H * 0.92);
    ctx.fillText(bot.toUpperCase(), W / 2, H * 0.92);
  }
  function download(name) {
    try {
      var a = document.createElement("a");
      a.download = name || "sejong.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) {}
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function initGame(id) {
    stopLoop();
    particles = []; floats = [];
    state = { W: state.W || 800, H: state.H || 600 };
    pointer.down = false;
    wrap.style.display = "block";
    sizeCanvas();
    if (id === "tetris") initTetris(false);
    else if (id === "td") initTD();
    else if (id === "runner") initRunner();
    else if (id === "kaleido") initKaleido();
    else if (id === "drum") initDrum();
    else if (id === "globe") initGlobe();
    else if (id === "particles") initParticles();
    else if (id === "ripple") initRipple();
    else if (id === "bio") initBio();
    else if (id === "meme") initMeme();
  }

  function onAction() {
    ensureAudio();
    if (!current) return;
    if (current === "tetris") {
      if (!state.playing || state.over) initTetris(true);
      else tetrisHard();
    } else if (current === "td") tdWave();
    else if (current === "runner") { if (state.dead) initRunner(); else if (wrap._runnerJump) wrap._runnerJump(); }
    else if (current === "kaleido") { state.hue = (state.hue + 48) % 360; state.segs = state.segs === 12 ? 8 : state.segs === 8 ? 16 : 12; }
    else if (current === "drum") {
      state.beat = !state.beat; state.step = 0;
      $("playAction").textContent = state.beat ? "정지" : "비트 토글";
      setScore(state.beat ? "비트 ON" : "비트 OFF");
    } else if (current === "globe") { state.auto = !state.auto; setScore(state.auto ? "자동 회전" : "드래그 모드"); }
    else if (current === "particles") {
      state.parts.forEach(function (p) { p.vx += rand(-2, 2); p.vy += rand(-2, 2); });
      sfx("smash"); setScore("폭발!");
    } else if (current === "ripple") {
      state.balls.push({ x: state.W * rand(0.3, 0.7), y: 16, vx: rand(-50, 50), vy: 0 });
    } else if (current === "bio") saveBio();
    else if (current === "meme") { sizeCanvas(); drawMeme(); download("sejong-meme.png"); setScore("밈 저장됨"); }
  }
  function onReset() { if (current) initGame(current); }

  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e;
    return { x: ((t.clientX - r.left) / r.width) * state.W, y: ((t.clientY - r.top) / r.height) * state.H };
  }
  function bind() {
    canvas = $("playCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    wrap = $("playCanvasWrap");
    stage = $("playStage");
    grid = $("playGrid");
    titleEl = $("playTitle");
    hintEl = $("playHint");
    scoreEl = $("playScore");
    formHost = $("playFormHost");
    toolbar = $("playToolbar");
    padEl = $("playPad");

    document.querySelectorAll("[data-play]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ensureAudio();
        showStage(btn.getAttribute("data-play"));
      });
    });
    $("playClose").addEventListener("click", hideStage);
    $("playAction").addEventListener("click", onAction);
    $("playReset").addEventListener("click", onReset);

    if (padEl) {
      padEl.querySelectorAll("[data-pad]").forEach(function (b) {
        var act = b.getAttribute("data-pad");
        var holdTimer = null;
        b.addEventListener("touchstart", function (e) {
          e.preventDefault();
          ensureAudio();
          if (act === "left") tetrisMove(-1);
          else if (act === "right") tetrisMove(1);
          else if (act === "rot") tetrisRot();
          else if (act === "soft") tetrisSoft(true);
          else if (act === "hard") tetrisHard();
        }, { passive: false });
        b.addEventListener("touchend", function () { if (act === "soft") tetrisSoft(false); });
        b.addEventListener("mousedown", function () {
          ensureAudio();
          if (act === "left") tetrisMove(-1);
          else if (act === "right") tetrisMove(1);
          else if (act === "rot") tetrisRot();
          else if (act === "soft") tetrisSoft(true);
          else if (act === "hard") tetrisHard();
        });
        b.addEventListener("mouseup", function () { if (act === "soft") tetrisSoft(false); });
      });
    }

    function down(e) {
      if (!current || current === "bio") return;
      e.preventDefault();
      ensureAudio();
      var p = canvasPos(e);
      pointer.x = p.x; pointer.y = p.y; pointer.down = true;
      if (current === "tetris") {
        if (!state.playing) initTetris(true);
        else {
          // tap zones: left/right/rotate
          if (p.x < state.W * 0.28) tetrisMove(-1);
          else if (p.x > state.W * 0.72) tetrisMove(1);
          else if (p.y < state.H * 0.35) tetrisRot();
          else if (p.y > state.H * 0.7) tetrisHard();
          else tetrisSoft(true);
        }
      }
      if (current === "td" && wrap._tdClick) wrap._tdClick(p.x, p.y);
      if (current === "drum" && wrap._drumClick) wrap._drumClick(p.x, p.y);
      if (current === "ripple" && wrap._rippleClick) wrap._rippleClick(p.x, p.y);
      if (current === "runner" && wrap._runnerJump) wrap._runnerJump();
    }
    function move(e) {
      if (!current) return;
      var p = canvasPos(e);
      pointer.x = p.x; pointer.y = p.y;
    }
    function up() {
      pointer.down = false;
      state._lx = null;
      if (current === "tetris") tetrisSoft(false);
    }
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", function (e) { e.preventDefault(); move(e); }, { passive: false });
    window.addEventListener("touchend", up);
    window.addEventListener("keydown", function (e) {
      if (current !== "tetris" && current !== "runner") return;
      if (current === "runner" && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        if (wrap._runnerJump) wrap._runnerJump();
        return;
      }
      if (current !== "tetris" || !state.playing) return;
      if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); tetrisMove(-1); }
      else if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); tetrisMove(1); }
      else if (e.code === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); tetrisRot(); }
      else if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); tetrisSoft(true); }
      else if (e.code === "Space") { e.preventDefault(); tetrisHard(); }
      else if (e.key === "c" || e.key === "C") { e.preventDefault(); tetrisHold(); }
    });
    window.addEventListener("keyup", function (e) {
      if (current === "tetris" && (e.code === "ArrowDown" || e.key === "s" || e.key === "S")) tetrisSoft(false);
    });
    window.addEventListener("resize", function () {
      if (current && current !== "bio") {
        sizeCanvas();
        if (current === "meme") drawMeme();
      }
    });
    refreshHi();
  }

  window.PlayLab = {
    onEnter: function () { refreshHi(); },
    onLeave: function () {
      stopLoop();
      if (stage) stage.classList.remove("on");
      if (grid) grid.style.display = "";
      var feat = document.querySelector(".play-featured");
      if (feat) feat.style.display = "";
      if (padEl) padEl.classList.remove("on");
      current = null;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

/* 1785411644 */
