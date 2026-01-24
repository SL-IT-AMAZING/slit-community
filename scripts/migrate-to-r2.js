import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || "screenshots";

async function listSupabaseFiles(bucket, folder = "") {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000 });
  if (error) {
    console.error(`Error listing ${folder}:`, error.message);
    return [];
  }

  let files = [];
  for (const item of data || []) {
    const path = folder ? `${folder}/${item.name}` : item.name;
    if (item.id) {
      files.push(path);
    } else {
      const subFiles = await listSupabaseFiles(bucket, path);
      files = files.concat(subFiles);
    }
  }
  return files;
}

async function migrateFile(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    if (error) {
      console.log(`  ❌ Download failed: ${filePath} - ${error.message}`);
      return false;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "svg"
              ? "image/svg+xml"
              : ext === "mp4"
                ? "video/mp4"
                : "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);
    console.log(`  ✅ ${filePath}`);
    return true;
  } catch (err) {
    console.log(`  ❌ ${filePath}: ${err.message}`);
    return false;
  }
}

async function migrate() {
  console.log("=== Supabase → R2 Migration ===\n");

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
    console.error("R2 환경변수가 설정되지 않았습니다.");
    console.log(
      "필요한 환경변수: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
    process.exit(1);
  }

  const bucket = "screenshots";
  console.log(`Listing files in Supabase '${bucket}' bucket...`);

  const files = await listSupabaseFiles(bucket);
  console.log(`Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log("No files to migrate.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const result = await migrateFile(bucket, file);
    if (result) success++;
    else failed++;
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (success > 0) {
    console.log(`\n다음 단계:`);
    console.log(`1. R2 버킷에서 파일 확인`);
    console.log(`2. content 테이블의 URL 업데이트 (선택)`);
    console.log(`3. Supabase Storage 파일 삭제 (선택)`);
  }
}

migrate().catch(console.error);
