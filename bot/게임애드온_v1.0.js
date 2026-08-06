/**
 * ═══════════════════════════════════════════════════════
 * 세종이 게임 애드온 v1.0 (메신저봇R용)
 * — 세종탁구 게임센터 링크 + 게임 랭킹 조회
 *
 * [명령어]
 * 세종 게임 → 게임센터 링크 (닉네임 자동 입력)
 * 세종 게임랭킹 → 4개 게임 TOP 3
 * 세종 게임랭킹 퀴즈 → 해당 게임 TOP 5
 * (퀴즈 / 핑퐁 / 카드 / 낱말)
 *
 * [설치]
 * 1) 아래 블록 전체를 봇 코드 상단(상수 근처)에 붙여넣기
 * 2) response() 안 명령 분기 시작에 추가:
 *    var gameReply = gameCommand(msg, sender);
 *    if (gameReply) { replier.reply(gameReply); return; }
 * 3) 메신저봇R 인터넷 권한 ON
 * ═══════════════════════════════════════════════════════
 */
var GAME_CFG = {
  api: "https://script.google.com/macros/s/AKfycbxCvR-8Sbk3e7UJzQ4zc6CVDbKbKLEqvKdMmy5TD-CCqVK019eHytT45tlRP1uaXlrT/exec",
  link: "https://sejong-takgu.pages.dev/game.html"
};
var GAME_NAMES = { quiz: "탁구 퀴즈", pong: "핑퐁 아케이드", card: "카드 짝맞추기", word: "낱말 퍼즐" };
var GAME_ALIAS = {
  "퀴즈": "quiz", "탁구퀴즈": "quiz",
  "핑퐁": "pong", "퐁": "pong", "아케이드": "pong",
  "카드": "card", "짝맞추기": "card",
  "낱말": "word", "퍼즐": "word", "낱말퍼즐": "word"
};
function gameHttpJson_(url) {
  try {
    var body = org.jsoup.Jsoup.connect(url)
      .ignoreContentType(true)
      .ignoreHttpErrors(true)
      .followRedirects(true)
      .timeout(10000)
      .execute()
      .body();
    return JSON.parse(body);
  } catch (e) {
    return null;
  }
}
function gameEnc_(s) {
  try {
    return java.net.URLEncoder.encode(String(s || ""), "UTF-8");
  } catch (e) {
    return "";
  }
}
function gameFmtList_(list, topN) {
  var out = [];
  var medal = ["🥇", "🥈", "🥉"];
  var n = Math.min(list.length, topN);
  for (var i = 0; i < n; i++) {
    var head = medal[i] || ((i + 1) + ".");
    out.push(head + " " + list[i].n + " " + list[i].score + "점");
  }
  return out.length ? out.join("\n") : "아직 기록 없음";
}
function gameCommand(msg, sender) {
  msg = String(msg || "").trim();
  var m = msg;
  if (m.indexOf("세종") === 0) m = m.slice(2).trim();
  else if (m.charAt(0) === "!") m = m.slice(1).trim();
  else return null;

  if (m === "게임" || m === "게임센터") {
    var link = GAME_CFG.link;
    var enc = gameEnc_(sender);
    if (enc) link += "?n=" + enc;
    return "🏓 세종탁구 게임센터 OPEN!\n" +
      "─────────────\n" +
      "🧠 탁구 퀴즈 · 🏓 핑퐁 아케이드\n" +
      "🃏 카드 짝맞추기 · 🧩 낱말 퍼즐\n" +
      "─────────────\n" +
      link + "\n" +
      "(링크로 들어가면 닉네임 자동 입력!)\n" +
      "랭킹 확인 → 세종 게임랭킹";
  }

  if (m.indexOf("게임랭킹") === 0) {
    if (!GAME_CFG.api) {
      return "⚙️ 아직 랭킹 서버 주소가 없어요. GAME_CFG.api 를 설정해 주세요.";
    }
    var arg = m.slice("게임랭킹".length).trim();
    var key = arg ? (GAME_ALIAS[arg] || null) : null;
    if (arg && !key) {
      return "그 게임은 몰라요 🤔\n세종 게임랭킹 퀴즈 / 핑퐁 / 카드 / 낱말";
    }
    if (key) {
      var d1 = gameHttpJson_(GAME_CFG.api + "?action=gameRank&game=" + key + "&limit=5");
      if (!d1 || !d1.ok) return "랭킹을 못 불러왔어요 😢 GAS v1.4 배포 후 다시 시도해 주세요.";
      return "🏆 " + d1.gameName + " TOP 5\n" +
        "─────────────\n" +
        gameFmtList_(d1.rank || [], 5) +
        "\n─────────────\n총 " + (d1.total || 0) + "명 참여 · 세종 게임 으로 도전!";
    }
    var d2 = gameHttpJson_(GAME_CFG.api + "?action=gameRank&limit=3");
    if (!d2 || !d2.ok || !d2.games) return "랭킹을 못 불러왔어요 😢 잠시 후 다시 시도해 주세요.";
    var lines = ["🏆 세종탁구방 게임 랭킹"];
    var order = ["quiz", "pong", "card", "word"];
    for (var i = 0; i < order.length; i++) {
      var g = d2.games[order[i]];
      if (!g) continue;
      lines.push("─────────────");
      lines.push("▸ " + g.name);
      lines.push(gameFmtList_(g.rank || [], 3));
    }
    lines.push("─────────────");
    lines.push("자세히: 세종 게임랭킹 퀴즈 · 도전: 세종 게임");
    return lines.join("\n");
  }
  return null;
}
