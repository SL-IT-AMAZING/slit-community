/**
 * social_metadata 안의 screenshotUrl을 Supabase Storage URL로 마이그레이션
 */

import { config } from "dotenv";
import { dirname, resolve, join, basename, extname } from "path";
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
const STORAGE_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function localPathToStoragePath(localPath) {
  return localPath.replace(/^\/screenshots\//, "");
}

async function uploadFile(localPath, storagePath) {
  const fullPath = join(PUBLIC_DIR, localPath);

  if (!existsSync(fullPath)) {
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
    console.error(`    업로드 실패: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== social_metadata.screenshotUrl 마이그레이션 ===\n");
  if (isDryRun) {
    console.log("🔍 DRY-RUN 모드\n");
  }

  // social_metadata에 /screenshots/ 경로가 있는 콘텐츠 조회
  const { data: contents, error } = await supabase
    .from("content")
    .select("id, title, social_metadata");

  if (error) {
    console.error("DB 조회 실패:", error);
    return;
  }

  let updateCount = 0;

  for (const content of contents) {
    if (!content.social_metadata) continue;

    const meta = content.social_metadata;
    const metaStr = JSON.stringify(meta);

    // /screenshots/ 경로가 있는지 확인
    if (!metaStr.includes("/screenshots/")) continue;

    console.log(`\n[${content.id}] ${content.title?.substring(0, 40)}...`);

    let updated = false;
    const updatedMeta = { ...meta };

    // screenshotUrl 필드 확인
    if (meta.screenshotUrl && meta.screenshotUrl.startsWith("/screenshots/")) {
      const localPath = meta.screenshotUrl;
      const storagePath = localPathToStoragePath(localPath);

      console.log(`  screenshotUrl: ${localPath}`);

      if (!isDryRun) {
        const publicUrl = await uploadFile(localPath, storagePath);
        if (publicUrl) {
          updatedMeta.screenshotUrl = publicUrl;
          updated = true;
          console.log(`    → ${publicUrl.substring(0, 60)}...`);
        }
      } else {
        const fullPath = join(PUBLIC_DIR, localPath);
        console.log(`    (dry-run) 파일 존재: ${existsSync(fullPath)}`);
      }
    }

    // screenshotUrls 배열 확인
    if (meta.screenshotUrls && Array.isArray(meta.screenshotUrls)) {
      const newUrls = [];
      for (const url of meta.screenshotUrls) {
        if (url && url.startsWith("/screenshots/")) {
          const localPath = url;
          const storagePath = localPathToStoragePath(localPath);

          console.log(`  screenshotUrls[]: ${localPath}`);

          if (!isDryRun) {
            const publicUrl = await uploadFile(localPath, storagePath);
            if (publicUrl) {
              newUrls.push(publicUrl);
              updated = true;
            } else {
              newUrls.push(url);
            }
          } else {
            newUrls.push(url);
          }
        } else {
          newUrls.push(url);
        }
      }
      updatedMeta.screenshotUrls = newUrls;
    }

    // DB 업데이트
    if (updated && !isDryRun) {
      const { error: updateError } = await supabase
        .from("content")
        .update({ social_metadata: updatedMeta })
        .eq("id", content.id);

      if (updateError) {
        console.error(`  ✗ DB 업데이트 실패: ${updateError.message}`);
      } else {
        console.log(`  ✓ social_metadata 업데이트 완료`);
        updateCount++;
      }
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`업데이트: ${updateCount}건`);
}

main().catch(console.error);
