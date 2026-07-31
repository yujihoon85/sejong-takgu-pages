/**
 * 🏓 세종 탁구 커뮤니티 챗봇 v16.3.1 COMMUNITY OS
 *
 * msgbot / 메신저봇R 단일 파일 전체 통합본
 * ★ 폰 메신저봇R에 이 파일 전체 붙여넣기 → 저장 → 재컴파일
 *
 * v16.2 → v16.3 (다음 스텝 1~5)
 * ─────────────────────────────────────────────
 * [1] 안정화: KST 시간·헬스체크·에러 힌트
 * [2] 웹 연동: 플랫폼/카톡/충청이음, GAS 오늘모집 동기화
 * [3] 모집·매칭: 예약 링크·매칭 가이드
 * [4] 데이터: 이웃 중복 병합, 관리자 치트시트
 * [5] 주간: 세종 신문 (GAS weekly)
 * [16.3.1] 두 단어 명령 합침: "벙개 현황"→벙개현황, "오늘 모집"→오늘모집 등
 * ─────────────────────────────────────────────
 */

// =====================================================
// 🆔 버전
// =====================================================

var BOT_VERSION = "16.3.1 COMMUNITY OS";

// =====================================================
// ⚙️ 기본 설정
// =====================================================

var TRIGGER = "세종";
var BOT_NAME = "세종이";
var WEATHER_CITY = "Sejong";
var BAND_URL = "https://band.us/band/63502525";
var PLATFORM_URL = "https://sejong-takgu.pages.dev/";
var PLATFORM_PREVIEW_URL = "https://40fe635f.sejong-takgu.pages.dev/";
var KAKAO_OPENCHAT_URL = "https://open.kakao.com/o/g51E976e";
var CHUNGCHEONG_EUM_URL = "https://fragrant-night-c185.pages.dev/";
var BOOKING_URL = "https://onestop.sejong.go.kr";

var ADMINS = [
    "음악시간미술시간",
    "음악시간미술시간😊",
    "유지훈",
    "박범근"
];

var SPAM_LIMIT = 3;
var SPAM_WINDOW = 5000;

var ELO_K = 32;
var PENDING_WIN_TIMEOUT = 300000; // 5분

// v16: Gemini 모델명 (자동 최신 유지 별칭)
var GEMINI_MODEL = "gemini-flash-latest";

// =====================================================
// 📂 파일 경로
// =====================================================

var DATA_DIR = "/sdcard/msgbot/세종/";

var FILE_CONFIG = DATA_DIR + "config.json";
var FILE_USERS = DATA_DIR + "users.json";
var FILE_ADMINS = DATA_DIR + "admins.json";
var FILE_BLOCKED = DATA_DIR + "blocked.json";
var FILE_SPAM = DATA_DIR + "spam.json";
var FILE_STATS = DATA_DIR + "stats.json";

var FILE_MATCH = DATA_DIR + "match.json";

var FILE_BUNGGAE = DATA_DIR + "bunggae.json";
var FILE_ATTEND = DATA_DIR + "attend.json";
var FILE_POINT = DATA_DIR + "point.json";
var FILE_STREAK = DATA_DIR + "streak.json";

var FILE_ELO = DATA_DIR + "elo.json";
var FILE_PENDING_WINS = DATA_DIR + "pending_wins.json";
var FILE_MATCHES_HISTORY = DATA_DIR + "matches_history.json";

var FILE_RESERVATIONS = DATA_DIR + "reservations.json";
var FILE_DAILY_AWARDS = DATA_DIR + "daily_awards.json";
var FILE_REACT_AGENT = DATA_DIR + "react_agent.json";
var FILE_PREDICTIONS = DATA_DIR + "predictions.json";

// v16.1: 주간 랭킹 스냅샷 (지난주 순위 비교용)
var FILE_WEEKLY_RANK = DATA_DIR + "weekly_rank.json";

// 백업 디렉터리
var BACKUP_DIR = DATA_DIR + "backup/";

// =====================================================
// 🔑 API
// =====================================================

var GEMINI_API_KEY = "";

// =====================================================
// 🌐 GAS 연동 (방인원 + 대화로그) — v16.2 정식 통합
// =====================================================

var GAS_URL = "https://script.google.com/macros/s/AKfycbxCvR-8Sbk3e7UJzQ4zc6CVDbKbKLEqvKdMmy5TD-CCqVK019eHytT45tlRP1uaXlrT/exec";
// 방 이름에 이 글자가 포함되면 대화 로그 전송
var TARGET_ROOM = "세종";

var SEJONG_DONGS = [
    "종촌동", "집현동", "고운동", "나성동", "새롬동", "도담동",
    "보람동", "한솔동", "소담동", "아름동", "어진동", "다정동",
    "반곡동", "대평동", "산울동", "해밀동", "합강동"
];

function sendToSheet(room, sender, msg) {
    try {
        if (TARGET_ROOM && String(room).indexOf(TARGET_ROOM) === -1) return;
        if (!GAS_URL || GAS_URL.indexOf("http") !== 0) return;
        var t = String(msg || "").trim();
        if (!t) return;
        var mediaPrefixes = ["사진", "동영상", "이모티콘", "스티커", "음성메시지", "파일", "지도", "연락처", "메시지가 삭제되었습니다", "삭제된 메시지", "투표", "앨범"];
        for (var i = 0; i < mediaPrefixes.length; i++) {
            if (t.indexOf(mediaPrefixes[i]) === 0) return;
        }
        var payload = JSON.stringify({ action: "chat", room: room, n: sender, m: t.slice(0, 500) });
        new java.lang.Thread({
            run: function () {
                try {
                    org.jsoup.Jsoup.connect(GAS_URL)
                        .ignoreContentType(true)
                        .ignoreHttpErrors(true)
                        .followRedirects(true)
                        .timeout(5000)
                        .header("Content-Type", "text/plain;charset=utf-8")
                        .requestBody(payload)
                        .post();
                } catch (e) {}
            }
        }).start();
    } catch (e) {}
}

function getRoomCount(roomName) {
    try {
        if (!roomName) return "💡 사용법: 세종 인원 종촌동";
        var url = GAS_URL + "?action=roomCount&room=" + encodeURIComponent(roomName);
        var res = org.jsoup.Jsoup.connect(url)
            .ignoreContentType(true)
            .timeout(8000)
            .get()
            .text();
        var json = JSON.parse(res);
        if (json.error) {
            return "❌ " + roomName + " 방 정보가 아직 없어요.\n관리자가 먼저 등록: 세종 인원 " + roomName + " 20";
        }
        return "🏓 " + json.room + " 현재 " + json.count + "명이에요!\n📅 마지막 업데이트: " + formatKst(json.updated || "최근");
    } catch (e) {
        return "⚠️ " + roomName + " 인원 조회에 실패했어요. 잠시 후 다시 시도해 주세요.";
    }
}

function updateRoomCount(roomName, count, sender) {
    if (!isAdmin(sender)) return "🚫 인원 숫자 변경은 관리자만 가능해요 😅";
    try {
        var payload = JSON.stringify({
            action: "updateRoom",
            room: roomName,
            count: Number(count),
            note: sender + "님이 업데이트"
        });
        org.jsoup.Jsoup.connect(GAS_URL)
            .ignoreContentType(true)
            .header("Content-Type", "application/json")
            .requestBody(payload)
            .method(org.jsoup.Connection.Method.POST)
            .timeout(8000)
            .execute();
        return "✅ " + roomName + " 인원을 " + count + "명으로 업데이트했어요!";
    } catch (e) {
        return "❌ 업데이트 실패. GAS 배포 상태를 확인해 주세요.";
    }
}

function getMembersByDong(dongName) {
    try {
        if (!dongName) return "💡 사용법: 세종 이웃 집현동\n예: 세종 이웃 고운동";
        dongName = normalizeName(dongName);
        var users = loadJSON(FILE_USERS, {});
        var found = [];
        for (var key in users) {
            if (key === "__initialized__" || key === "__nextId__" || key === "__botVersion__") continue;
            var user = users[key];
            if (!user) continue;
            var region = user.region || "";
            var fullName = user.fullName || key;
            var shortName = user.shortName || getShortName(fullName);
            if (region.indexOf(dongName) >= 0 || fullName.indexOf(dongName) >= 0 || String(key).indexOf(dongName) >= 0) {
                var rank = user.rank || "";
                try { if (!rank) rank = extractRank(fullName); } catch (e) {}
                found.push(shortName + (rank ? " (" + rank + ")" : ""));
            }
        }
        var byBase = {};
        var order = [];
        for (var i = 0; i < found.length; i++) {
            var line = found[i];
            var base = line.replace(/\s*\([^)]*\)\s*$/, "").trim();
            var rankPart = "";
            var rm = line.match(/\(([^)]*)\)\s*$/);
            if (rm) rankPart = rm[1];
            if (!byBase[base]) { byBase[base] = []; order.push(base); }
            if (rankPart && byBase[base].indexOf(rankPart) < 0) byBase[base].push(rankPart);
        }
        var uniq = [];
        for (var u = 0; u < order.length; u++) {
            var b = order[u];
            var ranks = byBase[b];
            if (!ranks.length) uniq.push(b);
            else if (ranks.length === 1) uniq.push(b + " (" + ranks[0] + ")");
            else uniq.push(b + " (" + ranks.join(" · ") + ")");
        }
        found = uniq;
        if (found.length === 0) {
            return "📭 " + dongName + " 회원이 아직 DB에 없어요.\n(봇과 대화한 적 있는 사람 기준)";
        }
        var msg = "🏘️ " + dongName + " 이웃 " + found.length + "명\n\n";
        for (var j = 0; j < found.length && j < 30; j++) msg += (j + 1) + ". " + found[j] + "\n";
        if (found.length > 30) msg += "\n외 " + (found.length - 30) + "명 더 있음";
        msg += "\n\n※ 봇과 대화한 적 있는 사람 기준입니다.";
        return msg;
    } catch (e) {
        return "⚠️ 회원 검색 중 오류가 발생했어요.";
    }
}



// =====================================================
// 🌐 v16.3 웹·시간·GAS 헬퍼
// =====================================================

function formatKst(v) {
    try {
        if (!v || v === "최근") return "최근";
        var d = (v instanceof Date) ? v : new Date(v);
        if (isNaN(d.getTime())) return String(v).slice(0, 22);
        var y = d.getFullYear();
        var mo = d.getMonth() + 1;
        var day = d.getDate();
        var h = d.getHours();
        var mi = d.getMinutes();
        var ap = h < 12 ? "오전" : "오후";
        var h12 = h % 12; if (h12 === 0) h12 = 12;
        var mm = (mi < 10 ? "0" : "") + mi;
        return y + "." + mo + "." + day + " " + ap + " " + h12 + ":" + mm;
    } catch (e) {
        return String(v || "최근");
    }
}

function platformCard() {
    return "━━━ 🌐 세종 탁구 플랫폼 ━━━\n\n" +
           "공식\n" + PLATFORM_URL + "\n\n" +
           "포함 기능\n" +
           "· 실시간 동별 인원 카드\n" +
           "· 동네 코트 지도\n" +
           "· 배움터 · 라운지 · 아침신문\n" +
           "· 탁구 게임 (즐탁 테트리스)\n\n" +
           "카톡 오픈채팅\n" + KAKAO_OPENCHAT_URL + "\n\n" +
           "충청이음\n" + CHUNGCHEONG_EUM_URL + "\n\n" +
           "복컴 예약\n" + BOOKING_URL;
}

function gasGet(action, extraQuery) {
    var url = GAS_URL + "?action=" + encodeURIComponent(action);
    if (extraQuery) url += "&" + extraQuery;
    var res = org.jsoup.Jsoup.connect(url)
        .ignoreContentType(true)
        .timeout(9000)
        .get()
        .text();
    return JSON.parse(res);
}

function gasPost(payloadObj) {
    org.jsoup.Jsoup.connect(GAS_URL)
        .ignoreContentType(true)
        .ignoreHttpErrors(true)
        .header("Content-Type", "application/json")
        .requestBody(JSON.stringify(payloadObj))
        .method(org.jsoup.Connection.Method.POST)
        .timeout(9000)
        .execute();
}

function syncTodayRecruitToGas(data, sender) {
    try {
        if (!GAS_URL || GAS_URL.indexOf("http") !== 0) return;
        var payload = {
            action: "todayRecruit",
            date: data.date || "",
            place: data.place || "",
            time: data.time || "",
            host: data.host || "",
            members: data.members || [],
            note: (sender || "") + " / 세종이"
        };
        new java.lang.Thread({
            run: function () {
                try { gasPost(payload); } catch (e) {}
            }
        }).start();
    } catch (e) {}
}

function fetchWeeklyDigest() {
    try {
        var json = gasGet("weekly");
        if (!json || json.error) return "📭 주간 데이터가 아직 없어요.\n월요일 자동 분석 후 채워집니다.\n웹: " + PLATFORM_URL;
        var data = json.data || json;
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch (e2) {}
        }
        var kw = data.kw || data.keywords || [];
        var rank = data.rank || data.ranking || [];
        var news = data.news || data.summary || "";
        var msg = "━━━ 📰 AI 아침신문·주간 ━━━\n\n";
        if (news) {
            if (typeof news === "string") msg += news + "\n\n";
            else msg += (news.title ? news.title + "\n" : "") + (news.body || news.summary || JSON.stringify(news).slice(0, 300)) + "\n\n";
        }
        if (kw && kw.length) {
            msg += "🔑 키워드\n";
            for (var i = 0; i < kw.length && i < 8; i++) {
                msg += "· " + (typeof kw[i] === "string" ? kw[i] : (kw[i].word || kw[i].name || "?")) + "\n";
            }
            msg += "\n";
        }
        if (rank && rank.length) {
            msg += "🏆 주간 활성\n";
            for (var r = 0; r < rank.length && r < 5; r++) {
                var item = rank[r];
                if (typeof item === "string") msg += (r + 1) + ". " + item + "\n";
                else msg += (r + 1) + ". " + (item.name || item.n || "?") + (item.score != null ? " · " + item.score : "") + "\n";
            }
            msg += "\n";
        }
        if (!news && !(kw && kw.length) && !(rank && rank.length)) {
            msg += "시트 주간 데이터가 비어 있어요.\n";
        }
        msg += "웹: " + PLATFORM_URL;
        return msg;
    } catch (e) {
        return "⚠️ 주간 신문 조회 실패\n· 세종 헬스체크\n· 웹: " + PLATFORM_URL;
    }
}

function healthCheck() {
    var lines = [];
    lines.push("━━━ 🩺 세종이 헬스체크 ━━━");
    lines.push("버전: " + BOT_VERSION);
    lines.push("모델: " + GEMINI_MODEL);
    var hasKey = false;
    try {
        if (GEMINI_API_KEY && String(GEMINI_API_KEY).indexOf("AIza") === 0) hasKey = true;
        else {
            var cfg = loadJSON(FILE_CONFIG, {});
            if (cfg && cfg.geminiKey && String(cfg.geminiKey).indexOf("AIza") === 0) hasKey = true;
        }
    } catch (e) {}
    // also try common getter if exists
    try { if (typeof getAPIKey === "function" && getAPIKey()) hasKey = true; } catch (e2) {}
    try { if (typeof loadAPIKey === "function" && loadAPIKey()) hasKey = true; } catch (e3) {}
    lines.push("Gemini API: " + (hasKey ? "✅ 설정됨" : "❌ 없음 (세종 API설정)"));
    try {
        var rooms = gasGet("rooms");
        var n = (rooms && rooms.rooms) ? rooms.rooms.length : 0;
        lines.push("GAS 방인원: ✅ " + n + "개 동");
    } catch (e) {
        lines.push("GAS 방인원: ⚠️ 연결 실패");
    }
    lines.push("플랫폼: " + PLATFORM_URL);
    lines.push("\n추천 테스트");
    lines.push("· 세종 AI테스트");
    lines.push("· 세종 인원 종촌동");
    lines.push("· 세종 오늘모집 현황");
    lines.push("· 세종 신문");
    return lines.join("\n");
}

function matchGuide() {
    return "━━━ 🎯 매칭 가이드 ━━━\n\n" +
           "1) 참가: 세종 매칭\n" +
           "2) 목록: 세종 매칭목록\n" +
           "3) 단식 편성: 세종 매칭시작\n" +
           "4) 복식 편성: 세종 복식\n\n" +
           "팁\n· 닉네임에 부수(8부 등) 있으면 매칭↑\n· 오늘만: 세종 오늘모집 새롬복컴 19시\n· 예약: " + BOOKING_URL;
}

// =====================================================
// 🏆 일일 벙개 상장 설정
// =====================================================

var AWARD_TRIGGER_HOUR = 21;      // 매일 밤 9시
var AWARD_LOG_LIMIT = 500;
var AWARD_HISTORY_LIMIT = 30;
var AWARD_REQUIRE_BUNGGAE = true; // true면 벙개 로그가 있는 날만 상장 발송

// =====================================================
// 🤖 ReAct 에이전트 설정 (조용함)
// =====================================================

var REACT_AGENT_ENABLED = true;
var REACT_AGENT_RATE = 0.03;
var REACT_AGENT_GLOBAL_COOLDOWN = 90 * 60 * 1000;
var REACT_AGENT_USER_COOLDOWN = 6 * 60 * 60 * 1000;
var REACT_AGENT_DAILY_LIMIT = 2;
var REACT_NIGHT_RATE = 0.10;

// =====================================================
// 🏓 승부예측/응원픽 설정
// =====================================================

var PREDICTION_TIMEOUT = 5 * 60 * 1000; // 픽 접수 5분
var PREDICTION_MIN_POINT = 1;
var PREDICTION_MAX_POINT = 100;

var CRAZY_REWARD_POOL = [
    { category: "슈퍼카", name: "테슬라 모델 X 플래드", emoji: "🔋🚘", line: "이번 주 드라이브 감성을 책임진 회원님께 가상 출고됩니다. 유지비는 봇이 안 냅니다." },
    { category: "슈퍼카", name: "벤츠 마이바흐 S클래스 럭셔리 에디션", emoji: "💎🚗", line: "주차장은 없지만 품격만큼은 이미 오너입니다." },
    { category: "미식", name: "미슐랭 3스타 시크릿 디너 2인 식사권", emoji: "🥂🍽️", line: "운동 후 컵라면 대신 상상 속 풀코스를 즐길 자격을 획득했습니다." },
    { category: "로맨스", name: "탑배우와의 보람동 카페 데이트권", emoji: "🎬☕", line: "현실 지급은 없지만 단톡방 질투 지분은 충분합니다." },
    { category: "여행", name: "하와이 와이키키 7일 살기 이용권", emoji: "🌴✈️", line: "복컴과 회사 사이를 탈출하는 상상력만큼은 일등입니다." },
    { category: "우주", name: "스페이스X 화성 편도 티켓", emoji: "🚀🪐", line: "지구 중력보다 강한 존재감을 보인 회원님 전용입니다." },
    { category: "럭셔리", name: "포시즌스 펜트하우스 1박 스위트권", emoji: "🏨✨", line: "이번 주 클래스가 남달랐던 분께 드리는 허세 특전입니다." },
    { category: "힐링", name: "한강 요트 선셋 크루즈 프리패스", emoji: "🛥️🌇", line: "빡빡한 일상 속 여유를 가상으로 강제 지급합니다." },
    { category: "미식", name: "도쿄 오마카세 왕복 상상권", emoji: "🍣🗼", line: "리시브보다 더 섬세한 감각을 보여준 분께 헌정합니다." },
    { category: "레전드", name: "세종복컴 영구 명예 라커 이용권", emoji: "🏓👑", line: "실물은 없지만 명예만큼은 종신 보장입니다." },
    { category: "명예", name: "세종 탁구방 종신 명예회장석", emoji: "👑🏓", line: "오늘의 존재감만큼은 회장님급이었습니다." },
    { category: "럭셔리", name: "롤스로이스 팬텀 가상 시승권", emoji: "🚘🌟", line: "현실 차키는 없지만 단톡방 품격은 이미 1억 원대입니다." }
];

// =====================================================
// 🧹 지역명/오타 보정
// =====================================================

var ALIASES = {
    "세롬동": "새롬동",
    "학슬동": "한솔동",
    "학술동": "한솔동",
    "합슬동": "한솔동",
    "점혁등": "집현동",
    "점혁동": "집현동"
};

var COMMAND_ALIASES = {
    "벙게": "벙개",
    "뻥개": "벙개",
    "벙계": "벙개",
    "참여": "참가",
    "참가 취소": "참가취소",
    "참석": "참가",
    "매칭 시작": "매칭시작",
    "맷칭": "매칭",
    "출첵": "출석",
    "포인트조회": "포인트",
    "랭킹조회": "랭킹",
    "도움": "도움말",
    "헬프": "도움말",
    "내정보카드": "내정보",
    "프로필": "내정보",
    "오늘의팁": "팁",
    "탁구팁": "팁",
    "질문하기": "질문",
    "물어봐": "질문",
    "ai": "질문",
    "AI": "질문",
    "인원수": "인원",
    "이웃들": "이웃",
    "동네사람": "이웃",
    "오늘칠사람": "오늘모집",
    "칠사람": "오늘모집",
    "모집": "오늘모집",
    "관리자명령": "관리자도움",
    "관리자메뉴": "관리자도움",
    "방장도움": "관리자도움",
    "FAQ": "faq",
    "자주묻는질문": "faq",
    "홈피": "플랫폼",
    "홈페이지": "플랫폼",
    "사이트": "플랫폼",
    "웹": "플랫폼",
    "주간신문": "신문",
    "아침신": "신문",
    "상태체크": "헬스체크",
    "서버상태": "헬스체크",
    // 띄어쓰기 명령 (resolveCommand 와 함께 사용)
    "벙개 현황": "벙개현황",
    "벙개현황": "벙개현황",
    "벙 현황": "벙개현황",
    "벙현황": "벙개현황",
    "참가 취소": "참가취소",
    "오늘 모집": "오늘모집",
    "오늘모집 현황": "오늘모집",
    "매칭 시작": "매칭시작",
    "매칭 목록": "매칭목록",
    "매칭 취소": "매칭취소",
    "매칭 가이드": "매칭가이드",
    "예약 목록": "예약목록",
    "예약 초기화": "예약초기화",
    "예약 링크": "예약링크",
    "API 상태": "API상태",
    "API 설정": "API설정",
    "API 삭제": "API삭제",
    "AI 테스트": "AI테스트",
    "내 정보": "내정보",
    "예측 현황": "예측현황",
    "예측 취소": "예측취소",
    "상장 현황": "상장현황",
    "상장 미리보기": "상장미리보기",
    "상장 초기화": "상장초기화",
    "회원 DB초기화": "회원DB초기화",
    "회원DB 초기화": "회원DB초기화",
    "관리자 도움": "관리자도움",
    "관리자 추가": "관리자추가",
    "차단 해제": "차단해제",
    "헬스 체크": "헬스체크",
    "아침 신문": "신문",
    "주간 신문": "신문"
};

// =====================================================
// 💡 v16.1 오늘의 탁구 팁 (AI 꺼져 있어도 작동하는 내장 목록)
// =====================================================

var TABLE_TENNIS_TIPS = [
    "포핸드 드라이브는 팔로만 치지 말고 허리 회전으로 공을 감아올리세요. 힘이 확 실려요.",
    "서브 넣을 때 손목 스냅을 살리면 회전량이 늘어나요. 상대가 리시브 실수를 많이 합니다.",
    "리시브가 어렵다면 일단 공을 상대 코트에 '넘기는 것'에 집중하세요. 안정이 먼저예요.",
    "백핸드는 팔꿈치를 몸 앞에 고정하고, 라켓을 짧게 스윙하면 컨트롤이 좋아져요.",
    "발이 멈추면 공도 멈춥니다. 랠리 중에도 잔발로 계속 위치를 잡으세요.",
    "공을 세게 치는 것보다 '같은 코스로 꾸준히' 치는 게 이기는 탁구예요.",
    "커트(하회전) 공은 라켓을 살짝 눕혀서 밀어주듯 받아야 네트에 안 걸려요.",
    "경기 전 5분만 몸을 풀어도 부상 위험이 확 줄어요. 특히 어깨와 손목을 돌려주세요.",
    "상대 약점을 파악하세요. 백핸드가 약하면 백핸드 쪽으로 계속 보내는 것도 전략이에요.",
    "스매시는 찬스볼에만. 공이 높이 뜨면 그때 강하게, 평소엔 안정적인 드라이브로.",
    "라켓 러버는 3~6개월마다 상태를 확인하세요. 낡으면 회전이 안 걸려요.",
    "긴장되면 크게 숨을 내쉬고 어깨 힘을 빼세요. 힘이 들어가면 공이 자꾸 길어져요.",
    "복식에서는 파트너와 '누가 어느 공을 칠지' 미리 정하면 충돌이 줄어요.",
    "짧은 공(스톱)과 긴 공(드라이브)을 섞으면 상대 리듬을 깰 수 있어요.",
    "연습할 때 한 가지 기술만 30분 집중하면, 이것저것 하는 것보다 훨씬 빨리 늘어요."
];

// =====================================================
// 📁 파일 I/O (동시성 보호)
// =====================================================

function ensureDir() {
    try {
        var dir = new java.io.File(DATA_DIR);
        if (!dir.exists()) dir.mkdirs();
        var bdir = new java.io.File(BACKUP_DIR);
        if (!bdir.exists()) bdir.mkdirs();
    } catch (e) {}
}

function loadJSON(path, defaultVal) {
    try {
        var file = new java.io.File(path);
        if (!file.exists()) return defaultVal;

        var reader = new java.io.BufferedReader(new java.io.FileReader(file));
        var line = "";
        var content = "";
        while ((line = reader.readLine()) !== null) {
            content += line;
        }
        reader.close();

        if (!content || content === "") return defaultVal;
        return JSON.parse(content);
    } catch (e) {
        return defaultVal;
    }
}

function saveJSON(path, data) {
    try {
        ensureDir();
        var writer = new java.io.FileWriter(path);
        writer.write(JSON.stringify(data));
        writer.close();
    } catch (e) {}
}

/**
 * updateJSON: load → 수정 → save 를 하나의 잠금 구간으로.
 * 동시에 들어온 메시지가 서로의 변경을 덮어쓰지 않도록 ReentrantLock 사용.
 */
var __FILE_LOCKS__ = {};

function getFileLock(path) {
    if (!__FILE_LOCKS__[path]) {
        __FILE_LOCKS__[path] = new java.util.concurrent.locks.ReentrantLock();
    }
    return __FILE_LOCKS__[path];
}

function updateJSON(path, defaultVal, mutator) {
    var lock = getFileLock(path);
    lock.lock();
    try {
        var data = loadJSON(path, defaultVal);
        var toSave = mutator(data);
        if (typeof toSave !== "undefined" && toSave !== null) {
            saveJSON(path, toSave);
            return toSave;
        }
        return data;
    } catch (e) {
        return loadJSON(path, defaultVal);
    } finally {
        lock.unlock();
    }
}

/**
 * 핵심 파일 자동 백업 (하루 1회)
 */
function autoBackupOncePerDay() {
    try {
        ensureDir();
        var config = loadJSON(FILE_CONFIG, {});
        var today = getTodayKey();
        if (config.lastBackupDate === today) return;

        var targets = [
            { src: FILE_BUNGGAE, name: "bunggae" },
            { src: FILE_POINT, name: "point" },
            { src: FILE_STREAK, name: "streak" },
            { src: FILE_ELO, name: "elo" },
            { src: FILE_USERS, name: "users" },
            { src: FILE_MATCHES_HISTORY, name: "matches_history" },
            { src: FILE_RESERVATIONS, name: "reservations" }
        ];

        for (var i = 0; i < targets.length; i++) {
            var data = loadJSON(targets[i].src, null);
            if (data !== null) {
                saveJSON(BACKUP_DIR + targets[i].name + "_" + today + ".json", data);
            }
        }

        config.lastBackupDate = today;
        saveJSON(FILE_CONFIG, config);
    } catch (e) {}
}

// =====================================================
// 📅 날짜/시간
// =====================================================

function getTodayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function getYesterdayKey() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function getNowText() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() +
        " " + d.getHours() + ":" + d.getMinutes();
}

function getAwardDayKey(dateObj) {
    var d = dateObj || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

// v16.1: 주(week) 키 — 그 해의 몇 번째 주인지. 주간 랭킹 비교에 사용.
function getWeekKey(dateObj) {
    var d = dateObj || new Date();
    var year = d.getFullYear();
    var start = new Date(year, 0, 1);
    var diffDays = Math.floor((d - start) / (24 * 60 * 60 * 1000));
    var week = Math.floor((diffDays + start.getDay()) / 7);
    return year + "-W" + week;
}

// =====================================================
// 🧰 공통 유틸
// =====================================================

function normalizeName(name) {
    if (!name) return "";
    name = String(name).replace(/[·/_\-]/g, " ").replace(/\s+/g, " ").trim();
    for (var k in ALIASES) {
        if (name.indexOf(k) >= 0) {
            name = name.replace(k, ALIASES[k]);
        }
    }
    return name.trim();
}

function getShortName(sender) {
    var normalized = normalizeName(sender);
    var parts = normalized.split(/\s+/);
    if (parts.length === 0) return normalized;
    return parts[parts.length - 1];
}

function safeShort(text, maxLen) {
    if (!text) return "";
    text = String(text).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > maxLen) return text.substring(0, maxLen) + "...";
    return text;
}

function getRankScore(rank) {
    if (!rank) return 1;
    if (rank === "초보") return 1;
    if (rank === "초심") return 1;
    if (rank === "초심부") return 2;
    if (rank === "선수부") return 11;
    var match = String(rank).match(/([0-9]+)부/);
    if (match) return parseInt(match[1], 10);
    return 1;
}

function extractRank(fullName) {
    var rank = "초보";
    var match = String(fullName).match(/(\d+부|선수부|초심부|초심|초보)/);
    if (match) rank = match[1];
    return rank;
}

function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

// =====================================================
// 👑 관리자
// =====================================================

function isAdmin(sender) {
    for (var i = 0; i < ADMINS.length; i++) {
        if (sender.indexOf(ADMINS[i]) >= 0) return true;
    }
    var admins = loadJSON(FILE_ADMINS, { list: [] });
    return admins.list.indexOf(sender) >= 0 ||
           admins.list.indexOf(getShortName(sender)) >= 0;
}

function addAdmin(nickname) {
    var added = false;
    updateJSON(FILE_ADMINS, { list: [] }, function(admins) {
        if (admins.list.indexOf(nickname) === -1) {
            admins.list.push(nickname);
            added = true;
            return admins;
        }
        return undefined;
    });
    return added;
}

// =====================================================
// 🚫 차단
// =====================================================

function isBlocked(sender) {
    var blocked = loadJSON(FILE_BLOCKED, { list: [] });
    return blocked.list.indexOf(sender) >= 0 ||
           blocked.list.indexOf(getShortName(sender)) >= 0;
}

function blockUser(nickname) {
    var added = false;
    updateJSON(FILE_BLOCKED, { list: [] }, function(blocked) {
        if (blocked.list.indexOf(nickname) === -1) {
            blocked.list.push(nickname);
            added = true;
            return blocked;
        }
        return undefined;
    });
    return added;
}

function unblockUser(nickname) {
    var removed = false;
    updateJSON(FILE_BLOCKED, { list: [] }, function(blocked) {
        var index = blocked.list.indexOf(nickname);
        if (index >= 0) {
            blocked.list.splice(index, 1);
            removed = true;
            return blocked;
        }
        return undefined;
    });
    return removed;
}

// =====================================================
// 🔇 도배 방지
// =====================================================

function checkSpam(sender) {
    var now = new Date().getTime();
    var isSpam = false;
    updateJSON(FILE_SPAM, {}, function(spam) {
        if (!spam[sender]) {
            spam[sender] = { count: 1, lastTime: now };
            return spam;
        }
        var timeDiff = now - spam[sender].lastTime;
        if (timeDiff > SPAM_WINDOW) {
            spam[sender] = { count: 1, lastTime: now };
            return spam;
        }
        spam[sender].count++;
        spam[sender].lastTime = now;
        isSpam = spam[sender].count > SPAM_LIMIT;
        return spam;
    });
    return isSpam;
}

// =====================================================
// 📊 통계
// =====================================================

function incrementStat(key) {
    updateJSON(FILE_STATS, {}, function(stats) {
        if (!stats[key]) stats[key] = 0;
        stats[key]++;
        return stats;
    });
}

// =====================================================
// 🔑 API 키 관리
// =====================================================

function loadAPIKey() {
    if (GEMINI_API_KEY && GEMINI_API_KEY !== "") return GEMINI_API_KEY;
    var config = loadJSON(FILE_CONFIG, {});
    GEMINI_API_KEY = config.geminiKey || "";
    return GEMINI_API_KEY;
}

function saveAPIKey(key) {
    updateJSON(FILE_CONFIG, {}, function(config) {
        config.geminiKey = key;
        return config;
    });
    GEMINI_API_KEY = key;
}

function clearAPIKey() {
    updateJSON(FILE_CONFIG, {}, function(config) {
        config.geminiKey = "";
        return config;
    });
    GEMINI_API_KEY = "";
}

function getApiStatus() {
    loadAPIKey();
    if (!GEMINI_API_KEY) return "🔑 Gemini API 상태\n\n❌ 미설정";
    var masked = GEMINI_API_KEY.substring(0, 8) + "..." +
        GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4);
    return "🔑 Gemini API 상태\n\n✅ 설정됨\n" + masked + "\n모델: " + GEMINI_MODEL;
}

// =====================================================
// 🤖 Gemini 호출 (v16.2: 재시도 + 에러힌트 + 강화 프롬프트)
// =====================================================

function callGeminiText(promptText) {
    loadAPIKey();
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "") return null;

    var lastError = "";
    for (var attempt = 0; attempt < 2; attempt++) {
        try {
            var url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                      GEMINI_MODEL + ":generateContent";
            var body = {
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
            };
            var response = org.jsoup.Jsoup.connect(url)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", GEMINI_API_KEY)
                .ignoreContentType(true)
                .ignoreHttpErrors(true)
                .timeout(20000)
                .requestBody(JSON.stringify(body))
                .post()
                .text();

            var data = JSON.parse(response);
            if (data.error) {
                lastError = (data.error.message || "API_ERROR").toString().slice(0, 120);
                try { Log.e("GeminiError", lastError); } catch (e0) {}
                try { java.lang.Thread.sleep(400); } catch (e1) {}
                continue;
            }
            if (
                data.candidates &&
                data.candidates.length > 0 &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0
            ) {
                return data.candidates[0].content.parts[0].text.trim();
            }
            lastError = "EMPTY_RESPONSE";
            try { Log.e("GeminiEmpty", String(response).slice(0, 200)); } catch (e2) {}
        } catch (e) {
            lastError = String(e).slice(0, 120);
            try { Log.e("GeminiException", lastError); } catch (e3) {}
            try { java.lang.Thread.sleep(400); } catch (e4) {}
        }
    }
    // 마지막 에러를 전역에 남겨 관리자 힌트용
    try { __LAST_GEMINI_ERROR__ = lastError; } catch (e5) {}
    return null;
}

var __LAST_GEMINI_ERROR__ = "";

function buildSystemPrompt(question, sender) {
    return (
        "당신은 '세종이' — 세종시 탁구 커뮤니티 AI 비서입니다.\n" +
        "역할: 탁구방 운영 보조, 초보 코치, 코트/복컴 안내, 이웃 연결.\n\n" +
        "[지역 지식 — 모르면 추측 금지, 확인 유도]\n" +
        "- 복컴(복합커뮤니티센터): 주민 예약제. 이용료 저렴(예: 2시간 2,000원대).\n" +
        "- 예약: 세종시 통합예약 onestop.sejong.go.kr , 보통 14일 전, 1인 횟수 제한.\n" +
        "- 사설 클럽: 리그·레슨·실력대. 예) 대평 박범근탁구클럽, 나성 엘스텝 등.\n" +
        "- 아파트 커뮤니티 탁구장: 입주민 전용 多. 시설·시간은 단지마다 다름.\n" +
        "- '어디가 제일 좋냐'는 실력대·거리·시간대에 따라 다름. 동/부수/시간을 물어보고 추천.\n" +
        "- 카톡 명령 안내 가능: 세종 인원/이웃/벙개/매칭/탁구장/오늘모집/도움말.\n\n" +
        "[말투]\n- 한국어, 짧고 친근. 500자 이내. 초보자도 이해.\n" +
        "- 정치/비방 금지. 모르면 모른다고.\n" +
        "- 가능하면 마지막에 다음 행동 1줄 제안 (예: 세종 탁구장 도담동).\n\n" +
        "질문자: " + sender + "\n질문: " + question
    );
}

function askGemini(question, sender) {
    loadAPIKey();
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "") {
        return "━━━ 🤖 AI 기능 안내 ━━━\n\n" +
               "AI 기능을 사용하려면 관리자가 먼저 설정해야 해요.\n\n" +
               "관리자 명령:\n세종 API설정 AIzaSy...\n\n" +
               "API 없이도 매칭/벙개/출석/인원/이웃/오늘모집은 사용 가능해요.";
    }

    var faqHit = tryFaqAnswer(question);
    if (faqHit) {
        incrementStat("faq_hits");
        return "📌 [빠른 안내]\n\n" + faqHit;
    }

    var answer = callGeminiText(buildSystemPrompt(question, sender));
    if (!answer) {
        var hint = "⚠️ AI 응답 실패\n잠시 후 다시 시도해주세요.\n💡 세종 AI테스트 후 재시도, 또는 세종 faq";
        if (isAdmin(sender) && __LAST_GEMINI_ERROR__) {
            hint += "\n(관리자) 원인: " + __LAST_GEMINI_ERROR__;
        }
        return hint;
    }

    incrementStat("ai_questions");
    addAwardLog("AI질문", sender, question);
    return "🤖 [AI 답변]\n\n" + answer;
}

function testAI() {
    __LAST_GEMINI_ERROR__ = "";
    var answer = callGeminiText("짧게 답하세요. 세종 탁구방 AI 테스트 성공이라고 말해줘.");
    if (!answer) {
        var msg = "❌ AI 테스트 실패\nAPI 키 또는 네트워크를 확인해주세요.";
        if (__LAST_GEMINI_ERROR__) msg += "\n원인: " + __LAST_GEMINI_ERROR__;
        return msg;
    }
    return "✅ AI 테스트 성공 (" + GEMINI_MODEL + ")\n\n" + answer;
}


// =====================================================
// 👤 회원 DB
// =====================================================

function getInitialMembers() {
    return [
        "고운동 8부 한스", "고운동 8부 lee", "고운동 9부 일펜", "고운동 초보 강사",
        "고운동 초심부 지오", "고운동 초심부 노마드", "고운동 6부 불리",
        "고운동 7부 백드라이브", "고운동 8부 레오", "다정동 9부 표",
        "다정동 6부 도라깨동", "다정동 6부 라이언", "다정동 7부 일삼공",
        "다정동 초심부", "다정동 8부 탁린이", "새롬동 6부 열락", "새롬동 7부 엄지척",
        "새롬동 7부 이솔", "새롬동 8부 밤눈", "새롬동 9부 티모", "새롬동 초보 세알",
        "나성동 8부 나달", "나성동 3부 달퐁", "나성동 6부 시론", "아름동 초보 헬로",
        "아름동 초심부 라이언", "한솔동 8부 졸탁", "한솔동 8부 탁초아",
        "한솔동 9부 티모를", "보람동 초보 충녕이", "산울동 8부 박선생",
        "종촌동 1부 zion", "소담동 7부 가재토말", "어진동 7부 느림보",
        "도담동 8부 제지", "도담동 9부 탁린이", "대평동 6부 도라깨동",
        "대평동 7부 임상공", "집현동 7부 팸클럽", "집현동 9부 답이"
    ];
}

function initMemberDB() {
    var added = 0;
    updateJSON(FILE_USERS, {}, function(data) {
        var members = getInitialMembers();
        if (!data.__nextId__) data.__nextId__ = 1000;
        var seen = {};

        for (var i = 0; i < members.length; i++) {
            var fullName = normalizeName(members[i]);
            if (seen[fullName]) continue;
            seen[fullName] = true;

            if (!data[fullName]) {
                var rank = extractRank(fullName);
                var parts = fullName.split(/\s+/);
                var short = parts[parts.length - 1] || fullName;
                var region = parts[0] || "미분류";

                data[fullName] = {
                    id: "U" + data.__nextId__,
                    shortName: short,
                    rank: rank,
                    region: region,
                    fullName: fullName,
                    registered: getTodayKey()
                };
                data.__nextId__++;
                added++;
            }
        }

        data.__initialized__ = true;
        data.__botVersion__ = BOT_VERSION;
        return data;
    });
    return added;
}

function updateMemberDB(sender) {
    var normalized = normalizeName(sender);
    var resultUser = null;

    updateJSON(FILE_USERS, {}, function(data) {
        if (!data.__nextId__) data.__nextId__ = 1000;

        if (data[normalized]) {
            resultUser = data[normalized];
            return undefined;
        }

        var rank = extractRank(normalized);
        var parts = normalized.split(/\s+/);
        var short = parts.length > 1 ? parts[parts.length - 1] : normalized;
        var region = parts[0] || "미분류";

        data[normalized] = {
            id: "U" + data.__nextId__,
            shortName: short,
            rank: rank,
            region: region,
            fullName: normalized,
            registered: getTodayKey()
        };
        data.__nextId__++;
        resultUser = data[normalized];
        return data;
    });

    return resultUser;
}

function searchMember(keyword) {
    keyword = normalizeName(keyword);
    if (!keyword) return "💡 사용법: 세종 검색 [이름/부수/동네]\n예: 세종 검색 8부";

    var users = loadJSON(FILE_USERS, {});
    var found = [];

    for (var key in users) {
        if (key === "__initialized__" || key === "__nextId__" || key === "__botVersion__") continue;
        var user = users[key];
        if (!user) continue;

        var rank = user.rank || "";
        var shortName = user.shortName || "";
        var region = user.region || "";
        var fullName = user.fullName || key;

        if (rank.indexOf(keyword) >= 0 || shortName.indexOf(keyword) >= 0 ||
            region.indexOf(keyword) >= 0 || fullName.indexOf(keyword) >= 0) {
            found.push(shortName + " (" + region + " " + rank + ")");
        }
    }

    if (found.length === 0) return "❌ 검색 결과 없음";

    var result = "🔍 [" + keyword + "] 검색 결과 " + found.length + "명\n\n";
    for (var i = 0; i < found.length && i < 40; i++) {
        result += (i + 1) + ". " + found[i] + "\n";
    }
    if (found.length > 40) result += "\n외 " + (found.length - 40) + "명 더 있음";
    return result;
}

// =====================================================
// 🌤️ 날씨 (현재 온도 한 줄)
// =====================================================

function fetchWeatherNow(city) {
    try {
        var url = "https://wttr.in/" + city + "?format=j1&lang=ko";
        var response = org.jsoup.Jsoup.connect(url)
            .ignoreContentType(true)
            .timeout(10000)
            .execute()
            .body();

        var data = JSON.parse(response);
        var c = data.current_condition[0];
        return "🌤️ 세종 현재 " + c.temp_C + "°C";
    } catch (e) {
        return "❌ 날씨 정보를 불러오지 못했어요.";
    }
}

// =====================================================
// 🍽️ 생활 정보 (1~4생활권, 3곳 랜덤)
// =====================================================

function getRealSejongRestaurant() {
    var places = [
        { name: "황가원", type: "석갈비", loc: "어진동" },
        { name: "121번지", type: "파스타·오므라이스", loc: "어진동" },
        { name: "은희네해장국", type: "해장국·내장탕", loc: "어진동" },
        { name: "세종숯불갈비", type: "고기집", loc: "나성동" },
        { name: "번패티번", type: "수제버거", loc: "나성동" },
        { name: "포트랑", type: "베트남 쌀국수", loc: "나성동" },
        { name: "봄베이브로이", type: "정통 인도요리", loc: "새롬동" },
        { name: "9찬종로백반", type: "백반정식", loc: "새롬동" },
        { name: "목구멍", type: "고기집", loc: "도담동" },
        { name: "5.5닭갈비", type: "닭갈비", loc: "도담동" },
        { name: "맛찬들", type: "삼겹살정식", loc: "도담동" },
        { name: "희락", type: "퓨전요리", loc: "다정동" },
        { name: "서리서리", type: "김밥·콩국수", loc: "고운동" }
    ];

    var picked = shuffle(places.slice()).slice(0, 3);
    var msg = "━━━ 🍽️ 세종 맛집 추천 ━━━\n\n";
    for (var i = 0; i < picked.length; i++) {
        msg += (i + 1) + ". " + picked[i].name + " (" + picked[i].type + ")\n" +
               "   📍 " + picked[i].loc + "\n";
    }
    msg += "\n맛있게 드세요! 😋";
    return msg;
}

function getSejongCafe() {
    var cafes = [
        { name: "테라로사 세종", loc: "어진동" },
        { name: "윤연당", type: "빵·눈꽃빵", loc: "어진동" },
        { name: "바이핸커피", loc: "어진동" },
        { name: "라운지46", type: "뷰카페", loc: "나성동" },
        { name: "카페45", type: "뷰카페", loc: "나성동" },
        { name: "레조넌스커피랩", loc: "나성동" },
        { name: "몽플", loc: "나성동" },
        { name: "팡쥬르", type: "빵", loc: "종촌동" },
        { name: "헤이믈", loc: "고운동" }
    ];

    var picked = shuffle(cafes.slice()).slice(0, 3);
    var msg = "━━━ ☕ 세종 카페 추천 ━━━\n\n";
    for (var i = 0; i < picked.length; i++) {
        msg += (i + 1) + ". " + picked[i].name;
        if (picked[i].type) msg += " (" + picked[i].type + ")";
        msg += "\n   📍 " + picked[i].loc + "\n";
    }
    msg += "\n여유로운 한 잔 어떠세요? ☕";
    return msg;
}

function getYouTube() {
    return "━━━ 📺 유튜브 추천 ━━━\n\n" +
           "🏃 피지컬갤러리 - 운동/부상 예방\n" +
           "🤖 오빠두엑셀 - 업무 자동화\n" +
           "💰 슈카월드 - 경제 이슈";
}

function searchClub(keyword) {
    keyword = normalizeName(keyword || "");
    var clubs = [
        { key: "고운동", text: "🏓 고운동 탁구\n\n1. 세종탁구클럽 (사설)\n2. 고운스텝탁구센터\n3. 고운동 복컴 (예약제)\n\n💡 아파트 커뮤니티장은 단지 입주민 전용인 경우가 많아요." },
        { key: "도담동", text: "🏓 도담동 탁구\n\n1. 세종우리탁구클럽\n2. 도담복컴 (예약제)\n\n💡 복컴 예약: onestop.sejong.go.kr" },
        { key: "나성동", text: "🏓 나성동 탁구\n\n1. 엘스텝탁구클럽 (리그·레슨)\n2. 박신우탁구클럽\n\n💡 실력대 맞추려면 사설 추천" },
        { key: "대평동", text: "🏓 대평동 탁구\n\n1. 박범근탁구클럽 ★\n2. 대평동복컴\n\n💡 리그·즐탁 분위기 좋은 편" },
        { key: "새롬동", text: "🏓 새롬동 탁구\n\n1. 새롬동 복컴\n2. 인근 사설·아파트 커뮤니티\n\n💡 복컴 예약 경쟁 있을 수 있음" },
        { key: "어진동", text: "🏓 어진동 탁구\n\n1. 어진동 복컴\n2. 인근 사설 클럽" },
        { key: "보람동", text: "🏓 보람동 탁구\n\n1. 보람동 복컴\n2. 인근 클럽/커뮤니티" },
        { key: "한솔동", text: "🏓 한솔동 탁구\n\n1. 한솔 인근 복컴·커뮤니티\n2. 사설은 인근 동 이용 많음" },
        { key: "종촌동", text: "🏓 종촌동 탁구\n\n1. 단지 커뮤니티 탁구장 (입주민)\n2. 인근 복컴·사설\n\n💡 세종 이웃 종촌동" },
        { key: "집현동", text: "🏓 집현동 탁구\n\n1. 단지 커뮤니티 탁구장 (입주민)\n2. 인근 복컴·사설\n\n💡 세종 이웃 집현동" },
        { key: "소담동", text: "🏓 소담동 탁구\n\n1. 소담 인근 복컴·커뮤니티\n2. 사설은 나성·보람 쪽 이용 많음" },
        { key: "아름동", text: "🏓 아름동 탁구\n\n1. 아름 인근 시설·커뮤니티\n2. 고운·종촌 쪽 병행 가능" },
        { key: "산울동", text: "🏓 산울동 탁구

1. 산울 단지 커뮤니티 탁구장 (입주민 전용인 경우 많음)
2. 인근 복컴·사설 병행 (보람/소담/나성 쪽)
3. 방 멤버: 세종 이웃 산울동

💡 외부 방문·실력대 매칭은 사설/복컴이 더 수월한 편" },
        { key: "복컴", text: "🏓 세종 복컴 탁구 안내\n\n· 예약: onestop.sejong.go.kr\n· 이용료: 저렴 (예: 2시간 2천원대)\n· 보통 14일 전 예약, 1인 횟수 제한\n· 후보: 어진·고운·다정·새롬·보람·반곡·도담 등\n\n💡 아파트 커뮤니티장은 복컴과 별개 (입주민 전용 多)" },
        { key: "아파트", text: "🏓 아파트 커뮤니티 탁구장\n\n· 단지 시설 → 입주민 전용인 경우 많음\n· 시설·개방 시간은 단지마다 다름\n· '가장 좋은 곳'은 실력·거리·시간 따라 갈림\n\n예: 세종 탁구장 종촌동\n또는 세종 질문 도담동 아파트 탁구장 저녁 추천" }
    ];

    if (!keyword) {
        return "💡 사용법: 세종 탁구장 [동이름]\n예: 세종 탁구장 고운동\n\n가능: 고운/도담/나성/대평/새롬/어진/보람/한솔/종촌/집현/소담/아름/복컴/아파트";
    }
    for (var i = 0; i < clubs.length; i++) {
        if (clubs[i].key.indexOf(keyword) >= 0 || keyword.indexOf(clubs[i].key) >= 0) {
            return clubs[i].text;
        }
    }
    return "❌ 해당 지역 정보가 아직 부족해요.\n가능: 고운/도담/나성/대평/새롬/어진/보람/종촌/집현/복컴/아파트\n또는: 세종 질문 " + keyword + " 탁구장 추천해줘";
}

// =====================================================
// 🔥 벙개 (동시성 보호)
// =====================================================

function createBungae(sender, args) {
    var parts = args ? args.split(/\s+/) : [];
    var place = parts[0] || "미정";
    var time = parts[1] || "미정";
    var maxStr = parts[2] || "8";
    var max = parseInt(maxStr, 10);
    if (!max || max < 2) max = 8;

    var d = new Date();
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    var dateStr = (d.getMonth() + 1) + "." + d.getDate() + "(" + days[d.getDay()] + ")";
    var hostName = getShortName(sender);

    saveJSON(FILE_BUNGGAE, {
        host: hostName, hostFull: sender, place: place, time: time,
        max: max, members: [hostName], wait: [], created: getTodayKey()
    });

    incrementStat("bunggae_created");
    addAwardLog("벙개", sender, "벙개 생성: " + place + " " + time + " 정원 " + max + "명");

    return "━━━ 🏓 벙개 모집 ━━━\n\n" +
           "📅 " + dateStr + " " + time + "\n" +
           "📍 장소: " + place + "\n" +
           "👥 정원: " + max + "명\n\n" +
           "1️⃣ " + hostName + " (벙주 👑)\n\n" +
           "💡 참가: 세종 참가\n💡 취소: 세종 참가취소\n💡 현황: 세종 벙개현황\n" +
           "🏆 밤 9시 이후 오늘의 벙개 상장 자동 발송";
}

function joinBungae(sender) {
    var name = getShortName(sender);
    var outcome = "";

    updateJSON(FILE_BUNGGAE, { host: "", members: [], wait: [], max: 8 }, function(data) {
        if (!data.host) { outcome = "❌ 진행 중인 벙개가 없어요."; return undefined; }
        if (data.members.indexOf(name) >= 0) { outcome = "ℹ️ 이미 참가 중이에요."; return undefined; }
        if (data.wait.indexOf(name) >= 0) { outcome = "ℹ️ 이미 대기 중이에요."; return undefined; }

        if (data.members.length >= data.max) {
            data.wait.push(name);
            outcome = "⏸️ 정원이 가득 차서 대기 등록됐어요.\n대기 순번: " + data.wait.length;
            return data;
        }

        data.members.push(name);
        outcome = "✅ 벙개 참가 완료!\n\n👥 " + data.members.length + "/" + data.max + "명";
        if (data.members.length === data.max) {
            outcome += "\n\n🔥 정원 마감! 벙주 " + (data.host || "") + "님, 인원이 다 찼어요.\n" +
                       "이후 신청자는 자동으로 대기 등록됩니다.";
        }
        return data;
    });

    if (outcome.indexOf("✅") === 0) {
        incrementStat("bunggae_joins");
        addAwardLog("벙개참가", sender, "벙개 참가");
    } else if (outcome.indexOf("⏸️") === 0) {
        addAwardLog("벙개대기", sender, "벙개 대기 등록");
    }
    return outcome;
}

function leaveBungae(sender) {
    var name = getShortName(sender);
    var outcome = "";
    var promoted = "";

    updateJSON(FILE_BUNGGAE, { host: "", members: [], wait: [], max: 8 }, function(data) {
        if (!data.host) { outcome = "❌ 진행 중인 벙개가 없어요."; return undefined; }

        var idx = data.members.indexOf(name);
        var widx = data.wait.indexOf(name);

        if (idx >= 0) {
            data.members.splice(idx, 1);
            if (data.wait && data.wait.length > 0) {
                promoted = data.wait.shift();
                data.members.push(promoted);
            }
            outcome = "leave_member";
            return data;
        }

        if (widx >= 0) {
            data.wait.splice(widx, 1);
            outcome = "leave_wait";
            return data;
        }

        outcome = "ℹ️ 참가/대기 명단에 없어요.";
        return undefined;
    });

    if (outcome === "leave_member") {
        addAwardLog("벙개취소", sender, "벙개 참가 취소");
        if (promoted) {
            addAwardLog("벙개참가", promoted, "대기자 자동 승급으로 벙개 참가");
            return "✅ 참가 취소 완료\n\n⏫ 대기자 " + promoted + "님이 자동 참가됐어요.";
        }
        return "✅ 참가 취소 완료";
    }
    if (outcome === "leave_wait") {
        addAwardLog("벙개취소", sender, "벙개 대기 취소");
        return "✅ 대기 취소 완료";
    }
    return outcome;
}

function showBungaeStatus() {
    var data = loadJSON(FILE_BUNGGAE, { host: "", members: [], wait: [], max: 8 });
    if (!data.host) return "❌ 진행 중인 벙개가 없어요.";

    var msg = "━━━ 🏓 벙개 현황 ━━━\n\n" +
              "📍 장소: " + data.place + "\n" +
              "🕒 시간: " + data.time + "\n" +
              "👑 벙주: " + data.host + "\n" +
              "👥 인원: " + data.members.length + "/" + data.max + "\n\n";

    msg += "✅ 참가자\n";
    for (var i = 0; i < data.members.length; i++) {
        msg += (i + 1) + ". " + data.members[i] + "\n";
    }
    if (data.wait && data.wait.length > 0) {
        msg += "\n⏸️ 대기자\n";
        for (var j = 0; j < data.wait.length; j++) {
            msg += (j + 1) + ". " + data.wait[j] + "\n";
        }
    }
    return msg;
}

function cancelBungae(sender) {
    var snapshot = null;
    var allowed = false;

    updateJSON(FILE_BUNGGAE, { host: "", members: [] }, function(data) {
        if (!data.host) { snapshot = "none"; return undefined; }
        if (!isAdmin(sender) && data.host !== getShortName(sender)) { snapshot = "deny"; return undefined; }

        allowed = true;
        snapshot = {
            place: data.place, time: data.time,
            members: (data.members || []).slice()
        };
        return { host: "", members: [], wait: [], max: 8 };
    });

    if (snapshot === "none") return "❌ 진행 중인 벙개가 없어요.";
    if (snapshot === "deny") return "🚫 벙주 또는 관리자만 종료할 수 있어요.";

    if (allowed && snapshot) {
        if (snapshot.members && snapshot.members.length > 0) {
            for (var i = 0; i < snapshot.members.length; i++) {
                addAwardLog("벙개참석자", snapshot.members[i], "오늘 벙개 참석");
            }
        }
        addAwardLog("벙개종료", sender, "벙개 종료: " + snapshot.place + " " + snapshot.time);
    }
    return "🗑️ 벙개가 종료됐어요.\n오늘 밤 9시 이후 상장 대상에 반영됩니다.";
}

/**
 * v16.1: 오래된 벙개 자동 정리 (조용히)
 * 메신저봇R은 '밤에 자동 실행'이 안 되므로,
 * 다음 날 누군가 첫 메시지를 보낼 때 어제(이전) 벙개가 남아있으면 조용히 정리한다.
 * created 날짜가 오늘이 아니면 → 지난 벙개로 보고 참석자 로그만 남기고 비운다.
 */
function autoCleanupStaleBungae() {
    try {
        var today = getTodayKey();
        updateJSON(FILE_BUNGGAE, { host: "", members: [], wait: [], max: 8 }, function(data) {
            if (!data.host) return undefined;               // 진행 중 벙개 없음
            if (!data.created || data.created === today) return undefined; // 오늘 벙개는 유지

            // 어제 이전 벙개 → 참석자 기록만 남기고 조용히 정리
            if (data.members && data.members.length > 0) {
                for (var i = 0; i < data.members.length; i++) {
                    addAwardLog("벙개참석자", data.members[i], "지난 벙개 자동 정리");
                }
            }
            return { host: "", members: [], wait: [], max: 8 };
        });
    } catch (e) {}
}

// =====================================================
// 🎯 매칭
// =====================================================

function registerForMatch(sender) {
    var myInfo = updateMemberDB(sender);
    var outcome = "";

    updateJSON(FILE_MATCH, { players: [] }, function(data) {
        if (!data.players) data.players = [];
        for (var i = 0; i < data.players.length; i++) {
            if (data.players[i].name === myInfo.shortName) {
                outcome = "ℹ️ 이미 매칭 대기 중이에요.";
                return undefined;
            }
        }
        data.players.push({ name: myInfo.shortName, rank: myInfo.rank, score: getRankScore(myInfo.rank) });
        outcome = "✅ 매칭 등록 완료!\n\n👤 " + myInfo.shortName + " (" + myInfo.rank + ")\n📋 현재 대기: " + data.players.length + "명";
        return data;
    });

    if (outcome.indexOf("✅") === 0) {
        incrementStat("matches");
        addAwardLog("매칭", sender, "매칭 등록");
    }
    return outcome;
}

function cancelMatch(sender) {
    var name = getShortName(sender);
    var found = false;

    updateJSON(FILE_MATCH, { players: [] }, function(data) {
        if (!data.players) data.players = [];
        for (var i = 0; i < data.players.length; i++) {
            if (data.players[i].name === name) {
                data.players.splice(i, 1);
                found = true;
                return data;
            }
        }
        return undefined;
    });

    if (found) {
        addAwardLog("매칭취소", sender, "매칭 취소");
        return "✅ 매칭 대기 취소 완료";
    }
    return "ℹ️ 매칭 대기 명단에 없어요.";
}

function showMatchList() {
    var data = loadJSON(FILE_MATCH, { players: [] });
    if (!data.players || data.players.length === 0) return "📋 매칭 대기자가 없어요.";

    var result = "━━━ 📋 매칭 대기 ━━━\n\n";
    for (var i = 0; i < data.players.length; i++) {
        result += (i + 1) + ". " + data.players[i].name + " (" + data.players[i].rank + ")\n";
    }
    return result;
}

function startMatch() {
    var players = null;
    updateJSON(FILE_MATCH, { players: [] }, function(data) {
        if (!data.players || data.players.length < 2) return undefined;
        players = data.players.slice();
        return { players: [] };
    });

    if (!players) return "❌ 최소 2명 이상 필요해요.";

    players.sort(function(a, b) { return a.score - b.score; });

    var result = "━━━ 🎲 매칭 완료 (부수 기반) ━━━\n\n";
    for (var i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            var diff = Math.abs(players[i].score - players[i + 1].score);
            result += "🏓 " + players[i].name + " (" + players[i].rank + ")" +
                      " vs " + players[i + 1].name + " (" + players[i + 1].rank + ")";
            if (diff <= 1) result += " ✨균형";
            result += "\n";
        } else {
            result += "⏸️ " + players[i].name + " (대기)\n";
        }
    }
    addAwardLog("매칭시작", "세종이", "부수 기반 매칭 시작");
    return result;
}

function startDoubleMatch() {
    var players = null;
    updateJSON(FILE_MATCH, { players: [] }, function(data) {
        if (!data.players || data.players.length < 4) return undefined;
        players = data.players.slice();
        return { players: [] };
    });

    if (!players) return "❌ 복식은 최소 4명 필요해요.";

    players.sort(function(a, b) { return b.score - a.score; });

    var result = "━━━ 🏓 복식 팀 편성 ━━━\n\n";
    var court = 1;
    for (var i = 0; i < players.length; i += 4) {
        if (i + 3 < players.length) {
            result += "🏓 " + court + "코트\n";
            result += "🔵 " + players[i].name + " / " + players[i + 3].name + "\n";
            result += "🟠 " + players[i + 1].name + " / " + players[i + 2].name + "\n\n";
            court++;
        } else {
            result += "⏸️ 대기\n";
            for (var j = i; j < players.length; j++) {
                result += "- " + players[j].name + "\n";
            }
        }
    }
    addAwardLog("복식", "세종이", "복식 팀 편성");
    return result;
}

// =====================================================
// ✅ 출석/포인트 (v16: 더블 적립 버그 수정)
// =====================================================

function checkAttendance(sender) {
    var name = getShortName(sender);
    var todayKey = getTodayKey();
    var yesterdayKey = getYesterdayKey();

    var already = false;
    var newStreak = 1;
    var points = 0;

    // v16 핵심: 출석여부 확인 + 출석기록 + 연속계산을 하나의 잠금으로.
    // (기존엔 '이미 출석?' 확인이 잠금 밖에 있어 더블탭 시 포인트가 두 번 들어갈 수 있었음)
    updateJSON(FILE_ATTEND, {}, function(aData) {
        if (!aData[todayKey]) aData[todayKey] = [];

        if (aData[todayKey].indexOf(name) >= 0) {
            already = true;
            return undefined; // 변경 없음
        }

        aData[todayKey].push(name);

        // 연속 출석 계산 (어제 출석 + 기존 streak 있으면 +1)
        var prevStreak = loadJSON(FILE_STREAK, {})[name];
        if (prevStreak && aData[yesterdayKey] && aData[yesterdayKey].indexOf(name) >= 0) {
            newStreak = prevStreak + 1;
        } else {
            newStreak = 1;
        }

        return aData;
    });

    if (already) {
        var pData0 = loadJSON(FILE_POINT, {});
        var sData0 = loadJSON(FILE_STREAK, {});
        return "ℹ️ 이미 출석했어요!\n\n💰 " + (pData0[name] || 0) + "P\n🔥 " + (sData0[name] || 0) + "일 연속";
    }

    // streak 저장
    updateJSON(FILE_STREAK, {}, function(s) {
        s[name] = newStreak;
        return s;
    });

    var bonus = Math.min(newStreak - 1, 5);
    points = 10 + bonus;

    var totalPts = 0;
    updateJSON(FILE_POINT, {}, function(p) {
        if (!p[name]) p[name] = 0;
        p[name] += points;
        totalPts = p[name];
        return p;
    });

    incrementStat("attendances");
    addAwardLog("출석", sender, "출석 완료 " + newStreak + "일 연속");

    var msg = "✅ 출석 완료! (+" + points + "P)\n\n" +
              "💰 총 포인트: " + totalPts + "P\n🔥 연속 출석: " + newStreak + "일";
    if (newStreak >= 7) msg += "\n🎉 일주일 연속!";
    if (newStreak >= 30) msg += "\n👑 한 달 연속!";
    return msg;
}

function showPoint(sender) {
    var pData = loadJSON(FILE_POINT, {});
    var sData = loadJSON(FILE_STREAK, {});
    var name = getShortName(sender);
    return "💰 " + name + "님의 포인트\n\n포인트: " + (pData[name] || 0) + "P\n연속출석: " + (sData[name] || 0) + "일";
}

// v16.1: 내 정보 카드 — 등급·ELO·전적·연속출석·포인트를 한 장에
function showMyCard(sender) {
    var name = getShortName(sender);
    var user = updateMemberDB(sender);

    var rank = (user && user.rank) ? user.rank : "미분류";
    var region = (user && user.region) ? user.region : "미분류";

    var elo = getElo(name);

    // 전적 계산
    var history = loadJSON(FILE_MATCHES_HISTORY, []);
    var win = 0;
    var lose = 0;
    for (var i = 0; i < history.length; i++) {
        if (history[i].winner === name) win++;
        else if (history[i].loser === name) lose++;
    }
    var total = win + lose;
    var rate = total === 0 ? 0 : Math.round((win / total) * 100);

    var point = loadJSON(FILE_POINT, {})[name] || 0;
    var streak = loadJSON(FILE_STREAK, {})[name] || 0;

    // 포인트 랭킹 내 순위
    var pData = loadJSON(FILE_POINT, {});
    var pArr = [];
    for (var u in pData) pArr.push({ name: u, points: pData[u] });
    pArr.sort(function(a, b) { return b.points - a.points; });
    var myRank = 0;
    for (var j = 0; j < pArr.length; j++) {
        if (pArr[j].name === name) { myRank = j + 1; break; }
    }

    var msg = "━━━ 🪪 내 정보 카드 ━━━\n\n" +
              "👤 " + name + "\n" +
              "📍 " + region + " / " + rank + "\n\n" +
              "🏓 ELO: " + elo + "\n" +
              "🥇 전적: " + win + "승 " + lose + "패";
    if (total > 0) msg += " (승률 " + rate + "%)";
    msg += "\n🔥 연속출석: " + streak + "일\n" +
           "💰 포인트: " + point + "P";
    if (myRank > 0) msg += " (포인트 " + myRank + "위)";
    msg += "\n\n💪 오늘도 즐탁하세요!";
    return msg;
}

// v16.1: 오늘의 탁구 팁 (AI 있으면 AI, 없으면 내장 목록 랜덤)
function getTableTennisTip() {
    loadAPIKey();

    if (GEMINI_API_KEY && GEMINI_API_KEY !== "") {
        var prompt =
            "당신은 세종시 탁구 커뮤니티의 친절한 코치입니다.\n" +
            "40~60대 생활체육 탁구인에게 도움이 되는 '오늘의 탁구 팁'을 딱 하나만 알려주세요.\n" +
            "조건:\n- 2~3문장, 100자 이내로 짧게.\n- 초보자도 바로 이해하고 실천할 수 있게.\n" +
            "- 어려운 전문용어 대신 쉬운 말로.\n- 부상 예방, 기본기, 전략 중 하나.\n" +
            "- 팁 내용만 출력하세요. 인사말이나 서론 없이.";
        var aiTip = callGeminiText(prompt);
        if (aiTip) {
            return "━━━ 💡 오늘의 탁구 팁 ━━━\n\n" + aiTip + "\n\n🏓 세종이 코치 드림";
        }
    }

    // AI 실패/미설정 시 내장 목록에서
    var tip = TABLE_TENNIS_TIPS[Math.floor(Math.random() * TABLE_TENNIS_TIPS.length)];
    return "━━━ 💡 오늘의 탁구 팁 ━━━\n\n" + tip + "\n\n🏓 세종이 코치 드림";
}

// v16.1: 지난주 순위 스냅샷 로드 → { 이름: 지난주순위 }
function getLastWeekRankMap() {
    var snap = loadJSON(FILE_WEEKLY_RANK, { weekKey: "", ranks: {} });
    return snap.ranks || {};
}

// v16.1: 이번 주 순위를 스냅샷으로 저장 (주가 바뀌었을 때만)
function saveWeeklyRankSnapshotIfNewWeek() {
    var thisWeek = getWeekKey();
    updateJSON(FILE_WEEKLY_RANK, { weekKey: "", ranks: {} }, function(snap) {
        if (snap.weekKey === thisWeek) return undefined; // 이번 주 이미 저장됨

        var pData = loadJSON(FILE_POINT, {});
        var arr = [];
        for (var u in pData) arr.push({ name: u, points: pData[u] });
        arr.sort(function(a, b) { return b.points - a.points; });

        var ranks = {};
        for (var i = 0; i < arr.length; i++) {
            ranks[arr[i].name] = i + 1;
        }

        snap.weekKey = thisWeek;
        snap.ranks = ranks;
        return snap;
    });
}

// v16.1: 순위 변동 화살표 (지난주 대비)
function rankChangeArrow(name, currentRank, lastWeekMap) {
    if (typeof lastWeekMap[name] === "undefined") {
        return " 🆕";
    }
    var prev = lastWeekMap[name];
    var diff = prev - currentRank; // 양수면 순위 상승
    if (diff > 0) return " ▲" + diff;
    if (diff < 0) return " ▼" + (-diff);
    return " -";
}

function showRanking() {
    var pData = loadJSON(FILE_POINT, {});
    var sData = loadJSON(FILE_STREAK, {});
    var arr = [];

    for (var user in pData) {
        arr.push({ name: user, points: pData[user], streak: sData[user] || 0 });
    }

    arr.sort(function(a, b) { return b.points - a.points; });
    if (arr.length === 0) return "🏆 아직 랭킹 데이터가 없어요.";

    var lastWeekMap = getLastWeekRankMap();
    var hasLastWeek = false;
    for (var kk in lastWeekMap) { hasLastWeek = true; break; }

    var result = "━━━ 🏆 포인트 랭킹 TOP 10 ━━━\n\n";
    for (var i = 0; i < Math.min(10, arr.length); i++) {
        var medal = (i === 0) ? "🥇" : (i === 1) ? "🥈" : (i === 2) ? "🥉" : (i + 1) + "위";
        result += medal + " " + arr[i].name + ": " + arr[i].points + "P";
        if (arr[i].streak >= 7) result += " 🔥" + arr[i].streak;
        if (hasLastWeek) result += rankChangeArrow(arr[i].name, i + 1, lastWeekMap);
        result += "\n";
    }

    if (hasLastWeek) {
        result += "\n(▲▼ = 지난주 대비, 🆕 = 신규)";
    }
    return result;
}

// =====================================================
// 🧠 ELO / 승패 승인제 (동시성 보호)
// =====================================================

function getElo(name) {
    var data = loadJSON(FILE_ELO, {});
    if (typeof data[name] === "undefined") {
        updateJSON(FILE_ELO, {}, function(d) {
            if (typeof d[name] === "undefined") { d[name] = 1000; return d; }
            return undefined;
        });
        return 1000;
    }
    return data[name];
}

function setElo(name, score) {
    updateJSON(FILE_ELO, {}, function(data) {
        data[name] = score;
        return data;
    });
}

function requestWin(sender, args) {
    args = normalizeName(args);
    if (!args) return "💡 사용법\n세종 승리 [패자]\n또는 관리자: 세종 승리 [승자] [패자]";

    var parts = args.split(/\s+/);
    var reporter = getShortName(sender);
    var winner = "";
    var loser = "";

    if (parts.length === 1) {
        winner = reporter;
        loser = parts[0];
    } else {
        winner = parts[0];
        loser = parts[1];
        if (!isAdmin(sender) && reporter !== winner) {
            return "🚫 본인 승리만 신고할 수 있어요.\n관리자는 승자/패자 지정 가능.";
        }
    }

    if (winner === loser) return "❌ 승자와 패자가 같을 수 없어요.";

    updateJSON(FILE_PENDING_WINS, {}, function(pending) {
        pending[loser] = { winner: winner, loser: loser, requester: reporter, time: new Date().getTime() };
        return pending;
    });

    return "📨 경기 결과 승인 요청\n\n🥇 승자: " + winner + "\n🥈 패자: " + loser +
           "\n\n" + loser + "님이 5분 내\n'세종 확인' 입력하면 반영됩니다.";
}

function confirmWin(sender) {
    var name = getShortName(sender);
    var game = null;
    var expired = false;

    updateJSON(FILE_PENDING_WINS, {}, function(pending) {
        if (!pending[name]) return undefined;
        var g = pending[name];
        var now = new Date().getTime();
        if (now - g.time > PENDING_WIN_TIMEOUT) {
            delete pending[name];
            expired = true;
            return pending;
        }
        game = g;
        delete pending[name];
        return pending;
    });

    if (expired) return "⌛ 승인 시간이 지나 취소됐어요.";
    if (!game) return "❌ 승인 대기 중인 경기 결과가 없어요.";

    var winner = game.winner;
    var loser = game.loser;
    var wOld = getElo(winner);
    var lOld = getElo(loser);

    var expectedW = 1 / (1 + Math.pow(10, (lOld - wOld) / 400));
    var expectedL = 1 / (1 + Math.pow(10, (wOld - lOld) / 400));
    var wNew = Math.round(wOld + ELO_K * (1 - expectedW));
    var lNew = Math.round(lOld + ELO_K * (0 - expectedL));

    setElo(winner, wNew);
    setElo(loser, lNew);

    updateJSON(FILE_MATCHES_HISTORY, [], function(history) {
        history.push({
            winner: winner, loser: loser,
            winnerOld: wOld, loserOld: lOld,
            winnerNew: wNew, loserNew: lNew,
            date: getTodayKey()
        });
        return history;
    });

    incrementStat("elo_matches");
    addAwardLog("경기결과", winner, winner + " 승리 / " + loser + " 패배");

    var predictionSettleMsg = settlePredictionIfMatch(winner, loser);

    return "🏓 경기 결과 반영 완료!\n\n🥇 " + winner + ": " + wOld + " → " + wNew +
           "\n🥈 " + loser + ": " + lOld + " → " + lNew + predictionSettleMsg;
}

function showRecord(name) {
    name = normalizeName(name);
    if (!name) return "💡 사용법: 세종 전적 [이름]";

    var history = loadJSON(FILE_MATCHES_HISTORY, []);
    var win = 0;
    var lose = 0;

    for (var i = 0; i < history.length; i++) {
        var m = history[i];
        if (m.winner === name) win++;
        else if (m.loser === name) lose++;
    }

    var total = win + lose;
    var rate = total === 0 ? 0 : Math.round((win / total) * 100);
    var elo = getElo(name);

    return "📊 " + name + " 전적\n\n🏓 ELO: " + elo + "\n🥇 승: " + win +
           "\n🥈 패: " + lose + "\n📈 승률: " + rate + "%";
}

function showEloRanking() {
    var data = loadJSON(FILE_ELO, {});
    var arr = [];
    for (var name in data) {
        arr.push({ name: name, elo: data[name] });
    }
    arr.sort(function(a, b) { return b.elo - a.elo; });
    if (arr.length === 0) return "🏓 ELO 데이터가 아직 없어요.";

    var msg = "━━━ 🏓 ELO 랭킹 TOP 10 ━━━\n\n";
    for (var i = 0; i < arr.length && i < 10; i++) {
        var medal = (i === 0) ? "🥇" : (i === 1) ? "🥈" : (i === 2) ? "🥉" : (i + 1) + "위";
        msg += medal + " " + arr[i].name + ": " + arr[i].elo + "\n";
    }
    return msg;
}

// =====================================================
// 📅 예약
// =====================================================

function addReservation(sender, args) {
    var parts = args ? args.split(/\s+/) : [];
    if (parts.length < 2) return "💡 사용법\n세종 예약 [장소] [시간]\n예: 세종 예약 새롬복컴 19시";

    var name = getShortName(sender);
    updateJSON(FILE_RESERVATIONS, [], function(data) {
        data.push({ user: name, place: parts[0], time: parts[1], date: getTodayKey() });
        return data;
    });

    incrementStat("reservations");
    addAwardLog("예약", sender, "예약 등록: " + parts[0] + " " + parts[1]);

    return "📅 예약 등록 완료\n\n📍 장소: " + parts[0] + "\n🕒 시간: " + parts[1] + "\n👤 등록: " + name;
}

function showReservations() {
    var data = loadJSON(FILE_RESERVATIONS, []);
    if (data.length === 0) return "📭 예약 내역이 없어요.";

    var msg = "━━━ 📅 예약 현황 ━━━\n\n";
    for (var i = 0; i < data.length; i++) {
        msg += (i + 1) + ". " + data[i].place + " / " + data[i].time + " / " + data[i].user + "\n";
    }
    return msg;
}

function clearReservations(sender) {
    if (!isAdmin(sender)) return "🚫 관리자 전용 명령어입니다.";
    saveJSON(FILE_RESERVATIONS, []);
    return "🗑️ 예약 목록 초기화 완료";
}

// =====================================================
// 🤖 조용한 ReAct 감정 에이전트
// =====================================================

function loadReactAgentData() {
    return loadJSON(FILE_REACT_AGENT, { lastGlobal: 0, userLast: {}, dayKey: "", dayCount: 0 });
}

function saveReactAgentData(data) {
    saveJSON(FILE_REACT_AGENT, data);
}

function isProbablyMediaMessage(msg) {
    var t = String(msg || "").trim();
    var mediaPrefixes = [
        "사진", "사진:", "동영상", "동영상:", "이모티콘", "스티커",
        "음성메시지", "파일", "지도", "연락처", "메시지가 삭제되었습니다",
        "삭제된 메시지", "투표", "앨범"
    ];
    for (var i = 0; i < mediaPrefixes.length; i++) {
        if (t.indexOf(mediaPrefixes[i]) === 0) return true;
    }
    return false;
}

function isSensitiveReactContext(msg) {
    var t = String(msg || "").toLowerCase();
    var sensitive = [
        "선거", "투표", "정치", "대통령", "국회의원", "시장", "도지사",
        "정당", "민주당", "국민의힘", "후보", "부정선거", "시위", "전쟁",
        "사망", "사고", "범죄", "고소", "신고"
    ];
    for (var i = 0; i < sensitive.length; i++) {
        if (t.indexOf(sensitive[i].toLowerCase()) >= 0) return true;
    }
    return false;
}

function isTinyReactionOnly(msg) {
    var t = String(msg || "").replace(/\s+/g, "").trim();
    if (t.length <= 2) return true;
    if (/^[ㅋㅎㅠㅜㅡ~!.?]+$/.test(t)) return true;
    if (/^[👍👏🙌🙏😂🤣😅😊😉😍😆🔥✨❤️💙💚]+$/.test(t)) return true;
    return false;
}

function hasTableTennisContext(msg) {
    var t = String(msg || "").toLowerCase();
    var keywords = [
        "탁구", "벙개", "번개", "복컴", "라켓", "러버", "드라이브",
        "스매싱", "스매쉬", "커트", "쇼트", "푸시", "서브", "리시브",
        "연승", "졌", "이겼", "이김", "승리", "패배", "한판", "한 판",
        "부수", "elo", "에로", "레슨", "관장", "셰이크", "펜홀더",
        "지금칠", "지금 칠", "칠사람", "칠 사람", "치러", "운동가", "운동 가"
    ];
    for (var i = 0; i < keywords.length; i++) {
        if (t.indexOf(keywords[i].toLowerCase()) >= 0) return true;
    }
    return false;
}

function isLateNight() {
    var h = new Date().getHours();
    return (h >= 22 || h < 5);
}

function shouldRunReactAgent(msg, sender) {
    if (!REACT_AGENT_ENABLED) return false;
    if (!msg || msg.indexOf(TRIGGER) === 0) return false;
    if (String(msg).length < 4) return false;
    if (String(msg).indexOf("http") >= 0) return false;
    if (isProbablyMediaMessage(msg)) return false;
    if (isSensitiveReactContext(msg)) return false;
    if (isTinyReactionOnly(msg)) return false;
    if (!loadAPIKey()) return false;
    if (!hasTableTennisContext(msg)) return false;

    var now = new Date().getTime();
    var short = getShortName(sender);
    var today = getTodayKey();
    var data = loadReactAgentData();

    if (data.dayKey !== today) {
        data.dayKey = today;
        data.dayCount = 0;
    }
    if (data.dayCount >= REACT_AGENT_DAILY_LIMIT) return false;
    if (data.lastGlobal && now - data.lastGlobal < REACT_AGENT_GLOBAL_COOLDOWN) return false;
    if (data.userLast && data.userLast[short] && now - data.userLast[short] < REACT_AGENT_USER_COOLDOWN) return false;

    var rate = isLateNight() ? REACT_NIGHT_RATE : REACT_AGENT_RATE;
    if (Math.random() >= rate) return false;

    data.lastGlobal = now;
    if (!data.userLast) data.userLast = {};
    data.userLast[short] = now;
    data.dayCount = (data.dayCount || 0) + 1;
    saveReactAgentData(data);
    return true;
}

function maybeRunReactEmotionAgent(msg, sender, replier) {
    try {
        if (!shouldRunReactAgent(msg, sender)) return false;

        var currentHour = new Date().getHours();
        var timeContext = "";
        if (currentHour >= 22 || currentHour < 5) {
            timeContext = "현재는 밤 10시 이후 야간/새벽이다. 이 시간에 운동하자고 하면 귀엽고 점잖게 말려라.";
        } else if (currentHour >= 5 && currentHour < 8) {
            timeContext = "현재는 이른 아침이다. 너무 과한 텐션은 살짝 놀리되 응원해라.";
        } else {
            timeContext = "현재는 일반 활동 시간대이다.";
        }

        var name = getShortName(sender);
        var elo = getElo(name);
        var point = getPointBalance(name);

        var prompt =
            "너는 세종시 탁구 커뮤니티 단톡방의 따뜻하고 센스 있는 AI 친구 '세종이'다.\n" +
            "지금은 누군가 탁구/벙개/복컴/경기 관련 이야기를 했다. 여기에만 짧게 반응해라.\n" +
            "끼어들 가치가 있으면 1~2문장, 최대 3줄로 짧고 다정하게 말해라.\n" +
            "조금이라도 애매하거나, 굳이 끼어들 필요가 없으면 다른 말 없이 정확히 '패스'라고만 답해라.\n" +
            "되도록 자주 '패스'를 선택해라. 꼭 필요할 때만 말하는 과묵한 친구다.\n\n" +
            "[말투]\n- 존댓말, 상냥함, 부드러운 유머\n- 비꼬기보다 귀여운 공감\n- 이모티콘은 1~2개 정도 자연스럽게\n\n" +
            "[금지]\n- 상처 주는 조롱, 공격적 딴지 금지\n- 외모/가족/정치/선거/성적 농담 금지\n- 길게 설명 금지\n- 도박, 토토 표현 금지\n\n" +
            "[시간 맥락]\n" + timeContext + "\n\n" +
            "[회원 정보: 탁구 관련 대화일 때만 참고]\n이름: " + name + ", ELO: " + elo + ", 포인트: " + point + "P\n\n" +
            "[대화]\n" + sender + ": " + msg;

        var result = callGeminiText(prompt);
        if (!result) return false;

        result = String(result).trim();
        if (result === "패스" || result.indexOf("패스") === 0) return false;
        if (result.length > 260) result = result.substring(0, 260) + "...";

        replier.reply("🤖💬 세종이 한마디\n\n" + result);
        incrementStat("react_agent_replies");
        addAwardLog("감정난입", "세종이", result);
        return true;
    } catch (e) {
        return false;
    }
}

// =====================================================
// 🏓 ELO 기반 승부예측 / 응원픽 (포인트 동시성 보호)
// =====================================================

function getPointBalance(name) {
    var pData = loadJSON(FILE_POINT, {});
    return pData[name] || 0;
}

function addPointBalance(name, amount) {
    updateJSON(FILE_POINT, {}, function(pData) {
        if (!pData[name]) pData[name] = 0;
        pData[name] += amount;
        if (pData[name] < 0) pData[name] = 0;
        return pData;
    });
}

function spendPointBalance(name, amount) {
    var ok = false;
    updateJSON(FILE_POINT, {}, function(pData) {
        var current = pData[name] || 0;
        if (current < amount) { ok = false; return undefined; }
        pData[name] = current - amount;
        ok = true;
        return pData;
    });
    return ok;
}

function samePlayerName(a, b) {
    return getShortName(normalizeName(a)) === getShortName(normalizeName(b));
}

function expectedRate(ra, rb) {
    return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function percentText(rate) {
    return Math.round(rate * 100) + "%";
}

function loadPredictionData() {
    return loadJSON(FILE_PREDICTIONS, { active: false, history: [] });
}

function savePredictionData(data) {
    saveJSON(FILE_PREDICTIONS, data);
}

function normalizePredictionStatus(data) {
    if (!data || !data.active) return data;
    var now = new Date().getTime();
    if (data.status === "open" && now > data.closeAt) {
        data.status = "closed";
        savePredictionData(data);
    }
    return data;
}

function predictionStatusText() {
    var data = normalizePredictionStatus(loadPredictionData());
    if (!data.active) {
        return "📭 진행 중인 승부예측이 없어요.\n\n💡 시작: 세종 도전 [상대]\n💡 수동개설: 세종 예측판 [선수1] [선수2]";
    }

    var remain = Math.max(0, Math.ceil((data.closeAt - new Date().getTime()) / 1000));
    var picks = data.picks || [];
    var p1Total = 0;
    var p2Total = 0;
    for (var i = 0; i < picks.length; i++) {
        if (samePlayerName(picks[i].pick, data.p1)) p1Total += picks[i].point;
        else if (samePlayerName(picks[i].pick, data.p2)) p2Total += picks[i].point;
    }

    return "🏓🔥 세종 승부예측 현황 🔥🏓\n\n" +
           "🥇 " + data.p1 + " (" + data.r1 + ") vs " + data.p2 + " (" + data.r2 + ")\n" +
           "📊 예상승률: " + data.p1 + " " + percentText(data.p1Rate) + " / " + data.p2 + " " + percentText(data.p2Rate) + "\n" +
           "🎟️ 상태: " + (data.status === "open" ? "픽 접수중" : "픽 마감") + "\n" +
           "⏱️ 남은 시간: " + remain + "초\n\n" +
           "📦 응원포인트\n• " + data.p1 + ": " + p1Total + "P\n• " + data.p2 + ": " + p2Total + "P\n\n" +
           "💡 참여: 세종 픽 [선수] [포인트]\n※ 현금/상품 없는 단톡방 예능 포인트 이벤트입니다 😆";
}

function openPredictionEvent(p1, p2, createdBy) {
    p1 = getShortName(normalizeName(p1));
    p2 = getShortName(normalizeName(p2));
    if (!p1 || !p2) return "💡 사용법: 세종 예측판 [선수1] [선수2]";
    if (samePlayerName(p1, p2)) return "❌ 같은 사람끼리는 승부예측을 열 수 없어요.";

    var data = normalizePredictionStatus(loadPredictionData());
    if (data.active) return "ℹ️ 이미 진행 중인 승부예측이 있어요.\n\n" + predictionStatusText();

    var r1 = getElo(p1);
    var r2 = getElo(p2);
    var p1Rate = expectedRate(r1, r2);
    var p2Rate = 1 - p1Rate;
    var now = new Date().getTime();

    data = {
        active: true, status: "open", p1: p1, p2: p2, r1: r1, r2: r2,
        p1Rate: p1Rate, p2Rate: p2Rate,
        createdBy: getShortName(createdBy || "세종이"),
        createdAt: now, closeAt: now + PREDICTION_TIMEOUT,
        picks: [], history: data.history || []
    };
    savePredictionData(data);

    incrementStat("prediction_boards");
    addAwardLog("승부예측", "세종이", p1 + " vs " + p2 + " 승부예측 오픈");

    return "🚨🏓 세종 승부예측 오픈 🏓🚨\n\n🔥 " + p1 + " vs " + p2 + "\n" +
           "📊 ELO: " + p1 + " " + r1 + " / " + p2 + " " + r2 + "\n" +
           "🔮 예상승률: " + p1 + " " + percentText(p1Rate) + " / " + p2 + " " + percentText(p2Rate) + "\n\n" +
           "🎟️ 참여: 세종 픽 [선수] [포인트]\n예: 세종 픽 " + p1 + " 10\n⏱️ 5분 뒤 픽 마감!\n\n" +
           "※ 현금/상품 없는 예능용 응원포인트 이벤트입니다 😆🔥";
}

function openChallengePrediction(sender, args) {
    args = normalizeName(args);
    if (!args) return "💡 사용법: 세종 도전 [상대]\n예: 세종 도전 박범근";
    var p1 = getShortName(sender);
    var p2 = args.split(/\s+/)[0];
    return openPredictionEvent(p1, p2, sender);
}

function openManualPrediction(sender, args) {
    args = normalizeName(args);
    if (!args) return predictionStatusText();
    var parts = args.split(/\s+/);
    if (parts.length < 2) return "💡 사용법: 세종 예측판 [선수1] [선수2]";
    return openPredictionEvent(parts[0], parts[1], sender);
}

function placePredictionPick(sender, args) {
    var data = normalizePredictionStatus(loadPredictionData());
    if (!data.active) return "📭 진행 중인 승부예측이 없어요.";
    if (data.status !== "open") return "⏱️ 이미 픽 접수가 마감됐어요.\n경기 결과를 기다려주세요.";

    args = normalizeName(args);
    var parts = args ? args.split(/\s+/) : [];
    if (parts.length < 2) return "💡 사용법: 세종 픽 [선수] [포인트]\n예: 세종 픽 " + data.p1 + " 10";

    var pick = parts[0];
    if (!samePlayerName(pick, data.p1) && !samePlayerName(pick, data.p2)) {
        return "❌ 현재 예측 선수는 " + data.p1 + " / " + data.p2 + " 입니다.";
    }

    var point = parseInt(parts[1], 10);
    if (!point || point < PREDICTION_MIN_POINT) return "❌ 포인트는 " + PREDICTION_MIN_POINT + "P 이상 숫자로 입력해주세요.";
    if (point > PREDICTION_MAX_POINT) return "❌ 과열 방지로 1회 최대 " + PREDICTION_MAX_POINT + "P까지만 가능해요.";

    var name = getShortName(sender);
    var dupOrClosed = "";
    updateJSON(FILE_PREDICTIONS, { active: false, history: [] }, function(pdata) {
        if (!pdata.active || pdata.status !== "open") {
            dupOrClosed = "⏱️ 이미 픽 접수가 마감됐어요.\n경기 결과를 기다려주세요.";
            return undefined;
        }
        if (!pdata.picks) pdata.picks = [];
        for (var i = 0; i < pdata.picks.length; i++) {
            if (pdata.picks[i].user === name) {
                dupOrClosed = "ℹ️ 이미 픽을 등록했어요. 중복 참여는 막아둘게요.";
                return undefined;
            }
        }
        return undefined;
    });

    if (dupOrClosed) return dupOrClosed;

    if (!spendPointBalance(name, point)) {
        return "❌ 포인트가 부족해요.\n현재 보유: " + getPointBalance(name) + "P";
    }

    var normalizedPick = samePlayerName(pick, data.p1) ? data.p1 : data.p2;
    var registered = false;

    updateJSON(FILE_PREDICTIONS, { active: false, history: [] }, function(pdata) {
        if (!pdata.active || pdata.status !== "open") return undefined;
        if (!pdata.picks) pdata.picks = [];
        for (var i = 0; i < pdata.picks.length; i++) {
            if (pdata.picks[i].user === name) return undefined;
        }
        pdata.picks.push({ user: name, pick: normalizedPick, point: point, time: getNowText() });
        registered = true;
        return pdata;
    });

    if (!registered) {
        addPointBalance(name, point);
        return "⏱️ 픽 접수가 막 마감됐어요. 포인트는 환불했어요.";
    }

    addAwardLog("응원픽", sender, normalizedPick + "에게 " + point + "P 응원픽");

    return "🎟️ 응원픽 완료!\n\n👤 " + name + "\n🏓 선택: " + normalizedPick +
           "\n💰 사용: " + point + "P\n\n남은 포인트: " + getPointBalance(name) + "P";
}

function cancelPredictionEvent(sender) {
    if (!isAdmin(sender)) return "🚫 관리자 전용 명령어입니다.";
    var refunds = [];

    updateJSON(FILE_PREDICTIONS, { active: false, history: [] }, function(data) {
        if (!data.active) return undefined;
        var picks = data.picks || [];
        for (var i = 0; i < picks.length; i++) {
            refunds.push({ user: picks[i].user, point: picks[i].point });
        }
        data.history = data.history || [];
        data.history.unshift({ p1: data.p1, p2: data.p2, result: "cancelled", time: getNowText() });
        data.active = false;
        data.status = "cancelled";
        data.picks = [];
        return data;
    });

    if (refunds.length === 0) {
        var d = loadPredictionData();
        if (!d || d.status !== "cancelled") return "📭 취소할 승부예측이 없어요.";
    }

    for (var i = 0; i < refunds.length; i++) {
        addPointBalance(refunds[i].user, refunds[i].point);
    }
    return "🗑️ 승부예측을 취소하고 참여 포인트를 모두 환불했어요.";
}

function settlePredictionIfMatch(winner, loser) {
    try {
        var data = normalizePredictionStatus(loadPredictionData());
        if (!data.active) return "";

        var pairMatch =
            (samePlayerName(winner, data.p1) && samePlayerName(loser, data.p2)) ||
            (samePlayerName(winner, data.p2) && samePlayerName(loser, data.p1));
        if (!pairMatch) return "";

        var picks = data.picks || [];
        var totalPot = 0;
        var winnerStake = 0;
        for (var i = 0; i < picks.length; i++) {
            totalPot += picks[i].point;
            if (samePlayerName(picks[i].pick, winner)) winnerStake += picks[i].point;
        }

        var resultMsg = "\n\n━━━ 🎟️ 승부예측 정산 ━━━\n\n🏓 결과: " + winner + " 승!\n";

        if (picks.length === 0) {
            resultMsg += "참여자가 없어 조용히 마감됐어요 😌";
        } else if (winnerStake === 0) {
            for (var r = 0; r < picks.length; r++) {
                addPointBalance(picks[r].user, picks[r].point);
            }
            resultMsg += "정답자가 없어서 전원 환불 처리했어요.\n세종이도 이 결과는 예상 못 했습니다 😂";
        } else {
            resultMsg += "🎁 정답자 보상\n";
            for (var j = 0; j < picks.length; j++) {
                if (samePlayerName(picks[j].pick, winner)) {
                    var reward = Math.floor(totalPot * picks[j].point / winnerStake);
                    if (reward < picks[j].point) reward = picks[j].point;
                    addPointBalance(picks[j].user, reward);
                    resultMsg += "• " + picks[j].user + ": +" + reward + "P\n";
                }
            }
            resultMsg += "\n※ 단톡방 예능 포인트 정산 완료 😆";
        }

        updateJSON(FILE_PREDICTIONS, { active: false, history: [] }, function(d) {
            d.history = d.history || [];
            d.history.unshift({
                p1: d.p1, p2: d.p2, winner: winner, loser: loser,
                totalPot: totalPot, time: getNowText()
            });
            while (d.history.length > 30) d.history.pop();
            d.active = false;
            d.status = "settled";
            d.picks = [];
            return d;
        });

        incrementStat("prediction_settled");
        addAwardLog("승부예측정산", "세종이", winner + " 승리로 예측 정산");
        return resultMsg;
    } catch (e) {
        return "";
    }
}

function extractVsPlayersFromText(msg) {
    var text = normalizeName(msg || "");
    if (text.indexOf("http") >= 0) return null;
    var match = text.match(/([가-힣A-Za-z0-9_]{1,16})\s*vs\s*([가-힣A-Za-z0-9_]{1,16})/i);
    if (!match) return null;
    return [match[1], match[2]];
}

function maybeOpenPredictionFromText(msg, replier) {
    try {
        if (!msg || msg.indexOf(TRIGGER) === 0) return false;
        var pair = extractVsPlayersFromText(msg);
        if (!pair) return false;
        var current = normalizePredictionStatus(loadPredictionData());
        if (current.active) return false;
        replier.reply(openPredictionEvent(pair[0], pair[1], "세종이"));
        return true;
    } catch (e) {
        return false;
    }
}

// =====================================================
// 🏆 일일 벙개 상장 에이전트
// =====================================================

function loadAwardData() {
    return loadJSON(FILE_DAILY_AWARDS, { lastAwardDate: "", logs: [], history: [] });
}

function saveAwardData(data) {
    saveJSON(FILE_DAILY_AWARDS, data);
}

function addAwardLog(type, sender, text) {
    try {
        var now = new Date();
        updateJSON(FILE_DAILY_AWARDS, { lastAwardDate: "", logs: [], history: [] }, function(data) {
            if (!data.logs) data.logs = [];
            data.logs.push({
                day: getAwardDayKey(now),
                time: getNowText(),
                type: type,
                sender: getShortName(sender),
                text: safeShort(text, 180)
            });
            while (data.logs.length > AWARD_LOG_LIMIT) data.logs.shift();
            return data;
        });
    } catch (e) {}
}

function getTodayAwardLogs() {
    var data = loadAwardData();
    var today = getAwardDayKey(new Date());
    var logs = [];
    for (var i = 0; i < data.logs.length; i++) {
        if (data.logs[i].day === today) logs.push(data.logs[i]);
    }
    return logs;
}

function hasTodayBunggaeLog() {
    var logs = getTodayAwardLogs();
    for (var i = 0; i < logs.length; i++) {
        var ty = logs[i].type;
        if (ty === "벙개" || ty === "벙개참가" || ty === "벙개대기" ||
            ty === "벙개취소" || ty === "벙개종료" || ty === "벙개참석자") {
            return true;
        }
    }
    return false;
}

function getTodayBunggaeMembers() {
    var members = {};
    var logs = getTodayAwardLogs();

    for (var i = 0; i < logs.length; i++) {
        var type = logs[i].type;
        var name = logs[i].sender;
        if (!name) continue;
        if (type === "벙개" || type === "벙개참가" || type === "벙개참석자") members[name] = true;
        if (type === "벙개취소") delete members[name];
    }

    try {
        var bung = loadJSON(FILE_BUNGGAE, { host: "", members: [], created: "" });
        if (bung && bung.created === getTodayKey()) {
            if (bung.host) members[bung.host] = true;
            if (bung.members && bung.members.length > 0) {
                for (var j = 0; j < bung.members.length; j++) members[bung.members[j]] = true;
            }
        }
    } catch (e) {}

    var result = [];
    for (var key in members) result.push(key);
    return result;
}

function pickDailyAwardWinner() {
    var attendees = getTodayBunggaeMembers();
    var logs = getTodayAwardLogs();
    if (attendees.length === 0) return "오늘의 즐탁 요정";

    var score = {};
    for (var i = 0; i < attendees.length; i++) score[attendees[i]] = 10;

    for (var j = 0; j < logs.length; j++) {
        var name = logs[j].sender;
        var type = logs[j].type;
        if (!score[name]) continue;
        if (type === "벙개") score[name] += 8;
        else if (type === "벙개참가") score[name] += 6;
        else if (type === "경기결과") score[name] += 5;
        else if (type === "복식") score[name] += 4;
        else if (type === "매칭") score[name] += 3;
        else if (type === "출석") score[name] += 2;
        else if (type === "대화") score[name] += 1;
    }

    var best = attendees[0];
    var bestScore = score[best] || 0;
    for (var k = 0; k < attendees.length; k++) {
        var n = attendees[k];
        if ((score[n] || 0) > bestScore) { best = n; bestScore = score[n]; }
    }
    return best;
}

function getTodayAttendeeLine() {
    var attendees = getTodayBunggaeMembers();
    if (attendees.length === 0) return "오늘 벙개 참석자 기록 없음";

    var line = "";
    for (var i = 0; i < attendees.length && i < 10; i++) {
        if (i > 0) line += ", ";
        line += attendees[i];
    }
    if (attendees.length > 10) line += " 외 " + (attendees.length - 10) + "명";
    return line;
}

function getRandomReward() {
    return CRAZY_REWARD_POOL[Math.floor(Math.random() * CRAZY_REWARD_POOL.length)];
}

function buildDailyAwardSnapshot() {
    var logs = getTodayAwardLogs();
    var attendees = getTodayAttendeeLine();
    var recent = [];
    for (var i = logs.length - 1; i >= 0; i--) {
        recent.push(logs[i]);
        if (recent.length >= 10) break;
    }
    recent.reverse();

    var msg = "오늘 벙개 참석자:\n" + attendees + "\n\n오늘 분위기 로그:\n";
    if (recent.length === 0) {
        msg += "- 오늘 로그가 거의 없음. 그래도 귀엽고 웃기게 상장 작성.\n";
        return msg;
    }
    for (var j = 0; j < recent.length; j++) {
        msg += "- [" + recent[j].type + "] " + recent[j].sender + ": " + recent[j].text + "\n";
    }
    return msg;
}

function buildLocalDailyAward() {
    var winner = pickDailyAwardWinner();
    var reward = getRandomReward();
    var attendees = getTodayAttendeeLine();

    var titles = [
        "오늘의 라켓요정상 🧚‍♂️🏓", "스매싱보다 존재감이 강했상 ⚡🏓",
        "공보다 빨리 웃겼상 😂💨", "즐탁 낭만 과다복용상 💊🏓",
        "복컴을 빛낸 인간 조명상 💡✨", "오늘의 세종 탁구 아이돌상 🌟🏓",
        "라켓 들고 온 평화의 전사상 🛡️🏓"
    ];
    var comments = [
        "오늘 그냥 왔다 갔다 한 줄 알았는데, 분위기 지분을 야무지게 챙겼습니다.",
        "공은 왔다 갔다 했지만, 웃음은 여기서 멈췄습니다.",
        "이 정도면 탁구 치러 온 게 아니라 단톡방 예능 살리러 온 겁니다.",
        "오늘의 즐탁 에너지가 너무 진해서 세종이가 그냥 지나칠 수 없었습니다.",
        "승패는 모르겠고, 존재감은 이미 우승입니다.",
        "라켓보다 더 빛난 건 회원님의 해맑은 즐탁력입니다."
    ];

    var title = titles[Math.floor(Math.random() * titles.length)];
    var comment = comments[Math.floor(Math.random() * comments.length)];

    return "🏆✨ 오늘의 벙개 상장 ✨🏆\n\n🎖️ 수상자: " + winner + "\n📜 " + title + "\n\n" +
           "💬 " + comment + "\n\n🎁 가상상품: " + reward.emoji + " " + reward.name + "\n" +
           "🤣 " + reward.line + "\n\n👥 오늘의 벙개 멤버\n" + attendees + "\n\n" +
           "※ 진짜 상품 아님. 웃음만 실지급 😆🏓";
}

function buildGeminiDailyAward() {
    var snapshot = buildDailyAwardSnapshot();
    var reward = getRandomReward();
    var winner = pickDailyAwardWinner();
    var attendees = getTodayAttendeeLine();

    var prompt =
        "당신은 세종시 탁구 커뮤니티의 귀엽고 웃긴 일일 시상식 사회자입니다.\n" +
        "오늘 벙개가 끝난 뒤 밤 9시에 단톡방에 올릴 짧은 상장을 작성하세요.\n\n" +
        "중요 조건:\n1. 수상자는 반드시 아래 수상자 이름을 사용하세요: " + winner + "\n" +
        "2. 참석자 문맥은 아래 벙개 참석자 목록을 반영하세요: " + attendees + "\n" +
        "3. 450자 이내로 짧게 작성하세요.\n4. 이모티콘을 많이 사용하세요. 🏓😂🔥✨👑🎁🤣 같은 느낌.\n" +
        "5. 글투는 귀엽고 유머스럽게, 단톡방 사람들이 웃게 작성하세요.\n6. 선정기준 설명은 길게 쓰지 마세요.\n" +
        "7. 실제 상품이 아니라 가상 예능 상품임을 짧게 표시하세요.\n8. 비하, 조롱, 정치, 성적 표현 금지.\n\n" +
        "출력 형식:\n🏆 오늘의 벙개 상장 🏆\n🎖️ 수상자: [이름]\n📜 [짧고 웃긴 상 이름]\n" +
        "💬 [귀엽고 유머러스한 한두 문장]\n🎁 가상상품: [상품명]\n🤣 [짧은 농담]\n" +
        "※ 진짜 상품 아님. 웃음만 실지급 😆\n\n오늘 추천 가상 리워드:\n" +
        reward.emoji + " " + reward.name + "\n" + reward.line + "\n\n" + snapshot;

    var aiText = callGeminiText(prompt);
    if (!aiText) return buildLocalDailyAward();
    return aiText;
}

function shouldSendDailyAward() {
    var now = new Date();
    if (now.getHours() < AWARD_TRIGGER_HOUR) return false;

    var data = loadAwardData();
    var today = getAwardDayKey(now);
    if (data.lastAwardDate === today) return false;
    if (AWARD_REQUIRE_BUNGGAE && !hasTodayBunggaeLog()) return false;
    return true;
}

function generateDailyAward(markSent) {
    var text = buildGeminiDailyAward();
    if (markSent) {
        var now = new Date();
        var today = getAwardDayKey(now);
        updateJSON(FILE_DAILY_AWARDS, { lastAwardDate: "", logs: [], history: [] }, function(data) {
            data.lastAwardDate = today;
            if (!data.history) data.history = [];
            data.history.unshift({ day: today, time: getNowText(), text: text });
            while (data.history.length > AWARD_HISTORY_LIMIT) data.history.pop();
            return data;
        });
        incrementStat("daily_awards");
    }
    return text;
}

function maybeSendDailyAward(replier) {
    try {
        if (shouldSendDailyAward()) {
            replier.reply(generateDailyAward(true));
            return true;
        }
    } catch (e) {}
    return false;
}

function showAwardStatus() {
    var data = loadAwardData();
    var today = getAwardDayKey(new Date());
    var logs = getTodayAwardLogs();

    var bunggaeCount = 0;
    for (var i = 0; i < logs.length; i++) {
        var ty = logs[i].type;
        if (ty === "벙개" || ty === "벙개참가" || ty === "벙개대기" ||
            ty === "벙개취소" || ty === "벙개종료" || ty === "벙개참석자") bunggaeCount++;
    }

    return "━━━ 🏆 일일 상장 에이전트 현황 ━━━\n\n📅 오늘: " + today + "\n" +
           "📝 오늘 로그: " + logs.length + "개\n🏓 벙개 관련 로그: " + bunggaeCount + "개\n" +
           "🏆 오늘 발송 여부: " + (data.lastAwardDate === today ? "발송 완료" : "아직") + "\n" +
           "📚 상장 기록: " + data.history.length + "개\n\n⏰ 자동 발송: 매일 밤 9시 이후 첫 대화\n조건: 그날 벙개 로그가 있어야 발송";
}

function resetAwards() {
    saveAwardData({ lastAwardDate: "", logs: [], history: [] });
    return "✅ 일일 상장 에이전트 데이터를 초기화했어요.";
}

// =====================================================
// 📊 현황/통계
// =====================================================

function showStatus() {
    var aData = loadJSON(FILE_ATTEND, {});
    var mData = loadJSON(FILE_MATCH, { players: [] });
    if (!mData.players) mData.players = [];
    var bData = loadJSON(FILE_BUNGGAE, { host: "", members: [] });
    if (!bData.members) bData.members = [];
    var rData = loadJSON(FILE_RESERVATIONS, []);

    var todayKey = getTodayKey();
    var attendCount = (aData[todayKey] || []).length;

    return "━━━ 📊 오늘 현황 ━━━\n\n✅ 출석: " + attendCount + "명\n" +
           "🎯 매칭 대기: " + mData.players.length + "명\n" +
           "🏓 벙개 참가: " + bData.members.length + "명\n" +
           "📅 예약: " + rData.length + "건";
}

function showStats() {
    var stats = loadJSON(FILE_STATS, {});
    var users = loadJSON(FILE_USERS, {});
    var userCount = 0;
    for (var key in users) {
        if (key !== "__initialized__" && key !== "__nextId__" && key !== "__botVersion__") userCount++;
    }

    return "━━━ 📊 전체 통계 ━━━\n\n👥 총 회원: " + userCount + "명\n" +
           "🎯 매칭 등록: " + (stats.matches || 0) + "회\n" +
           "🏓 벙개 생성: " + (stats.bunggae_created || 0) + "회\n" +
           "🙋 벙개 참가: " + (stats.bunggae_joins || 0) + "회\n" +
           "✅ 출석: " + (stats.attendances || 0) + "회\n" +
           "🤖 AI 질문: " + (stats.ai_questions || 0) + "회\n" +
           "🏆 일일상장: " + (stats.daily_awards || 0) + "회\n" +
           "🥇 ELO 경기: " + (stats.elo_matches || 0) + "회\n" +
           "🎟️ 승부예측 개설: " + (stats.prediction_boards || 0) + "회\n" +
           "🎁 승부예측 정산: " + (stats.prediction_settled || 0) + "회\n" +
           "🤖 한마디 반응: " + (stats.react_agent_replies || 0) + "회\n" +
           "📅 예약: " + (stats.reservations || 0) + "건";
}


// =====================================================
// 📌 v16.2 FAQ / 오늘모집 / 관리자도움
// =====================================================

function findDongInText(text) {
    if (!text) return "";
    for (var i = 0; i < SEJONG_DONGS.length; i++) {
        if (String(text).indexOf(SEJONG_DONGS[i]) >= 0) return SEJONG_DONGS[i];
    }
    // 짧은 별칭
    var aliases = {
        "산울": "산울동", "종촌": "종촌동", "집현": "집현동", "고운": "고운동",
        "나성": "나성동", "새롬": "새롬동", "도담": "도담동", "보람": "보람동",
        "한솔": "한솔동", "소담": "소담동", "아름": "아름동", "어진": "어진동",
        "다정": "다정동", "반곡": "반곡동", "대평": "대평동", "해밀": "해밀동"
    };
    for (var k in aliases) {
        if (String(text).indexOf(k) >= 0) return aliases[k];
    }
    return "";
}

function tryFaqAnswer(text) {
    if (!text) return null;
    var t = String(text).replace(/\s+/g, " ").trim();
    var dong = findDongInText(t);

    // ★ 동이 명시된 아파트/탁구 질문 → 동별 안내 (FAQ가 AI를 가로채지 않음)
    if (dong && (t.indexOf("아파트") >= 0 || t.indexOf("탁구장") >= 0 || t.indexOf("탁구") >= 0 || t.indexOf("코트") >= 0)) {
        var club = searchClub(dong);
        // searchClub 기본 안내에 아파트 관점 한 줄 추가
        return club + "\n\n🏠 아파트 커뮤니티장 참고\n" +
               "· " + dong + " 단지 커뮤니티 탁구장은 보통 입주민 전용\n" +
               "· '가장 좋은 곳'은 단지 시설·개방시간·실력대 매칭에 따라 다름\n" +
               "· 외부인도 치려면 복컴/사설이 현실적\n" +
               "· 같은 동 멤버: 세종 이웃 " + dong + "\n" +
               "· 더 자세히: 세종 질문 " + dong + " 저녁에 치기 좋은 코트";
    }

    // 동 없이 아파트 일반 질문만 짧은 FAQ
    if (t.indexOf("아파트") >= 0 && (t.indexOf("탁구") >= 0 || t.indexOf("커뮤니티") >= 0)) {
        return "아파트 커뮤니티 탁구장 안내\n\n" +
               "· 대부분 단지 입주민 전용\n" +
               "· 시설·개방 시간은 단지마다 다름\n" +
               "· '제일 좋은 곳'은 실력·거리·시간대에 따라 다름\n\n" +
               "👉 동 이름을 넣어서 다시 물어보세요!\n" +
               "예: 세종 산울동 아파트 탁구장\n" +
               "예: 세종 탁구장 종촌동";
    }

    if (t.indexOf("복컴") >= 0 && (t.indexOf("예약") >= 0 || t.indexOf("어떻게") >= 0 || t.indexOf("방법") >= 0)) {
        return "복컴 탁구 예약 요약\n\n1) 세종시 통합예약 onestop.sejong.go.kr\n2) 보통 14일 전부터 예약\n3) 1인 예약 횟수 제한 있음\n4) 이용료 저렴 (예: 2시간 2천원대)\n5) 평일/휴일 운영시간 다름\n\n동별: 세종 탁구장 복컴";
    }
    if (t.indexOf("부수") >= 0 && (t.indexOf("뭐") >= 0 || t.indexOf("뜻") >= 0 || t.indexOf("이란") >= 0)) {
        return "탁구 '부수'는 대략적인 실력 등급이에요.\n숫자가 작을수록 고수 쪽 (예: 3부 > 7부).\n초보·초심·초심부는 입문 단계로 보면 됩니다.\n\n닉네임 예: 집현동 8부 닉네임";
    }
    if (t.indexOf("초보") >= 0 && (t.indexOf("시작") >= 0 || t.indexOf("배우") >= 0 || t.indexOf("입문") >= 0)) {
        return "초보 입문 가이드\n\n1) 라켓은 입문용 완성품으로 시작\n2) 자세·발놀림이 팔 힘보다 중요\n3) 처음엔 랠리(주고받기) 위주\n4) 세종 팁 → 오늘의 연습 포인트\n5) 플랫폼 배움터 초보 탈출 5강\n\nhttps://sejong-takgu.pages.dev/";
    }
    if ((t.indexOf("인원") >= 0 || t.indexOf("몇 명") >= 0 || t.indexOf("몇명") >= 0) && (t.indexOf("어떻게") >= 0 || t.indexOf("조회") >= 0)) {
        return "인원 조회: 세종 인원 종촌동\n인원 수정(관리자): 세종 인원 종촌동 26\n이웃 목록: 세종 이웃 종촌동";
    }
    if (t.indexOf("플랫폼") >= 0 || t.indexOf("홈페이지") >= 0 || (t.indexOf("사이트") >= 0 && t.indexOf("주소") >= 0)) {
        return platformCard();
    }
    if (t.indexOf("충청이음") >= 0) {
        return "충청이음 (축제·지도)\n" + CHUNGCHEONG_EUM_URL;
    }
    if (t.indexOf("카톡방") >= 0 || t.indexOf("오픈채팅") >= 0 || t.indexOf("단톡") >= 0) {
        return "카카오 오픈채팅\n" + KAKAO_OPENCHAT_URL;
    }
    if (t.indexOf("밴드") >= 0) {
        return "네이버 밴드\n" + BAND_URL;
    }
    return null;
}

function showFaqMenu() {
    return "━━━ 📌 자주 묻는 질문 ━━━\n\n" +
           "1) 복컴 예약 → 세종 질문 복컴 예약 어떻게 해?\n" +
           "2) 아파트 탁구장 → 세종 탁구장 아파트\n" +
           "3) 동별 코트 → 세종 탁구장 도담동\n" +
           "4) 인원 확인 → 세종 인원 종촌동\n" +
           "5) 이웃 목록 → 세종 이웃 집현동\n" +
           "6) 오늘 칠 사람 → 세종 오늘모집\n" +
           "7) 초보 가이드 → 세종 질문 초보 어떻게 시작?\n" +
           "8) 플랫폼 → 세종 플랫폼\n9) 주간 신문 → 세종 신문\n\n" +
           "💡 명령어를 몰라도 '세종' + 질문 문장으로 물어보세요.";
}

function getTodayRecruitData() {
    return loadJSON(DATA_DIR + "today_recruit.json", { date: "", place: "", time: "", host: "", members: [] });
}

function saveTodayRecruitData(data) {
    saveJSON(DATA_DIR + "today_recruit.json", data);
}

function todayRecruitCommand(sender, args) {
    var today = getTodayKey();
    var data = getTodayRecruitData();
    if (data.date !== today) {
        data = { date: today, place: "", time: "", host: "", members: [] };
    }
    var name = getShortName(sender);
    var a = (args || "").trim();

    if (!a || a === "현황" || a === "목록") {
        if (!data.members || data.members.length === 0) {
            return "━━━ 🏓 오늘 칠 사람 ━━━\n\n아직 없어요.\n\n💡 참가: 세종 오늘모집\n💡 장소: 세종 오늘모집 새롬복컴 19시";
        }
        var msg = "━━━ 🏓 오늘 칠 사람 (" + data.members.length + "명) ━━━\n";
        if (data.place) msg += "📍 " + data.place + (data.time ? " · " + data.time : "") + "\n";
        msg += "\n";
        for (var i = 0; i < data.members.length; i++) {
            msg += (i + 1) + ". " + data.members[i] + (data.members[i] === data.host ? " 👑" : "") + "\n";
        }
        msg += "\n💡 참가: 세종 오늘모집\n💡 취소: 세종 오늘모집 취소";
        msg += "\n📅 예약: " + BOOKING_URL;
        msg += "\n🌐 웹: " + PLATFORM_URL;
        return msg;
    }

    if (a === "취소" || a === "빠질게" || a === "불참") {
        var idx = data.members.indexOf(name);
        if (idx < 0) return "ℹ️ 오늘 모집 명단에 없어요.";
        data.members.splice(idx, 1);
        if (data.host === name) data.host = data.members[0] || "";
        saveTodayRecruitData(data);
        try { syncTodayRecruitToGas(data, sender); } catch (eC) {}
        return "✅ " + name + "님 오늘 모집에서 빠졌어요. (남은 " + data.members.length + "명)";
    }

    if (a === "초기화") {
        if (!isAdmin(sender)) return "🚫 초기화는 관리자만 가능해요.";
        data = { date: today, place: "", time: "", host: "", members: [] };
        saveTodayRecruitData(data);
        return "🗑️ 오늘 모집을 초기화했어요.";
    }

    var parts = a.split(/\s+/);
    if (data.members.indexOf(name) < 0) {
        data.members.push(name);
        if (!data.host) data.host = name;
    }
    if (parts[0] && parts[0] !== "참가") {
        data.place = parts[0];
        if (parts[1]) data.time = parts[1];
    }
    saveTodayRecruitData(data);
    try { syncTodayRecruitToGas(data, sender); } catch (eSync) {}
    incrementStat("today_recruit");
    addAwardLog("오늘모집", sender, (data.place || "") + " " + (data.time || ""));
    var out = "✅ " + name + "님 오늘 모집 등록! (" + data.members.length + "명)\n";
    if (data.place) out += "📍 " + data.place + (data.time ? " · " + data.time : "") + "\n";
    out += "\n현황: 세종 오늘모집 현황";
    out += "\n예약: " + BOOKING_URL;
    out += "\n웹: " + PLATFORM_URL;
    if (data.time) out += "\n\n⏰ 리마인드: 시작 전 채팅에서 '세종 오늘모집 현황'으로 인원 확인!";
    return out;
}

function adminHelp() {
    return "━━━ 👑 관리자 치트시트 ━━━" + "\n\n" +
           "인원" + "\n" + "• 세종 인원 종촌동" + "\n" + "• 세종 인원 종촌동 26" + "\n\n" +
           "API / 점검" + "\n" + "• 세종 API상태" + "\n" + "• 세종 API설정 AIzaSy..." + "\n" + "• 세종 AI테스트" + "\n" + "• 세종 헬스체크" + "\n\n" +
           "운영" + "\n" + "• 세종 통계" + "\n" + "• 세종 초기화 / 매칭초기화" + "\n" + "• 세종 상장 / 상장초기화" + "\n" + "• 세종 회원DB초기화" + "\n" + "• 세종 오늘모집 초기화" + "\n\n" +
           "제재" + "\n" + "• 세종 차단 [닉]" + "\n" + "• 세종 차단해제 [닉]" + "\n" + "• 세종 관리자추가 [닉]" + "\n\n" +
           "링크" + "\n" + "• 플랫폼 " + PLATFORM_URL + "\n" + "• 카톡방 " + KAKAO_OPENCHAT_URL + "\n" + "• 충청이음 " + CHUNGCHEONG_EUM_URL + "\n" + "• 예약 " + BOOKING_URL;
}


// =====================================================
// 📖 도움말
// =====================================================

function help() {
    return "━━━ 🏓 세종이 v16.3 ━━━" + "\n\n" +
           "💬 자연어" + "\n" + "• 세종 + 궁금한 점" + "\n" + "  예: 세종 아파트 탁구장 어디가 좋아요?" + "\n\n" +
           "🤖 AI / FAQ" + "\n" + "• 세종 질문 [내용]" + "\n" + "• 세종 faq" + "\n" + "• 세종 AI테스트 / 헬스체크" + "\n\n" +
           "👥 인원·이웃" + "\n" + "• 세종 인원 종촌동" + "\n" + "• 세종 인원 종촌동 26 (관리자)" + "\n" + "• 세종 이웃 집현동" + "\n\n" +
           "🏓 오늘 모집" + "\n" + "• 세종 오늘모집" + "\n" + "• 세종 오늘모집 새롬복컴 19시" + "\n" + "• 세종 오늘모집 현황 / 취소" + "\n\n" +
           "🔥 벙개·매칭" + "\n" + "• 세종 벙개 [장소] [시간] [인원]" + "\n" + "• 세종 참가 / 벙개현황" + "\n" + "• 세종 매칭 / 매칭가이드 / 매칭시작" + "\n\n" +
           "📰 주간·웹" + "\n" + "• 세종 신문" + "\n" + "• 세종 플랫폼" + "\n" + "• 세종 충청이음" + "\n\n" +
           "🔍 정보" + "\n" + "• 세종 탁구장 [동]" + "\n" + "• 세종 검색 [이름]" + "\n" + "• 세종 날씨 / 맛집 / 팁" + "\n\n" +
           "✅ 활동" + "\n" + "• 세종 출석 / 내정보 / 랭킹" + "\n\n" +
           "👑 방장" + "\n" + "• 세종 관리자도움" + "\n\n" +
           "🌐 " + PLATFORM_URL;
}


// =====================================================
// 📋 명령어
// =====================================================

var commands = {
    "": function(replier) { replier.reply(help()); },
    "도움말": function(replier) { replier.reply(help()); },
    "버전": function(replier) { replier.reply("🏓 " + BOT_NAME + "\n버전: " + BOT_VERSION + "\n모델: " + GEMINI_MODEL); },
    "인원": function(replier, sender, args) {
        if (!args) {
            replier.reply("💡 사용법\n• 조회: 세종 인원 종촌동\n• 업데이트(관리자): 세종 인원 종촌동 15");
            return;
        }
        var parts = args.trim().split(/\s+/);
        var room = parts[0];
        var count = parts[1] ? parseInt(parts[1], 10) : null;

        if (count !== null && !isNaN(count)) {
            replier.reply(updateRoomCount(room, count, sender));
        } else {
            replier.reply(getRoomCount(room));
        }
    },
    "질문": function(replier, sender, args) { replier.reply(args ? askGemini(args, sender) : "💡 사용법: 세종 질문 [내용]"); },
    "AI테스트": function(replier) { replier.reply(testAI()); },
    "faq": function(replier) { replier.reply(showFaqMenu()); },
    "이웃": function(replier, sender, args) {
        if (!args) { replier.reply("💡 사용법: 세종 이웃 집현동\n예: 세종 이웃 고운동"); return; }
        replier.reply(getMembersByDong(args.trim()));
    },
    "오늘모집": function(replier, sender, args) { replier.reply(todayRecruitCommand(sender, args)); },
    "관리자도움": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용입니다."); return; }
        replier.reply(adminHelp());
    },

    "날씨": function(replier) { replier.reply(fetchWeatherNow(WEATHER_CITY)); },
    "맛집": function(replier) { replier.reply(getRealSejongRestaurant()); },
    "카페": function(replier) { replier.reply(getSejongCafe()); },
    "유튜브": function(replier) { replier.reply(getYouTube()); },
    "뉴스": function(replier) { replier.reply("📰 BAND\n" + BAND_URL); },

    "탁구장": function(replier, sender, args) { replier.reply(searchClub(args)); },
    "검색": function(replier, sender, args) { replier.reply(searchMember(args)); },

    "매칭": function(replier, sender) { replier.reply(registerForMatch(sender)); },
    "매칭취소": function(replier, sender) { replier.reply(cancelMatch(sender)); },
    "매칭목록": function(replier) { replier.reply(showMatchList()); },
    "매칭시작": function(replier) { replier.reply(startMatch()); },
    "복식": function(replier) { replier.reply(startDoubleMatch()); },

    "벙개": function(replier, sender, args) {
        var base = createBungae(sender, args);
        replier.reply(base + "\n\n📅 복컴 예약\n" + BOOKING_URL + "\n🌐 플랫폼\n" + PLATFORM_URL);
    },
    "참가": function(replier, sender) { replier.reply(joinBungae(sender)); },
    "참가취소": function(replier, sender) { replier.reply(leaveBungae(sender)); },
    "벙개현황": function(replier) { replier.reply(showBungaeStatus()); },
    "벙종": function(replier, sender) { replier.reply(cancelBungae(sender)); },
    "벙개종료": function(replier, sender) { replier.reply(cancelBungae(sender)); },

    "예약": function(replier, sender, args) { replier.reply(addReservation(sender, args)); },
    "예약목록": function(replier) { replier.reply(showReservations()); },
    "예약초기화": function(replier, sender) { replier.reply(clearReservations(sender)); },

    "출석": function(replier, sender) { replier.reply(checkAttendance(sender)); },
    "포인트": function(replier, sender) { replier.reply(showPoint(sender)); },
    "내정보": function(replier, sender) { replier.reply(showMyCard(sender)); },
    "랭킹": function(replier) { replier.reply(showRanking()); },
    "팁": function(replier) { replier.reply(getTableTennisTip()); },
    "현황": function(replier) { replier.reply(showStatus()); },

    "승리": function(replier, sender, args) { replier.reply(requestWin(sender, args)); },
    "확인": function(replier, sender) { replier.reply(confirmWin(sender)); },
    "전적": function(replier, sender, args) { replier.reply(showRecord(args)); },
    "ELO": function(replier) { replier.reply(showEloRanking()); },

    "도전": function(replier, sender, args) { replier.reply(openChallengePrediction(sender, args)); },
    "예측판": function(replier, sender, args) { replier.reply(openManualPrediction(sender, args)); },
    "예측현황": function(replier) { replier.reply(predictionStatusText()); },
    "픽": function(replier, sender, args) { replier.reply(placePredictionPick(sender, args)); },
    "응원픽": function(replier, sender, args) { replier.reply(placePredictionPick(sender, args)); },
    "예측취소": function(replier, sender) { replier.reply(cancelPredictionEvent(sender)); },

    "상장": function(replier) { replier.reply(generateDailyAward(true)); },
    "상장현황": function(replier) { replier.reply(showAwardStatus()); },
    "상장미리보기": function(replier) { replier.reply(generateDailyAward(false)); },

    "상장초기화": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        replier.reply(resetAwards());
    },
    "회원DB초기화": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        var added = initMemberDB();
        replier.reply("🛠️ 회원DB 초기화 완료\n추가 등록: " + added + "명");
    },
    "API설정": function(replier, sender, args) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        if (args && args.indexOf("AIzaSy") === 0) {
            saveAPIKey(args.trim());
            replier.reply("✅ Gemini API 키 설정 완료!");
        } else {
            replier.reply("❌ 올바른 Gemini API 키를 입력해주세요.\nAIzaSy... 로 시작해야 합니다.");
        }
    },
    "API상태": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        replier.reply(getApiStatus());
    },
    "API삭제": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        clearAPIKey();
        replier.reply("✅ Gemini API 키를 삭제했어요.");
    },
    "통계": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        replier.reply(showStats());
    },
    "초기화": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        saveJSON(FILE_MATCH, { players: [] });
        saveJSON(FILE_BUNGGAE, { host: "", members: [], wait: [], max: 8 });
        replier.reply("🗑️ 매칭/벙개 초기화 완료");
    },
    "매칭초기화": function(replier, sender) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        saveJSON(FILE_MATCH, { players: [] });
        replier.reply("🗑️ 매칭 초기화 완료");
    },
    "차단": function(replier, sender, args) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        if (!args) { replier.reply("💡 사용법: 세종 차단 [닉네임]"); return; }
        blockUser(args.trim());
        replier.reply("🚫 차단 완료: " + args);
    },
    "차단해제": function(replier, sender, args) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        if (!args) { replier.reply("💡 사용법: 세종 차단해제 [닉네임]"); return; }
        unblockUser(args.trim());
        replier.reply("✅ 차단 해제 완료: " + args);
    },
    "관리자추가": function(replier, sender, args) {
        if (!isAdmin(sender)) { replier.reply("🚫 관리자 전용 명령어입니다."); return; }
        if (!args) { replier.reply("💡 사용법: 세종 관리자추가 [닉네임]"); return; }
        addAdmin(args.trim());
        replier.reply("👑 관리자 추가 완료: " + args);
    },

    // ── v16.3 웹·주간·점검 ──
    "플랫폼": function(replier) { replier.reply(platformCard()); },
    "홈페이지": function(replier) { replier.reply(platformCard()); },
    "사이트": function(replier) { replier.reply(platformCard()); },
    "충청이음": function(replier) { replier.reply("충청이음\n" + CHUNGCHEONG_EUM_URL); },
    "카톡방": function(replier) { replier.reply("카카오 오픈채팅\n" + KAKAO_OPENCHAT_URL); },
    "오픈채팅": function(replier) { replier.reply("카카오 오픈채팅\n" + KAKAO_OPENCHAT_URL); },
    "신문": function(replier) { replier.reply(fetchWeeklyDigest()); },
    "주간": function(replier) { replier.reply(fetchWeeklyDigest()); },
    "아침신문": function(replier) { replier.reply(fetchWeeklyDigest()); },
    "헬스체크": function(replier) { replier.reply(healthCheck()); },
    "점검": function(replier) { replier.reply(healthCheck()); },
    "매칭가이드": function(replier) { replier.reply(matchGuide()); },
    "예약링크": function(replier) { replier.reply("📅 세종시 복컴 통합예약\n" + BOOKING_URL + "\n\n보통 14일 전 · 1인 횟수 제한"); }
};

// =====================================================
// 🚀 봇 시작
// =====================================================

function onStartCompile() {
    try { initMemberDB(); } catch (e) {}
}


// =====================================================
// 🔤 명령 해석 — 띄어쓴 두·세 단어 명령 자동 합침 (v16.3.1)
//  예: "벙개 현황" → 벙개현황
//      "오늘 모집 현황" → 오늘모집 + args 현황
//      "매칭 시작" → 매칭시작
// =====================================================
function resolveCommand(userInput) {
    userInput = String(userInput || "").replace(/\s+/g, " ").trim();
    if (!userInput) return { command: "", args: "" };

    var parts = userInput.split(" ");
    // 긴 후보부터: 3단어 붙임 → 2단어 붙임 → 1단어
    var maxN = parts.length < 3 ? parts.length : 3;
    for (var n = maxN; n >= 1; n--) {
        var joined = parts.slice(0, n).join("");      // 벙개현황
        var spaced = parts.slice(0, n).join(" ");     // 벙개 현황
        var rest = parts.slice(n).join(" ");

        if (commands[joined]) {
            return { command: joined, args: rest };
        }
        if (COMMAND_ALIASES[joined]) {
            return { command: COMMAND_ALIASES[joined], args: rest };
        }
        if (COMMAND_ALIASES[spaced]) {
            return { command: COMMAND_ALIASES[spaced], args: rest };
        }
        // commands 에 spaced 키가 있는 경우 (거의 없음)
        if (commands[spaced]) {
            return { command: spaced, args: rest };
        }
    }

    // 기본: 첫 토큰
    var cmd = parts[0];
    if (COMMAND_ALIASES[cmd]) cmd = COMMAND_ALIASES[cmd];
    return { command: cmd, args: parts.slice(1).join(" ") };
}

// =====================================================
// 🎯 메인 응답
// =====================================================

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!msg) return;
        if (isBlocked(sender)) return;

        try { autoBackupOncePerDay(); } catch (e) {}
        try { autoCleanupStaleBungae(); } catch (e) {}
        try { saveWeeklyRankSnapshotIfNewWeek(); } catch (e) {}

        updateMemberDB(sender);

        // 대화 로그 → GAS (실패해도 봇 응답에 영향 없음)
        try { sendToSheet(room, sender, msg); } catch (e) {}

        // 일반 대화 (트리거 없음)
        try {
            if (msg && msg.indexOf(TRIGGER) !== 0) {
                if (!isProbablyMediaMessage(msg)) {
                    addAwardLog("대화", sender, msg);
                }
                if (maybeSendDailyAward(replier)) return;
                if (maybeOpenPredictionFromText(msg, replier)) return;
                if (maybeRunReactEmotionAgent(msg, sender, replier)) return;
            }
        } catch (e) {}

        if (msg.indexOf(TRIGGER) !== 0) return;

        if (checkSpam(sender)) {
            replier.reply("⚠️ 도배 감지!\n5초 후 다시 시도해주세요.");
            return;
        }

        var userInput = msg.replace(TRIGGER, "").trim();
        // "세종질문 xxx" 붙여쓰기 보정
        if (userInput.indexOf("질문") === 0 && userInput.length > 2 && userInput.charAt(2) !== " ") {
            userInput = "질문 " + userInput.substring(2).trim();
        }
        // 연속 공백 정리
        userInput = userInput.replace(/\s+/g, " ").trim();

        // ★ v16.3.1: "벙개 현황" "오늘 모집" "매칭 시작" 등 띄어쓰기 명령 인식
        var resolved = resolveCommand(userInput);
        var command = resolved.command;
        var args = resolved.args;

        // 자연어 인원
        if (userInput.indexOf("몇명") >= 0 || userInput.indexOf("몇 명") >= 0 || userInput.indexOf("인원수") >= 0) {
            for (var i = 0; i < SEJONG_DONGS.length; i++) {
                if (userInput.indexOf(SEJONG_DONGS[i]) >= 0) {
                    replier.reply(getRoomCount(SEJONG_DONGS[i]));
                    return;
                }
            }
        }

        // 자연어 이웃
        if (userInput.indexOf("이웃") >= 0 || (userInput.indexOf("누구") >= 0 && userInput.indexOf("사람") >= 0)) {
            for (var j = 0; j < SEJONG_DONGS.length; j++) {
                if (userInput.indexOf(SEJONG_DONGS[j]) >= 0) {
                    replier.reply(getMembersByDong(SEJONG_DONGS[j]));
                    return;
                }
            }
        }

        // 벙개 현황 자연어 (명령 미인식 대비)
        if (userInput.indexOf("벙개") >= 0 && userInput.indexOf("현황") >= 0) {
            replier.reply(showBungaeStatus());
            return;
        }

        // 오늘 칠 사람 자연어
        if (userInput.indexOf("칠 사람") >= 0 || userInput.indexOf("칠사람") >= 0 || userInput.indexOf("오늘 모집") >= 0) {
            // "오늘 모집 현황" 등은 args 유지, 빈 args면 현황
            var trArgs = args;
            if (!trArgs && userInput.indexOf("현황") >= 0) trArgs = "현황";
            if (!trArgs && (userInput.indexOf("취소") >= 0 || userInput.indexOf("불참") >= 0)) trArgs = "취소";
            replier.reply(todayRecruitCommand(sender, trArgs || (userInput.indexOf("칠") >= 0 ? "현황" : "")));
            return;
        }

        // 플랫폼 / 신문 자연어
        if (userInput.indexOf("플랫폼") >= 0 || userInput.indexOf("홈페이지") >= 0 || userInput.indexOf("사이트 주소") >= 0) {
            replier.reply(platformCard());
            return;
        }
        if (userInput.indexOf("아침신문") >= 0 || userInput.indexOf("주간 신문") >= 0 || (userInput.indexOf("신문") >= 0 && userInput.indexOf("뉴스") < 0)) {
            replier.reply(fetchWeeklyDigest());
            return;
        }
        if (userInput.indexOf("충청이음") >= 0) {
            replier.reply("충청이음\n" + CHUNGCHEONG_EUM_URL);
            return;
        }

        if (commands[command]) {
            commands[command](replier, sender, args, room);
            return;
        }

        if (userInput.indexOf("고마워") >= 0 || userInput.indexOf("감사") >= 0) {
            replier.reply("별말씀을요~ 😊 즐탁하세요!");
            return;
        }
        if (userInput.indexOf("안녕") >= 0 || userInput.indexOf("하이") >= 0 || userInput.indexOf("헬로") >= 0) {
            replier.reply("안녕하세요! 👋\n'세종 도움말' 또는 궁금한 점을 바로 물어보세요.\n예: 세종 아파트 탁구장 어디가 좋아요?");
            return;
        }

        // 알 수 없는 입력 → FAQ → 질문형이면 AI
        if (userInput.length >= 4) {
            var faq = tryFaqAnswer(userInput);
            if (faq) {
                replier.reply("📌 [빠른 안내]\n\n" + faq);
                return;
            }
            var qLike = (userInput.indexOf("?") >= 0 || userInput.indexOf("？") >= 0 ||
                userInput.indexOf("어디") >= 0 || userInput.indexOf("어떻게") >= 0 ||
                userInput.indexOf("뭐") >= 0 || userInput.indexOf("추천") >= 0 ||
                userInput.indexOf("알려") >= 0 || userInput.indexOf("좋") >= 0 ||
                userInput.indexOf("방법") >= 0 || userInput.indexOf("언제") >= 0 ||
                userInput.indexOf("얼마") >= 0 || userInput.indexOf("가능") >= 0 ||
                userInput.indexOf("인가요") >= 0 || userInput.indexOf("할까요") >= 0);
            if (qLike) {
                replier.reply(askGemini(userInput, sender));
                return;
            }
        }

        replier.reply("❓ 잘 못 알아들었어요.\n\n• 도움말: 세종 도움말\n• 질문 예: 세종 아파트 탁구장 어디가 좋아요?\n• FAQ: 세종 faq\n• 플랫폼: 세종 플랫폼\n• 점검: 세종 헬스체크");

    } catch (e) {
        try { replier.reply("❌ 봇 오류 발생\n" + e); } catch (e2) {}
    }
}

// =====================================================
// ✅ FILE INTEGRITY — 세종이 v16.3.1 전체 끝
// lines 표시용: response() 닫힘 다음에 이 주석이 있으면 잘리지 않은 것
// CHECKSUM_MARK: SEJONG_BOT_V1631_COMPLETE_EOF
// =====================================================
