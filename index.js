import fs from "fs";
import path from "path";
import Parser from "rss-parser";
import axios from "axios";

const RSS_URL = "https://www.sedaily.com/rss/realestate";
const SENT_FILE = path.join(process.cwd(), "sent.json");

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
if (!SLACK_WEBHOOK_URL) {
  console.error("Missing env: SLACK_WEBHOOK_URL");
  process.exit(1);
}

// 한 번 실행에서 너무 많이 보내지 않게 (노이즈/레이트리밋 방지)
const MAX_ITEMS_PER_RUN = 10;

// (선택) 키워드 필터: 원치 않으면 matchesKeywords()를 return true;로 변경
const KEYWORDS = [
  "전세", "월세", "청약", "분양", "미분양", "인허가", "착공", "준공",
  "정비사업", "재건축", "재개발", "공급", "규제", "대출", "금리",
  "DSR", "LTV", "PF", "HUG", "전세사기"
];

function loadSent() {
  try {
    const raw = fs.readFileSync(SENT_FILE, "utf-8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSent(sentSet) {
  // 무한히 늘지 않도록 최근 5000개만 유지
  const arr = Array.from(sentSet).slice(-5000);
  fs.writeFileSync(SENT_FILE, JSON.stringify(arr, null, 2), "utf-8");
}

function matchesKeywords(title = "") {
  // return KEYWORDS.some((k) => title.includes(k));
  // 필터 끄려면 true:
  return true;
}

function formatKoreanDate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return pubDate || "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

async function postToSlack({ title, link, author, pubDate }) {
  const kst = formatKoreanDate(pubDate);
  const linkedTitle = `<${link}|${title}>`;

  // 언펄(미리보기) 확률을 높이려면 "순수 URL"을 한 줄로 넣는 게 가장 확실
  const text =
    `*${linkedTitle}*\n` +
    `• ${author || "기자 미상"} | ${kst || "시간 미상"}\n`;

  await axios.post(
    SLACK_WEBHOOK_URL,
    {
      text,
      unfurl_links: true,
      unfurl_media: true,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 20000 }
  );
}

async function main() {
  const parser = new Parser({
    headers: { "User-Agent": "rss-to-slack/1.0" },
  });

  const sent = loadSent();
  const feed = await parser.parseURL(RSS_URL);

  const items = (feed.items || []).slice(0, MAX_ITEMS_PER_RUN);

  const normalized = items.map((it) => ({
    title: it.title || "",
    link: it.link || "",
    author: it.creator || it.author || "",
    pubDate: it.pubDate || "",
  }));

  const newItems = normalized
    .filter((it) => it.link && !sent.has(it.link))
    .filter((it) => matchesKeywords(it.title));

  // 오래된 것부터 보내기(보기 편함)
  for (const it of newItems.reverse()) {
    await postToSlack(it);
    sent.add(it.link);
    await new Promise((r) => setTimeout(r, 300));
  }

  saveSent(sent);
  console.log(`Sent ${newItems.length} item(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
