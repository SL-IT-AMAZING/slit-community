#!/usr/bin/env node

/**
 * YouTube digest 결과를 DB에 저장하는 스크립트
 *
 * 사용법:
 *   node scripts/save-digest.js <VIDEO_ID> '<JSON_RESULT>'
 *
 * 예시:
 *   node scripts/save-digest.js "dQw4w9WgXcQ" '{"keyQA":{"question":"..."}}'
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// .env.local 로드
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function saveDigest(videoId, digestResult) {
  if (!videoId) {
    console.error("Error: VIDEO_ID is required");
    process.exit(1);
  }

  if (!digestResult) {
    console.error("Error: JSON_RESULT is required");
    process.exit(1);
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(digestResult);
  } catch (e) {
    console.error("Error: Invalid JSON format");
    console.error(e.message);
    process.exit(1);
  }

  // DB 업데이트
  const { data, error } = await supabase
    .from("crawled_content")
    .update({
      status: "completed",
      digest_result: {
        ...parsedResult,
        processedAt: new Date().toISOString(),
      },
    })
    .eq("platform_id", videoId)
    .eq("platform", "youtube")
    .select("id, title");

  if (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error(`Warning: No record found for video ID: ${videoId}`);
    console.log("Digest result was not saved to DB (record may not exist)");
    process.exit(0);
  }

  console.log(`✅ DB 저장 완료: ${videoId}`);
  console.log(`   Title: ${data[0].title}`);
}

// 명령행 인수 처리
const videoId = process.argv[2];
const digestResult = process.argv[3];

saveDigest(videoId, digestResult)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error.message);
    process.exit(1);
  });
