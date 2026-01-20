/**
 * DB에서 로컬 경로를 사용하는 모든 컬럼 확인
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  // content 테이블 전체 조회
  const { data: contents, error } = await supabase.from("content").select("*");

  if (error) {
    console.error("조회 실패:", error);
    return;
  }

  console.log(`총 ${contents.length}개 콘텐츠\n`);

  // 각 컬럼에서 /screenshots/ 경로 찾기
  const localPaths = {
    thumbnail_url: [],
    social_metadata: [],
    author_info: [],
    other: [],
  };

  for (const content of contents) {
    const jsonStr = JSON.stringify(content);

    // /screenshots/ 패턴이 있는 콘텐츠 찾기
    if (jsonStr.includes("/screenshots/")) {
      console.log(
        `\n=== [${content.id}] ${content.title?.substring(0, 40)} ===`,
      );

      // thumbnail_url
      if (content.thumbnail_url?.includes("/screenshots/")) {
        console.log(`  thumbnail_url: ${content.thumbnail_url}`);
        localPaths.thumbnail_url.push(content.id);
      }

      // social_metadata 확인
      if (
        content.social_metadata &&
        JSON.stringify(content.social_metadata).includes("/screenshots/")
      ) {
        console.log(
          `  social_metadata: ${JSON.stringify(content.social_metadata).substring(0, 200)}`,
        );
        localPaths.social_metadata.push(content.id);
      }

      // author_info 확인
      if (
        content.author_info &&
        JSON.stringify(content.author_info).includes("/screenshots/")
      ) {
        console.log(
          `  author_info: ${JSON.stringify(content.author_info).substring(0, 200)}`,
        );
        localPaths.author_info.push(content.id);
      }

      // 기타 컬럼
      for (const [key, value] of Object.entries(content)) {
        if (
          [
            "thumbnail_url",
            "social_metadata",
            "author_info",
            "id",
            "title",
          ].includes(key)
        )
          continue;

        if (typeof value === "string" && value.includes("/screenshots/")) {
          console.log(`  ${key}: ${value.substring(0, 100)}`);
        }
      }
    }
  }

  console.log("\n=== 요약 ===");
  console.log(`thumbnail_url: ${localPaths.thumbnail_url.length}개`);
  console.log(`social_metadata: ${localPaths.social_metadata.length}개`);
  console.log(`author_info: ${localPaths.author_info.length}개`);
}

main();
