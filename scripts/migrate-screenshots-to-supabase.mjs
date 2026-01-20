/**
 * 스크린샷 Supabase Storage 마이그레이션 스크립트
 *
 * 로컬 public/screenshots 폴더의 이미지를 Supabase Storage에 업로드하고
 * DB의 thumbnail_url을 업데이트합니다.
 *
 * 사용법:
 * node scripts/migrate-screenshots-to-supabase.mjs [--dry-run]
 *
 * 옵션:
 * --dry-run: 실제 업로드/업데이트 없이 작업 내용만 출력
 */

import { config } from "dotenv";
import { dirname, resolve, join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BUCKET_NAME = "screenshots";
const PUBLIC_DIR = resolve(__dirname, "..", "public");

// MIME 타입 매핑
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * 버킷 존재 확인 및 생성
 */
async function ensureBucketExists() {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("버킷 목록 조회 실패:", listError.message);
    throw listError;
  }

  const bucketExists = buckets.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`버킷 '${BUCKET_NAME}' 생성 중...`);
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      },
    );

    if (createError) {
      console.error("버킷 생성 실패:", createError.message);
      throw createError;
    }
    console.log(`✓ 버킷 '${BUCKET_NAME}' 생성 완료`);
  } else {
    console.log(`✓ 버킷 '${BUCKET_NAME}' 존재 확인`);
  }
}

/**
 * 파일을 Supabase Storage에 업로드
 */
async function uploadFile(localPath, storagePath) {
  const fullPath = join(PUBLIC_DIR, localPath);

  if (!existsSync(fullPath)) {
    console.error(`  ✗ 파일 없음: ${fullPath}`);
    return null;
  }

  const ext = extname(localPath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const fileBuffer = readFileSync(fullPath);

  // 기존 파일 확인 (이미 업로드된 경우 스킵)
  const { data: existingFile } = await supabase.storage
    .from(BUCKET_NAME)
    .list(storagePath.split("/").slice(0, -1).join("/"), {
      search: basename(storagePath),
    });

  if (existingFile && existingFile.length > 0) {
    // 이미 존재하면 URL 반환
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
    return urlData.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ 업로드 실패: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

/**
 * 로컬 경로를 Storage 경로로 변환
 * /screenshots/x/2026-01-19_11-49/post.png -> x/2026-01-19_11-49/post.png
 */
function localPathToStoragePath(localPath) {
  // /screenshots/ 제거
  return localPath.replace(/^\/screenshots\//, "");
}

/**
 * 메인 함수
 */
async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== 스크린샷 Supabase Storage 마이그레이션 ===\n");
  if (isDryRun) {
    console.log("🔍 DRY-RUN 모드: 실제 변경 없이 미리보기만 수행\n");
  }

  // 1. 버킷 확인/생성
  if (!isDryRun) {
    await ensureBucketExists();
  }

  // 2. DB에서 로컬 경로 thumbnail_url 조회
  console.log("\nDB에서 로컬 경로 thumbnail_url 조회 중...");
  const { data: contents, error } = await supabase
    .from("content")
    .select("id, slug, title, thumbnail_url")
    .like("thumbnail_url", "/screenshots/%");

  if (error) {
    console.error("DB 조회 실패:", error.message);
    process.exit(1);
  }

  if (!contents || contents.length === 0) {
    console.log("마이그레이션할 콘텐츠가 없습니다.");
    return;
  }

  console.log(
    `\n${contents.length}개의 콘텐츠 thumbnail_url 마이그레이션 필요\n`,
  );

  // 3. 각 파일 업로드 및 DB 업데이트
  let successCount = 0;
  let failCount = 0;

  for (const content of contents) {
    const localPath = content.thumbnail_url;
    const storagePath = localPathToStoragePath(localPath);

    console.log(
      `[${content.id}] ${content.title?.substring(0, 40) || content.slug}...`,
    );
    console.log(`  로컬: ${localPath}`);
    console.log(`  스토리지: ${storagePath}`);

    if (isDryRun) {
      const fullPath = join(PUBLIC_DIR, localPath);
      if (existsSync(fullPath)) {
        console.log(`  ✓ (dry-run) 파일 존재 확인`);
        successCount++;
      } else {
        console.log(`  ✗ (dry-run) 파일 없음`);
        failCount++;
      }
      continue;
    }

    // 실제 업로드
    const publicUrl = await uploadFile(localPath, storagePath);

    if (publicUrl) {
      // DB 업데이트
      const { error: updateError } = await supabase
        .from("content")
        .update({ thumbnail_url: publicUrl })
        .eq("id", content.id);

      if (updateError) {
        console.error(`  ✗ DB 업데이트 실패: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✓ 완료: ${publicUrl.substring(0, 60)}...`);
        successCount++;
      }
    } else {
      failCount++;
    }
  }

  // 결과 요약
  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`성공: ${successCount}건`);
  console.log(`실패: ${failCount}건`);

  if (isDryRun) {
    console.log(
      "\n실제 마이그레이션을 실행하려면 --dry-run 옵션 없이 다시 실행하세요.",
    );
  }
}

// 실행
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
