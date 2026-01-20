/**
 * social_metadata.star_history_screenshot 마이그레이션
 */

import { config } from "dotenv";
import { dirname, resolve, join, extname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BUCKET_NAME = "screenshots";
const PUBLIC_DIR = resolve(__dirname, "..", "public");

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function localPathToStoragePath(localPath) {
  return localPath.replace(/^\/screenshots\//, "");
}

async function uploadFile(localPath, storagePath) {
  const fullPath = join(PUBLIC_DIR, localPath);

  if (!existsSync(fullPath)) {
    console.log(`    파일 없음: ${localPath}`);
    return null;
  }

  const ext = extname(localPath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const fileBuffer = readFileSync(fullPath);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error && !error.message.includes("already exists")) {
    console.log(`    업로드 실패: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== star_history_screenshot 마이그레이션 ===\n");
  if (isDryRun) console.log("🔍 DRY-RUN 모드\n");

  const { data: contents, error } = await supabase
    .from("content")
    .select("id, title, social_metadata")
    .eq("type", "open-source");

  if (error) {
    console.error("DB 조회 실패:", error);
    return;
  }

  let updateCount = 0;

  for (const content of contents) {
    const meta = content.social_metadata || {};
    const starHistoryPath = meta.star_history_screenshot;

    if (!starHistoryPath || !starHistoryPath.startsWith("/screenshots/"))
      continue;

    console.log(`\n[${content.id}] ${content.title?.substring(0, 40)}...`);
    console.log(`  star_history_screenshot: ${starHistoryPath}`);

    if (isDryRun) {
      const fullPath = join(PUBLIC_DIR, starHistoryPath);
      console.log(`    (dry-run) 파일 존재: ${existsSync(fullPath)}`);
      continue;
    }

    const storagePath = localPathToStoragePath(starHistoryPath);
    const publicUrl = await uploadFile(starHistoryPath, storagePath);

    if (publicUrl) {
      const updatedMeta = {
        ...meta,
        star_history_screenshot: publicUrl,
        starHistoryUrl: publicUrl, // 두 필드 모두 업데이트
      };

      const { error: updateError } = await supabase
        .from("content")
        .update({ social_metadata: updatedMeta })
        .eq("id", content.id);

      if (updateError) {
        console.error(`  ✗ DB 업데이트 실패: ${updateError.message}`);
      } else {
        console.log(`  ✓ 완료: ${publicUrl.substring(0, 60)}...`);
        updateCount++;
      }
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`업데이트: ${updateCount}건`);
}

main().catch(console.error);
