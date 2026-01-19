#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getPublishable() {
  // 분석 완료된 콘텐츠 (status: pending) 조회
  const { data, error } = await supabase
    .from("crawled_content")
    .select("id, platform, title, digest_result, status")
    .eq("status", "pending")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  // 추천점수 7점 이상 필터링
  const publishable = data.filter((item) => {
    const score = item.digest_result?.recommendScore;
    // GitHub, LinkedIn은 추천점수 없이 전부 게시
    if (item.platform === "github" || item.platform === "linkedin") {
      return true;
    }
    return score >= 7;
  });

  console.log("=== 게시 대상 콘텐츠 ===");
  console.log("총 " + publishable.length + "개\n");

  publishable.forEach((item, i) => {
    const score = item.digest_result?.recommendScore || "N/A";
    console.log(
      (i + 1) +
        ". [" +
        item.platform.toUpperCase() +
        "] " +
        item.title +
        " (Score: " +
        score +
        ")"
    );
  });

  // ID 목록 출력
  console.log("\n게시할 ID 목록:");
  console.log(JSON.stringify(publishable.map((item) => item.id)));
}

getPublishable();
