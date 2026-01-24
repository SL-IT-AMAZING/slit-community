import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

let r2Client = null;

function getR2Client() {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

export function getR2PublicUrl(storagePath) {
  const customDomain = process.env.R2_PUBLIC_URL;
  const bucketName = process.env.R2_BUCKET_NAME || "screenshots";

  if (customDomain) {
    return `${customDomain}/${storagePath}`;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  return `https://${bucketName}.${accountId}.r2.dev/${storagePath}`;
}

export async function uploadToR2(source, storagePath) {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "screenshots";

  if (!client) {
    console.log("[R2] Not configured, skipping upload");
    return null;
  }

  try {
    let fileBuffer;
    let contentType = "image/png";

    if (source.startsWith("http://") || source.startsWith("https://")) {
      const response = await fetch(source, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        console.log(`[R2] Failed to fetch ${source}: ${response.status}`);
        return null;
      }

      fileBuffer = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get("content-type") || "image/png";
    } else {
      const fullPath = path.isAbsolute(source)
        ? source
        : path.join(process.cwd(), "public", source);

      if (!fs.existsSync(fullPath)) {
        console.log(`[R2] File not found: ${fullPath}`);
        return null;
      }

      fileBuffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      contentType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".svg"
                ? "image/svg+xml"
                : ext === ".mp4"
                  ? "video/mp4"
                  : "application/octet-stream";
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    const publicUrl = getR2PublicUrl(storagePath);
    console.log(`[R2] Uploaded: ${storagePath}`);
    return publicUrl;
  } catch (error) {
    console.log(`[R2] Error uploading ${source}: ${error.message}`);
    return null;
  }
}

export function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * Buffer를 R2에 직접 업로드
 * @param {Buffer} buffer - 업로드할 데이터
 * @param {string} storagePath - R2 저장 경로
 * @param {string} contentType - MIME 타입
 * @returns {Promise<string|null>} Public URL 또는 null
 */
export async function uploadBufferToR2(
  buffer,
  storagePath,
  contentType = "application/octet-stream",
) {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "screenshots";

  if (!client) {
    console.log("[R2] Not configured, skipping buffer upload");
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const publicUrl = getR2PublicUrl(storagePath);
    console.log(
      `[R2] Uploaded buffer: ${storagePath} (${Math.round(buffer.length / 1024)}KB)`,
    );
    return publicUrl;
  } catch (error) {
    console.log(`[R2] Error uploading buffer: ${error.message}`);
    return null;
  }
}
