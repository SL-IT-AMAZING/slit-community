/**
 * 데이터베이스 컨텐츠 전체 삭제 스크립트
 *
 * content와 crawled_content 테이블의 모든 데이터를 삭제합니다.
 * content 삭제 시 bookmarks, metrics_history도 CASCADE 삭제됩니다.
 *
 * 사용법:
 * node scripts/clear-content.js
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function main() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes("--confirm");

  console.log("=== 데이터베이스 컨텐츠 삭제 스크립트 ===\n");

  // 현재 데이터 개수 확인
  const { count: contentCount } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true });

  const { count: crawledCount } = await supabase
    .from("crawled_content")
    .select("*", { count: "exact", head: true });

  console.log(`현재 데이터:`);
  console.log(`  - content: ${contentCount}건`);
  console.log(`  - crawled_content: ${crawledCount}건\n`);

  if (contentCount === 0 && crawledCount === 0) {
    console.log("삭제할 데이터가 없습니다.");
    return;
  }

  if (!isConfirmed) {
    const answer = await askQuestion(
      "정말로 모든 컨텐츠를 삭제하시겠습니까? (yes/no): "
    );

    if (answer.toLowerCase() !== "yes") {
      console.log("취소되었습니다.");
      return;
    }
  } else {
    console.log("--confirm 플래그로 삭제를 진행합니다.\n");
  }

  console.log("\n삭제 중...\n");

  // content 테이블 삭제 (bookmarks, metrics_history CASCADE 삭제)
  const { data: deletedContent, error: contentError } = await supabase
    .from("content")
    .delete()
    .gte("created_at", "1970-01-01") // 모든 row 매칭
    .select();

  if (contentError) {
    console.error("content 삭제 실패:", contentError.message);
  } else {
    console.log(`content 삭제 완료: ${deletedContent?.length || 0}건`);
  }

  // crawled_content 테이블 삭제
  const { data: deletedCrawled, error: crawledError } = await supabase
    .from("crawled_content")
    .delete()
    .gte("crawled_at", "1970-01-01")
    .select();

  if (crawledError) {
    console.error("crawled_content 삭제 실패:", crawledError.message);
  } else {
    console.log(`crawled_content 삭제 완료: ${deletedCrawled?.length || 0}건`);
  }

  console.log("\n=== 삭제 완료 ===");
}

main().catch(console.error);
