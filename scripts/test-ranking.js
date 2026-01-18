#!/usr/bin/env node
/**
 * 랭킹 병합 로직 테스트 스크립트
 * DB 없이 로컬에서 데이터 구조 확인
 */

const MAX_DAILY_HISTORY = 365; // 1년 제한

// 히스토리에 추가 (중복 날짜 덮어쓰기, 365일 제한)
function addToHistory(history, rank, date) {
  const arr = [...(history || [])];
  const idx = arr.findIndex((h) => h.date === date);
  if (idx >= 0) {
    arr[idx].rank = rank;
  } else {
    arr.push({ rank, date });
  }
  // 365일 초과시 오래된 것 제거
  return arr.slice(-MAX_DAILY_HISTORY);
}

// 언어별 랭킹 병합 (daily도 히스토리로)
function mergeLangRanking(existing, incoming, today) {
  const merged = { ...existing };

  for (const [period, rank] of Object.entries(incoming)) {
    if (period === "daily") {
      merged.daily_history = addToHistory(merged.daily_history, rank, today);
    } else if (period !== "daily_history") {
      merged[period] = rank;
    }
  }

  return merged;
}

// mergeRanking 함수 (새 버전)
function mergeRanking(existing, incoming) {
  const merged = { ...existing };
  const today = new Date().toISOString().slice(0, 10);

  for (const [key, value] of Object.entries(incoming)) {
    if (key === "daily") {
      // 전체 daily는 히스토리에 추가
      merged.daily_history = addToHistory(merged.daily_history, value, today);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // 언어별 랭킹 (예: { python: { weekly: 5, daily: 2 } })
      merged[key] = mergeLangRanking(merged[key] || {}, value, today);
    } else if (key !== "daily_history") {
      // weekly/monthly는 덮어쓰기
      merged[key] = value;
    }
  }

  return merged;
}

// 테스트 케이스
console.log("=== 랭킹 병합 로직 테스트 ===\n");

// 1. 새 레코드 (기존 없음)
const newRepo = {
  platform: "github",
  platform_id: "anthropic-claude",
  ranking: { weekly: 5 },
};
console.log("1. 새 레코드:", JSON.stringify(newRepo.ranking, null, 2));

// 2. 기존 weekly에 monthly 추가
const existing1 = { weekly: 5 };
const incoming1 = { monthly: 3 };
const merged1 = mergeRanking(existing1, incoming1);
console.log("\n2. weekly + monthly 병합:");
console.log("   기존:", existing1);
console.log("   신규:", incoming1);
console.log("   결과:", merged1);

// 3. daily 히스토리 누적
const existing2 = { weekly: 5, daily_history: [{ rank: 2, date: "2026-01-14" }] };
const incoming2 = { daily: 1 };
const merged2 = mergeRanking(existing2, incoming2);
console.log("\n3. daily 히스토리 누적:");
console.log("   기존:", JSON.stringify(existing2));
console.log("   신규:", incoming2);
console.log("   결과:", JSON.stringify(merged2));

// 4. 같은 날 daily 덮어쓰기
const today = new Date().toISOString().slice(0, 10);
const existing3 = { weekly: 5, daily_history: [{ rank: 3, date: today }] };
const incoming3 = { daily: 1 };
const merged3 = mergeRanking(existing3, incoming3);
console.log("\n4. 같은 날 daily 덮어쓰기:");
console.log("   기존:", JSON.stringify(existing3));
console.log("   신규:", incoming3);
console.log("   결과:", JSON.stringify(merged3));

// 5. 전체 시나리오: 동일 레포가 daily, weekly, monthly에 모두 등장
console.log("\n5. 전체 시나리오 (동일 레포가 모든 기간에 등장):");
let ranking = {};
console.log("   초기:", ranking);

ranking = mergeRanking(ranking, { daily: 1 });
console.log("   + daily:1  →", JSON.stringify(ranking));

ranking = mergeRanking(ranking, { weekly: 3 });
console.log("   + weekly:3 →", JSON.stringify(ranking));

ranking = mergeRanking(ranking, { monthly: 5 });
console.log("   + monthly:5 →", JSON.stringify(ranking));

// 6. 언어별 랭킹 저장
console.log("\n6. 언어별 랭킹 저장:");
let langRanking = {};
console.log("   초기:", JSON.stringify(langRanking));

langRanking = mergeRanking(langRanking, { weekly: 5 });  // 전체 트렌딩
console.log("   + 전체 weekly:5  →", JSON.stringify(langRanking));

langRanking = mergeRanking(langRanking, { python: { weekly: 3 } });  // 언어별
console.log("   + python weekly:3 →", JSON.stringify(langRanking));

langRanking = mergeRanking(langRanking, { python: { daily: 1 } });  // python daily
console.log("   + python daily:1  →", JSON.stringify(langRanking));

langRanking = mergeRanking(langRanking, { javascript: { weekly: 8, daily: 5 } });
console.log("   + js weekly:8, daily:5 →", JSON.stringify(langRanking));

// 7. 복합 시나리오 (전체 + 언어별)
console.log("\n7. 복합 시나리오 (전체 + 여러 언어):");
let fullRanking = {};

fullRanking = mergeRanking(fullRanking, { daily: 1 });  // 전체 daily
fullRanking = mergeRanking(fullRanking, { weekly: 3 });  // 전체 weekly
fullRanking = mergeRanking(fullRanking, { monthly: 5 });  // 전체 monthly
fullRanking = mergeRanking(fullRanking, { python: { daily: 2, weekly: 1 } });
fullRanking = mergeRanking(fullRanking, { rust: { monthly: 3 } });

console.log("   결과:", JSON.stringify(fullRanking, null, 2));

// 8. 365일 제한 테스트
console.log("\n8. 365일 제한 테스트:");
let historyRanking = { daily_history: [] };

// 400개 히스토리 추가 시뮬레이션
for (let i = 0; i < 400; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().slice(0, 10);
  historyRanking.daily_history = addToHistory(historyRanking.daily_history, i + 1, dateStr);
}

console.log("   400개 추가 후 히스토리 길이:", historyRanking.daily_history.length);
console.log("   예상: 365, 결과:", historyRanking.daily_history.length === 365 ? "통과 ✓" : "실패 ✗");

console.log("\n=== 테스트 완료 ===");
