/**
 * social_metadata.downloadedMedia 배열의 로컬 경로를 Supabase Storage URL로 마이그레이션
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

  console.log("=== social_metadata.downloadedMedia 마이그레이션 ===\n");
  if (isDryRun) {
    console.log("🔍 DRY-RUN 모드\n");
  }

  // 모든 콘텐츠 조회
  const { data: contents, error } = await supabase
    .from("content")
    .select("id, title, social_metadata");

  if (error) {
    console.error("DB 조회 실패:", error);
    return;
  }

  let updateCount = 0;
  let uploadCount = 0;

  for (const content of contents) {
    if (!content.social_metadata) continue;

    const meta = content.social_metadata;

    // downloadedMedia 배열에 로컬 경로가 있는지 확인
    if (!meta.downloadedMedia || !Array.isArray(meta.downloadedMedia)) continue;

    const hasLocalPaths = meta.downloadedMedia.some(
      (url) => url && url.startsWith("/screenshots/"),
    );

    if (!hasLocalPaths) continue;

    console.log(`\n[${content.id}] ${content.title?.substring(0, 40)}...`);

    const newDownloadedMedia = [];
    let updated = false;

    for (const url of meta.downloadedMedia) {
      if (url && url.startsWith("/screenshots/")) {
        const localPath = url;
        const storagePath = localPathToStoragePath(localPath);

        console.log(`  downloadedMedia: ${localPath}`);

        if (!isDryRun) {
          const publicUrl = await uploadFile(localPath, storagePath);
          if (publicUrl) {
            newDownloadedMedia.push(publicUrl);
            updated = true;
            uploadCount++;
            console.log(`    → 업로드 완료`);
          } else {
            newDownloadedMedia.push(url); // 실패 시 원래 URL 유지
          }
        } else {
          const fullPath = join(PUBLIC_DIR, localPath);
          console.log(`    (dry-run) 파일 존재: ${existsSync(fullPath)}`);
          newDownloadedMedia.push(url);
        }
      } else {
        newDownloadedMedia.push(url);
      }
    }

    // DB 업데이트
    if (updated && !isDryRun) {
      const updatedMeta = { ...meta, downloadedMedia: newDownloadedMedia };

      const { error: updateError } = await supabase
        .from("content")
        .update({ social_metadata: updatedMeta })
        .eq("id", content.id);

      if (updateError) {
        console.error(`  ✗ DB 업데이트 실패: ${updateError.message}`);
      } else {
        console.log(`  ✓ social_metadata.downloadedMedia 업데이트 완료`);
        updateCount++;
      }
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`업로드: ${uploadCount}개 파일`);
  console.log(`업데이트: ${updateCount}개 콘텐츠`);
}

main().catch(console.error);
