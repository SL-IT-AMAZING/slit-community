import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve, extname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { uploadToR2, isR2Configured } from "../src/lib/storage/r2.js";
import { translateToKorean } from "../src/lib/crawlers/translate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

config({
  path: resolve(PROJECT_ROOT, ".env.local"),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PLATFORM_TO_TYPE = {
  youtube: "video",
  github: "open-source",
  trendshift: "open-source",
  reddit: "reddit",
  x: "x-thread",
  threads: "threads",
  linkedin: "linkedin",
};

function generateSlug(title, platformId) {
  const base = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50)
    : platformId;
  return `${base}-${Date.now().toString(36)}`;
}

function formatYoutubeBody(digestResult) {
  if (!digestResult) return null;

  const parts = [];

  if (digestResult.keyQA) {
    const qa = digestResult.keyQA;
    parts.push(`## 핵심 Q&A\n`);
    if (qa.question && qa.answer) {
      parts.push(`**Q: ${qa.question}**\n\n${qa.answer}\n`);
    }
    if (qa.mechanism?.question && qa.mechanism?.points?.length) {
      parts.push(`\n**${qa.mechanism.question}**\n`);
      qa.mechanism.points.forEach((p) => parts.push(`- ${p}\n`));
    }
  }

  if (digestResult.intro) {
    parts.push(`\n## 영상 개요\n\n${digestResult.intro}\n`);
  }

  if (digestResult.timeline) {
    parts.push(`\n## 상세 타임라인\n\n${digestResult.timeline}\n`);
  }

  if (digestResult.recommendScore) {
    parts.push(`\n---\n\n**추천점수**: ${digestResult.recommendScore}/10\n`);
    if (digestResult.recommendReason) {
      parts.push(`**추천 이유**: ${digestResult.recommendReason}\n`);
    }
    if (digestResult.targetAudience) {
      parts.push(`**대상 독자**: ${digestResult.targetAudience}\n`);
    }
  }

  return parts.join("") || null;
}

async function formatGithubBody(item, translatedDescription = null) {
  const parts = [];
  const raw = item.raw_data || {};
  const llmSummary = raw.llm_summary;

  if (llmSummary?.summary) {
    parts.push(`${llmSummary.summary}\n`);

    if (llmSummary.features?.length > 0) {
      parts.push(`\n## 주요 기능\n`);
      llmSummary.features.forEach((f) => parts.push(`- ${f}\n`));
    }

    if (llmSummary.targetAudience) {
      parts.push(`\n**대상 사용자**: ${llmSummary.targetAudience}\n`);
    }

    if (llmSummary.beginner_description) {
      parts.push(`\n💡 ${llmSummary.beginner_description}\n`);
    }
  } else {
    const displayDescription = translatedDescription || item.description;
    if (displayDescription) {
      parts.push(`${displayDescription}\n`);
    }
  }

  parts.push(`\n## 저장소 정보\n`);
  if (raw.language) parts.push(`- **언어**: ${raw.language}\n`);
  if (raw.stars) parts.push(`- **스타**: ${raw.stars.toLocaleString()}\n`);
  if (raw.forks) parts.push(`- **포크**: ${raw.forks.toLocaleString()}\n`);
  if (raw.periodStars)
    parts.push(`- **최근 스타**: +${raw.periodStars.toLocaleString()}\n`);

  return parts.join("") || null;
}

async function uploadToStorage(localPath) {
  if (!localPath || !localPath.startsWith("/screenshots/")) {
    return localPath;
  }

  const fullPath = join(PROJECT_ROOT, "public", localPath);
  if (!existsSync(fullPath)) {
    console.warn(`  ⚠️ File not found: ${localPath}`);
    return null;
  }

  const storagePath = localPath.replace(/^\/screenshots\//, "");

  if (isR2Configured()) {
    const r2Url = await uploadToR2(fullPath, storagePath);
    if (r2Url) return r2Url;
  }

  try {
    const fileBuffer = readFileSync(fullPath);
    const ext = extname(localPath).toLowerCase();
    const contentType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/png";

    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(storagePath, fileBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.warn(
        `  ⚠️ Upload failed: ${storagePath} - ${uploadError.message}`,
      );
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.warn(`  ⚠️ Upload error: ${err.message}`);
    return null;
  }
}

async function processMediaUrls(rawData) {
  if (!rawData) return rawData;

  const processed = { ...rawData };

  const singleFields = [
    "star_history_screenshot",
    "downloadedVideoUrl",
    "twitterVideoUrl",
    "threadsVideoUrl",
  ];
  for (const field of singleFields) {
    if (processed[field]?.startsWith("/screenshots/")) {
      processed[field] = await uploadToStorage(processed[field]);
    }
  }

  const arrayFields = ["downloadedMedia"];
  for (const field of arrayFields) {
    if (Array.isArray(processed[field])) {
      processed[field] = await Promise.all(
        processed[field].map(async (url) => {
          if (url?.startsWith("/screenshots/")) {
            return (await uploadToStorage(url)) || url;
          }
          return url;
        }),
      );
    }
  }

  return processed;
}

async function publishContent(ids) {
  console.log(`Fetching ${ids.length} items...`);

  const { data: items, error } = await supabase
    .from("crawled_content")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("Error fetching items:", error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log("No items found");
    return;
  }

  console.log(`Found ${items.length} items to publish`);
  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      // 중복 체크: 이미 같은 platform_id로 게시된 콘텐츠가 있는지 확인
      const { data: existing } = await supabase
        .from("content")
        .select("id")
        .eq("platform_id", item.platform_id)
        .eq("source_platform", item.platform)
        .limit(1);

      if (existing && existing.length > 0) {
        // 이미 게시된 콘텐츠 - crawled_content에서 삭제하고 skip
        await supabase.from("crawled_content").delete().eq("id", item.id);
        skipped++;
        continue;
      }

      let koreanTitle = item.translated_title || item.title || "(제목 없음)";
      let englishTitle = item.translated_title ? item.title : null;

      if (item.platform === "github") {
        koreanTitle = item.title;
        englishTitle = null;
      }

      let rawThumbnail;
      if (item.platform === "github") {
        rawThumbnail = item.screenshot_url;
      } else if (item.platform === "reddit") {
        rawThumbnail =
          item.raw_data?.highQualityImage || item.thumbnail_url || null;
      } else {
        rawThumbnail =
          item.thumbnail_url ||
          item.screenshot_url ||
          item.raw_data?.screenshotUrls?.[0];
      }
      const thumbnailUrl = await uploadToStorage(rawThumbnail);
      const processedRawData = await processMediaUrls(item.raw_data);

      const youtubeBody =
        item.platform === "youtube" && item.digest_result
          ? formatYoutubeBody(item.digest_result)
          : null;

      let githubBody = null;
      let githubDescriptionKo = null;
      if (item.platform === "github") {
        githubDescriptionKo = await translateToKorean(item.description);
        githubBody = await formatGithubBody(item, githubDescriptionKo);
      }

      const readmeScreenshotUrl =
        item.platform === "github" && item.screenshot_url ? thumbnailUrl : null;

      const isKoreanContent = ["threads", "x"].includes(item.platform);
      const isReddit = item.platform === "reddit";

      let bodyContent, bodyContentEn;

      if (isReddit) {
        bodyContentEn =
          item.content_text || item.digest_result?.content_en || null;
        bodyContent =
          item.translated_content ||
          item.digest_result?.content_ko ||
          bodyContentEn;
      } else if (isKoreanContent) {
        bodyContent = item.content_text || item.translated_content;
        bodyContentEn = item.translated_content;
      } else {
        bodyContent = item.translated_content || item.content_text;
        bodyContentEn = item.content_text;
      }

      const contentData = {
        slug: generateSlug(item.title, item.platform_id),
        title: koreanTitle,
        title_en: englishTitle,
        description:
          item.platform === "github"
            ? githubDescriptionKo?.slice(0, 500) || item.description
            : isKoreanContent
              ? item.content_text?.slice(0, 500) || item.description
              : item.translated_content?.slice(0, 500) || item.description,
        description_en:
          item.platform === "github"
            ? item.description
            : isKoreanContent
              ? item.translated_content?.slice(0, 500)
              : item.description,
        body: youtubeBody || githubBody || bodyContent,
        body_en: youtubeBody || githubBody || bodyContentEn,
        type: PLATFORM_TO_TYPE[item.platform] || "article",
        category: item.digest_result?.categories?.[0] || "ai-tools",
        tags: item.digest_result?.categories || [],
        thumbnail_url: thumbnailUrl,
        external_url: item.url,
        social_metadata: {
          ...processedRawData,
          platform: item.platform,
          translatedTitle: item.translated_title,
          translatedContent: item.translated_content,
          digest_result: item.digest_result,
          ...(readmeScreenshotUrl && {
            readme_screenshot: readmeScreenshotUrl,
          }),
        },
        platform_id: item.platform_id,
        author_info: {
          name: item.author_name,
          url: item.author_url,
          avatar: item.author_avatar,
        },
        status: "published",
        published_at: new Date().toISOString(),
        source_platform: item.platform,
      };

      const { error: insertError } = await supabase
        .from("content")
        .insert(contentData);

      if (insertError) {
        console.error(
          `❌ [${item.platform}] ${item.title?.slice(0, 40)}: ${insertError.message}`,
        );
        failed++;
        continue;
      }

      await supabase.from("crawled_content").delete().eq("id", item.id);
      published++;

      if (published % 20 === 0) {
        console.log(`Progress: ${published}/${items.length} published...`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== 게시 완료 ===`);
  console.log(`✅ 성공: ${published}`);
  console.log(`⏭️ 중복 스킵: ${skipped}`);
  console.log(`❌ 실패: ${failed}`);
}

const ids = JSON.parse(readFileSync("/tmp/publish_ids.json", "utf-8"));
publishContent(ids);
