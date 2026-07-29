/* Sejong Table Tennis Court OS — app logic */
(function () {
  "use strict";

  var BOARD_URL =
    "https://script.google.com/macros/s/AKfycbxCvR-8Sbk3e7UJzQ4zc6CVDbKbKLEqvKdMmy5TD-CCqVK019eHytT45tlRP1uaXlrT/exec";

  // ── 사이트 설정 (여기만 고치면 됨) ──
  // 충청이음 실제 배포 주소. 없으면 클릭 시 안내 토스트.
  var CHUNGCHEONG_EUM_URL = "https://fragrant-night-c185.pages.dev/";
  // 카카오 오픈채팅 초대 링크 (카톡 → 방 설정 → 초대 링크 복사)
  // 예: "https://open.kakao.com/o/xxxxxxxx"
  var KAKAO_OPENCHAT_URL = "";
  // 현재 플랫폼 주소
  var SITE_URL = "https://sejong-takgu.impossible-cotton.workers.dev/";
  // 예: "https://your-chungcheong-eum.example";


  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () {
      t.classList.remove("show");
    }, 2400);
  }

  // ── Court graph nodes (approx Sejong coords) ──
  var NODES = [
    { id: "park", name: "박범근탁구클럽", type: "club", dong: "대평동", lat: 36.4715, lng: 127.2778, blurb: "새벽 조탁의 집 · 토일 06:00", links: ["saerom", "eojin", "dapyeong"], naver: "대평동 박범근탁구클럽", nearby: ["조탁 후 인근 카페", "대평 생활권 주차"] },
    { id: "lstep", name: "엘스텝 탁구클럽", type: "club", dong: "나성동", lat: 36.4892, lng: 127.2585, blurb: "금 10시 · 일 14시 리그", links: ["nasung", "boram", "saerom"], naver: "엘스텝 탁구클럽 세종", nearby: ["리그 관전", "나성 상권"] },
    { id: "uri", name: "세종우리탁구클럽", type: "club", dong: "도담동", lat: 36.5155, lng: 127.2610, blurb: "도담 생활권 사설", links: ["dodam", "goun", "hansol"], naver: "세종우리탁구클럽", nearby: ["도담 복컴 병행"] },
    { id: "gounstep", name: "고운스텝", type: "club", dong: "고운동", lat: 36.5140, lng: 127.2360, blurb: "고운 생활권", links: ["goun", "jongchon"], naver: "고운스텝탁구클럽", nearby: ["고운 복컴"] },
    { id: "saerom", name: "새롬동 복컴", type: "comp", dong: "새롬동", lat: 36.4868, lng: 127.2505, blurb: "벙개 선호 · 예약제", links: ["eojin", "park", "nasung", "hansol"], naver: "새롬동복합커뮤니티센터", nearby: ["통합예약 필수", "주말 오전 경쟁"] },
    { id: "eojin", name: "어진동 복컴", type: "comp", dong: "어진동", lat: 36.4975, lng: 127.2690, blurb: "벙개 · 배드민턴 병행", links: ["saerom", "park"], naver: "어진동복합커뮤니티센터", nearby: ["정부청사 생활권"] },
    { id: "boram", name: "보람동 복컴", type: "comp", dong: "보람동", lat: 36.4770, lng: 127.2890, blurb: "남부 생활권 복컴", links: ["sodam", "lstep", "sanul"], naver: "보람동복합커뮤니티센터", nearby: ["소담·산울 연계"] },
    { id: "dodam", name: "도담 복컴", type: "comp", dong: "도담동", lat: 36.5188, lng: 127.2595, blurb: "도담 코트 예약", links: ["uri", "hansol", "goun"], naver: "도담동복합커뮤니티센터", nearby: ["도담 사설 병행"] },
    { id: "jongchon", name: "종촌 거점", type: "hub", dong: "종촌동", lat: 36.5055, lng: 127.2470, blurb: "단지 커뮤니티 + 이웃", links: ["goun", "jiphyeon", "gounstep"], naver: "종촌동", nearby: ["아파트 커뮤니티장", "고운 축"] },
    { id: "jiphyeon", name: "집현 거점", type: "hub", dong: "집현동", lat: 36.5280, lng: 127.3000, blurb: "집현동 이웃 네트워크", links: ["jongchon", "sodam"], naver: "집현동", nearby: ["단지 커뮤니티", "소담 연계"] },
    { id: "goun", name: "고운 거점", type: "hub", dong: "고운동", lat: 36.5105, lng: 127.2325, blurb: "고운동 멤버 허브", links: ["jongchon", "gounstep", "dodam"], naver: "고운동", nearby: ["고운스텝", "종촌"] },
    { id: "nasung", name: "나성 거점", type: "hub", dong: "나성동", lat: 36.4905, lng: 127.2560, blurb: "나성·엘스텝 축", links: ["lstep", "saerom"], naver: "나성동", nearby: ["엘스텝 리그", "새롬 복컴"] },
    { id: "sodam", name: "소담 거점", type: "hub", dong: "소담동", lat: 36.4820, lng: 127.3005, blurb: "소담 생활권", links: ["boram", "jiphyeon", "sanul"], naver: "소담동", nearby: ["보람 복컴"] },
    { id: "dapyeong", name: "대평 거점", type: "hub", dong: "대평동", lat: 36.4700, lng: 127.2800, blurb: "조탁 축", links: ["park"], naver: "대평동", nearby: ["박범근 조탁"] },
    { id: "hansol", name: "한솔 거점", type: "hub", dong: "한솔동", lat: 36.4805, lng: 127.2550, blurb: "한솔 생활권", links: ["dodam", "saerom"], naver: "한솔동", nearby: ["도담·새롬"] },
    { id: "sanul", name: "산울 거점", type: "hub", dong: "산울동", lat: 36.4925, lng: 127.3120, blurb: "산울 커뮤니티", links: ["boram", "sodam"], naver: "산울동", nearby: ["보람·소담 축"] }
  ];
  var NODE_BY = {};
  NODES.forEach(function (n) {
    NODE_BY[n.id] = n;
  });

  var roomByDong = {};
  var selectedId = null;
  var mapFilter = "all";
  var map, lineLayer, markers = {};
  var mapReady = false;

  // ── Navigation ──
  function go(view) {
    document.querySelectorAll(".view").forEach(function (el) {
      el.classList.toggle("on", el.getAttribute("data-view") === view);
    });
    document.querySelectorAll(".dock button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-go") === view);
    });
    if (view === "map") {
      setTimeout(function () {
        if (map) map.invalidateSize();
        if (!mapReady) initMap();
      }, 60);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function () {
      go(el.getAttribute("data-go"));
    });
  });

  // ── Map ──
  function pinIcon(type, on) {
    var cls = "pin " + type + (on ? " on" : "");
    return L.divIcon({
      className: "",
      html: '<div class="' + cls + '"><span></span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }
  function edgeColor(type) {
    if (type === "club") return "#d4784a";
    if (type === "comp") return "#3d5a80";
    return "#4a5568";
  }
  function typeLabel(t) {
    if (t === "club") return "사설 클럽";
    if (t === "comp") return "복합커뮤니티";
    return "동 거점";
  }
  function initMap() {
    if (mapReady) return;
    mapReady = true;
    map = L.map("map", { zoomControl: true, attributionControl: false }).setView([36.495, 127.265], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    lineLayer = L.layerGroup().addTo(map);
    rebuildMarkers();
  }
  function rebuildMarkers() {
    Object.keys(markers).forEach(function (k) {
      map.removeLayer(markers[k]);
    });
    markers = {};
    NODES.forEach(function (n) {
      if (mapFilter !== "all" && n.type !== mapFilter) return;
      var m = L.marker([n.lat, n.lng], { icon: pinIcon(n.type, false) }).addTo(map);
      m.bindTooltip(n.name, { direction: "top", offset: [0, -12] });
      m.on("click", function () {
        selectNode(n.id);
      });
      markers[n.id] = m;
    });
    if (selectedId && markers[selectedId]) selectNode(selectedId);
  }
  function selectNode(id) {
    selectedId = id;
    var n = NODE_BY[id];
    if (!n) return;
    Object.keys(markers).forEach(function (k) {
      var node = NODE_BY[k];
      var on = k === id || (n.links && n.links.indexOf(k) >= 0);
      markers[k].setIcon(pinIcon(node.type, on));
    });
    lineLayer.clearLayers();
    (n.links || []).forEach(function (lid) {
      var t = NODE_BY[lid];
      if (!t || !markers[lid]) return;
      L.polyline(
        [
          [n.lat, n.lng],
          [t.lat, t.lng]
        ],
        { color: edgeColor(t.type), weight: 2, opacity: 0.8, dashArray: "6 8" }
      ).addTo(lineLayer);
    });
    $("selName").textContent = n.name;
    $("selEdges").textContent = String((n.links || []).length);
    renderDetail(n);
    map.panTo([n.lat, n.lng], { animate: true });
  }
  function roomLine(dong) {
    var r = roomByDong[dong];
    if (!r) return "미등록 · 카톡 세종 인원 " + dong;
    return r.count + "명 · " + fmtTime(r.updated);
  }
  function renderDetail(n) {
    var edges = (n.links || [])
      .map(function (id) {
        return NODE_BY[id];
      })
      .filter(Boolean);
    var nearby = (n.nearby || [])
      .map(function (x) {
        return "<div class='row'><span>근처</span><b>" + esc(x) + "</b></div>";
      })
      .join("");
    $("detailPanel").innerHTML =
      "<h4>" +
      esc(n.name) +
      "</h4>" +
      "<div class='type'>" +
      esc(typeLabel(n.type)) +
      " · " +
      esc(n.dong) +
      "</div>" +
      "<p class='blurb'>" +
      esc(n.blurb) +
      "</p>" +
      "<div class='kv'>" +
      "<div class='row'><span>실시간 인원</span><b class='tabular'>" +
      esc(roomLine(n.dong)) +
      "</b></div>" +
      nearby +
      "</div>" +
      "<div class='actions'>" +
      "<a class='btn btn-primary btn-sm' target='_blank' rel='noopener' href='https://map.naver.com/p/search/" +
      encodeURIComponent(n.naver) +
      "'>네이버지도</a>" +
      "<button class='btn btn-ghost btn-sm' type='button' data-go-guide>코트 가이드</button>" +
      "</div>" +
      "<div style='margin-top:16px;font-size:12px;font-weight:600;color:var(--muted)'>연결 " +
      edges.length +
      "</div>" +
      "<div class='edge-list' style='margin-top:8px'>" +
      edges
        .map(function (e) {
          var cnt = roomByDong[e.dong] ? roomByDong[e.dong].count + "명" : "—";
          return (
            "<button class='edge' type='button' data-id='" +
            esc(e.id) +
            "'>" +
            "<i class='dot' style='background:" +
            edgeColor(e.type) +
            "'></i>" +
            "<div><b>" +
            esc(e.name) +
            "</b><small>" +
            esc(e.blurb) +
            " · " +
            esc(e.dong) +
            " · " +
            esc(cnt) +
            "</small></div></button>"
          );
        })
        .join("") +
      "</div>" +
      "<p class='blurb' style='margin-top:14px;margin-bottom:0'>카톡: 세종 이웃 " +
      esc(n.dong) +
      " · 세종 탁구장 " +
      esc(n.dong) +
      "</p>";

    $("detailPanel").querySelectorAll(".edge").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectNode(btn.getAttribute("data-id"));
      });
    });
    var g = $("detailPanel").querySelector("[data-go-guide]");
    if (g)
      g.addEventListener("click", function () {
        go("guide");
      });
  }

  document.querySelectorAll("#mapFilters .filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#mapFilters .filter").forEach(function (b) {
        b.classList.remove("on");
      });
      btn.classList.add("on");
      mapFilter = btn.getAttribute("data-filter");
      if (mapReady) {
        lineLayer.clearLayers();
        rebuildMarkers();
      }
    });
  });

  // ── Rooms ──
  function fmtTime(iso) {
    if (!iso) return "최근";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 16);
      return (
        d.getMonth() +
        1 +
        "/" +
        d.getDate() +
        " " +
        String(d.getHours()).padStart(2, "0") +
        ":" +
        String(d.getMinutes()).padStart(2, "0")
      );
    } catch (e) {
      return "최근";
    }
  }
  function renderRooms(rooms) {
    rooms = (rooms || []).filter(function (r) {
      return r && r.room;
    });
    roomByDong = {};
    rooms.forEach(function (r) {
      roomByDong[r.room] = r;
    });
    var grid = $("roomGrid");
    var meta = $("liveMeta");
    if (!rooms.length) {
      grid.innerHTML =
        "<div class='empty' style='grid-column:1/-1'>등록된 동이 없습니다. 카톡에서 세종 인원 종촌동 20</div>";
      meta.textContent = "0개 동";
      $("stTotal").textContent = "0";
      $("stDongs").textContent = "0";
      return;
    }
    var total = 0;
    var latest = "";
    rooms.forEach(function (r) {
      total += Number(r.count) || 0;
      if (r.updated && (!latest || r.updated > latest)) latest = r.updated;
    });
    grid.innerHTML = rooms
      .map(function (r) {
        return (
          "<button class='room' type='button' data-dong='" +
          esc(r.room) +
          "'>" +
          "<div class='count tabular'>" +
          (Number(r.count) || 0) +
          "</div>" +
          "<div class='name'>" +
          esc(r.room) +
          "</div>" +
          "<div class='meta'>" +
          esc(fmtTime(r.updated)) +
          "</div></button>"
        );
      })
      .join("");
    grid.querySelectorAll(".room").forEach(function (el) {
      el.addEventListener("click", function () {
        var dong = el.getAttribute("data-dong");
        var node = NODES.find(function (n) {
          return n.dong === dong;
        });
        go("map");
        setTimeout(function () {
          if (node) selectNode(node.id);
        }, 120);
      });
    });
    meta.textContent = rooms.length + "개 동 · " + total + "명";
    if (latest) meta.textContent += " · " + fmtTime(latest);
    $("stTotal").textContent = String(total);
    $("stDongs").textContent = String(rooms.length);
    $("stNodes").textContent = String(NODES.length);
    if (selectedId) selectNode(selectedId);
  }
  function loadRooms() {
    if (!BOARD_URL) return;
    fetch(BOARD_URL + "?action=rooms&cb=" + Date.now())
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && Array.isArray(d.rooms)) {
          renderRooms(d.rooms);
          return;
        }
        var dongs = ["종촌동", "고운동", "새롬동", "도담동", "집현동", "소담동", "나성동", "보람동", "한솔동", "산울동", "대평동"];
        return Promise.all(
          dongs.map(function (name) {
            return fetch(BOARD_URL + "?action=roomCount&room=" + encodeURIComponent(name) + "&cb=" + Date.now())
              .then(function (r) {
                return r.json();
              })
              .then(function (j) {
                return j && !j.error && j.room ? j : null;
              })
              .catch(function () {
                return null;
              });
          })
        ).then(function (list) {
          renderRooms(list.filter(Boolean));
        });
      })
      .catch(function () {
        $("liveMeta").textContent = "동기화 실패";
        $("roomGrid").innerHTML = "<div class='empty' style='grid-column:1/-1'>네트워크를 확인한 뒤 새로고침 해 주세요</div>";
      });
  }

  // ── Guide list ──
  function renderGuide() {
    var clubs = NODES.filter(function (n) {
      return n.type === "club" || n.type === "comp";
    });
    $("guideList").innerHTML = clubs
      .map(function (n) {
        return (
          "<a class='item' href='https://map.naver.com/p/search/" +
          encodeURIComponent(n.naver) +
          "' target='_blank' rel='noopener' style='text-decoration:none'>" +
          "<div class='ico'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z'/><circle cx='12' cy='10' r='2.5'/></svg></div>" +
          "<div><b>" +
          esc(n.name) +
          "</b><small>" +
          esc(n.blurb) +
          " · " +
          esc(n.dong) +
          "</small></div>" +
          "<span class='tag'>" +
          esc(typeLabel(n.type)) +
          "</span></a>"
        );
      })
      .join("");
  }

  // ── Auth / lounge ──
  function me() {
    try {
      return JSON.parse(localStorage.getItem("pp_user") || "null");
    } catch (e) {
      return null;
    }
  }
  function afterJoin() {
    var u = me();
    if (!u) return;
    $("meLine").textContent = u.n + " · " + u.b;
    $("btnProfile").textContent = "내 정보";
    loadPosts();
  }
  function openGate() {
    $("gate").classList.add("on");
  }
  $("btnProfile").addEventListener("click", openGate);
  $("btnGateClose").addEventListener("click", function () {
    $("gate").classList.remove("on");
  });
  $("btnJoin").addEventListener("click", function () {
    var u = {
      n: $("gN").value.trim(),
      c: $("gC").value.trim(),
      b: $("gB").value.trim(),
      goal: $("gG").value.trim()
    };
    if (!u.n || !u.c || !u.b || !u.goal) {
      toast("네 칸을 모두 입력해 주세요");
      return;
    }
    localStorage.setItem("pp_user", JSON.stringify(u));
    if (BOARD_URL) {
      fetch(BOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "join", n: u.n, c: u.c, b: u.b, goal: u.goal })
      }).catch(function () {});
    }
    $("gate").classList.remove("on");
    toast(u.n + "님 환영합니다");
    afterJoin();
  });

  var POSTS = [];
  function loadPosts() {
    if (!BOARD_URL) return;
    $("boardMode").textContent = "전체 공유 게시판";
    fetch(BOARD_URL + "?action=posts&cb=" + Date.now())
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        POSTS = d.posts || [];
        renderPosts();
      })
      .catch(function () {
        $("postList").innerHTML = "<div class='empty'>게시판을 불러오지 못했습니다</div>";
      });
  }
  function fmtPostTime(t) {
    try {
      var d = new Date(t);
      return d.getMonth() + 1 + "/" + d.getDate() + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    } catch (e) {
      return "";
    }
  }
  function renderPosts() {
    if (!POSTS.length) {
      $("postList").innerHTML = "<div class='empty'>첫 글을 남겨 보세요</div>";
      return;
    }
    $("postList").innerHTML = POSTS.map(function (p) {
      var cmts = (p.comments || [])
        .map(function (c) {
          return "<div class='cmt-item'><b>" + esc(c.n) + "</b><span>" + esc(c.m) + "</span></div>";
        })
        .join("");
      return (
        "<article class='post'>" +
        "<div class='meta'><span class='author'>" +
        esc(p.n || "익명") +
        "</span><span class='time'>" +
        esc(fmtPostTime(p.t || p.time)) +
        "</span></div>" +
        "<div class='msg'>" +
        esc(p.m || p.msg || "") +
        "</div>" +
        (cmts ? "<div class='cmt'>" + cmts + "</div>" : "") +
        "<div class='crow'><input data-pid='" +
        esc(p.id) +
        "' placeholder='답글 작성'><button class='btn btn-ghost btn-sm' data-cmt='" +
        esc(p.id) +
        "'>등록</button></div></article>"
      );
    }).join("");
    $("postList").querySelectorAll("[data-cmt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addCmt(btn.getAttribute("data-cmt"));
      });
    });
  }
  $("btnPost").addEventListener("click", function () {
    var u = me();
    if (!u) {
      openGate();
      return;
    }
    var m = $("postMsg").value.trim();
    if (!m) {
      toast("내용을 입력해 주세요");
      return;
    }
    var id = "p" + Date.now();
    if (BOARD_URL) {
      fetch(BOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "post", id: id, n: u.n, m: m })
      }).catch(function () {});
    }
    POSTS.unshift({ id: id, n: u.n, m: m, t: new Date().toISOString(), comments: [] });
    $("postMsg").value = "";
    renderPosts();
    toast("게시했습니다");
  });
  function addCmt(pid) {
    var u = me();
    if (!u) {
      openGate();
      return;
    }
    var input = $("postList").querySelector("input[data-pid='" + pid + "']");
    if (!input) return;
    var m = input.value.trim();
    if (!m) return;
    if (BOARD_URL) {
      fetch(BOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "comment", pid: pid, n: u.n, m: m })
      }).catch(function () {});
    }
    var p = POSTS.find(function (x) {
      return x.id === pid;
    });
    if (p) {
      p.comments = p.comments || [];
      p.comments.push({ n: u.n, m: m });
    }
    renderPosts();
  }

  // ── Weekly ──
  function loadWeekly() {
    if (!BOARD_URL) return;
    fetch(BOARD_URL + "?action=weekly&cb=" + Date.now())
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d.kw && d.kw.length) {
          $("kwRow").innerHTML = d.kw
            .map(function (k) {
              return "<span class='filter on'>#" + esc(k) + "</span>";
            })
            .join("");
        }
        if (d.rank && d.rank.length) {
          var max = d.rank[0].c || 1;
          if (d.rank[0]) $("rankHint").textContent = "1위 " + d.rank[0].n + " · " + d.rank[0].c + "회";
          $("rankList").innerHTML = d.rank
            .map(function (r, i) {
              return (
                "<div class='rk'><span class='no" +
                (i < 3 ? " top" : "") +
                " tabular'>" +
                (i + 1) +
                "</span><span class='nm'>" +
                esc(r.n) +
                "</span><div class='bar'><i style='width:" +
                Math.round((r.c / max) * 100) +
                "%'></i></div><span class='c tabular'>" +
                r.c +
                "</span></div>"
              );
            })
            .join("");
        } else {
          $("rankList").innerHTML = "<div class='empty'>아직 주간 랭킹이 없습니다</div>";
        }
        if (d.news && d.news.lines) {
          $("newsBox").innerHTML =
            "<div style='font-size:15px;font-weight:600;margin-bottom:8px'>" +
            esc(d.news.title || "아침신문") +
            "</div><div style='color:var(--muted);font-size:13.5px;line-height:1.7'>" +
            d.news.lines.map(esc).join("<br>") +
            "</div>";
        }
      })
      .catch(function () {});
  }

  $("btnRefresh").addEventListener("click", function () {
    loadRooms();
    loadWeekly();
    loadPosts();
    toast("데이터를 새로고침했습니다");
  });


  // Living Graph seed (기획 10) — static JSON is source for nodes/schedules
  function applyGraphPayload(g) {
    if (!g || !g.nodes || !g.nodes.length) return;
    NODES.length = 0;
    g.nodes.forEach(function (n) {
      NODES.push(n);
    });
    NODE_BY = {};
    NODES.forEach(function (n) {
      NODE_BY[n.id] = n;
    });
    if ($("stNodes")) $("stNodes").textContent = String(NODES.length);
    renderGuide();
    if (mapReady) {
      lineLayer.clearLayers();
      rebuildMarkers();
    }
  }
  function loadLivingGraph() {
    return fetch("./data/living-graph.json?cb=" + Date.now())
      .then(function (r) {
        return r.json();
      })
      .then(function (g) {
        applyGraphPayload(g);
      })
      .catch(function () {
        /* embedded NODES remain */
      });
  }


  function wireSisterLinks() {
    var a = $("linkEum");
    if (a) {
      if (CHUNGCHEONG_EUM_URL) {
        a.href = CHUNGCHEONG_EUM_URL;
        a.target = "_blank";
        a.rel = "noopener";
      } else {
        a.href = "#";
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          toast("충청이음 주소를 확인해 주세요");
        });
      }
    }
    var k = $("linkKakao");
    if (k) {
      if (KAKAO_OPENCHAT_URL && KAKAO_OPENCHAT_URL.indexOf("http") === 0) {
        k.href = KAKAO_OPENCHAT_URL;
        k.target = "_blank";
        k.rel = "noopener";
      } else {
        k.href = "#";
        k.addEventListener("click", function (ev) {
          ev.preventDefault();
          toast("카톡 오픈채팅 초대 링크를 app.js 의 KAKAO_OPENCHAT_URL 에 넣어 주세요");
        });
      }
    }
  }

  // boot
  loadLivingGraph().then(function () {
    wireSisterLinks();
    renderGuide();
    if (me()) afterJoin();
    else $("btnProfile").textContent = "입장";
    loadRooms();
    loadWeekly();
    setInterval(loadRooms, 5 * 60 * 1000);
  });
})();
