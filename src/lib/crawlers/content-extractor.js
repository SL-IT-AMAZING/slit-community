import * as cheerio from "cheerio";
import { getSupabaseAdmin } from "../supabase/admin.js";

/**
 * URL에서 본문 콘텐츠 추출
 * @param {string} url - 추출할 URL
 * @returns {Promise<{title: string, content: string, description: string}>}
 */
export async function extractContent(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $("script, style, nav, header, footer, aside, iframe, noscript").remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $(".sidebar, .advertisement, .ads, .social-share, .comments").remove();

  // 제목 추출
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    $("h1").first().text().trim();

  // 설명 추출
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  // 본문 추출 (우선순위별 셀렉터)
  const contentSelectors = [
    "article",
    '[role="main"]',
    "main",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content",
    ".post-body",
    "#content",
    ".markdown-body", // GitHub
    ".readme", // GitHub readme
  ];

  let contentText = "";

  for (const selector of contentSelectors) {
    const $content = $(selector);
    if ($content.length > 0) {
      contentText = extractTextFromElement($, $content);
      if (contentText.length > 200) {
        break;
      }
    }
  }

  // 셀렉터로 못 찾으면 body에서 직접 추출
  if (contentText.length < 200) {
    contentText = extractTextFromElement($, $("body"));
  }

  // 텍스트 정리
  contentText = cleanText(contentText);

  return {
    title: title.slice(0, 500),
    content: contentText.slice(0, 10000), // 최대 10000자
    description: description.slice(0, 500),
  };
}

/**
 * 요소에서 텍스트 추출 (HTML 태그 제거)
 */
function extractTextFromElement($, $el) {
  // p, li, h1-h6 등 블록 요소에서 텍스트 추출
  const texts = [];

  $el.find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, code").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      texts.push(text);
    }
  });

  // 블록 요소가 없으면 전체 텍스트
  if (texts.length === 0) {
    return $el.text().trim();
  }

  return texts.join("\n\n");
}

/**
 * 텍스트 정리
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, " ") // 여러 공백을 하나로
    .replace(/\n\s*\n/g, "\n\n") // 여러 줄바꿈을 2개로
    .replace(/^\s+|\s+$/g, "") // 앞뒤 공백 제거
    .trim();
}

/**
 * GitHub README 추출
 */
export async function extractGitHubReadme(repoUrl) {
  // GitHub URL에서 owner/repo 추출
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");

  // Raw README 가져오기 (main 또는 master 브랜치)
  const branches = ["main", "master"];
  const readmeFiles = ["README.md", "readme.md", "README", "readme.txt"];

  for (const branch of branches) {
    for (const readmeFile of readmeFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/${readmeFile}`;

      try {
        const response = await fetch(rawUrl);
        if (response.ok) {
          const content = await response.text();
          return {
            title: `${owner}/${cleanRepo}`,
            content: content.slice(0, 10000),
            description: content.split("\n").slice(0, 3).join(" ").slice(0, 500),
            source: rawUrl,
          };
        }
      } catch {
        // 다음 시도
      }
    }
  }

  // README를 못 찾으면 repo 페이지에서 description 추출
  return extractContent(repoUrl);
}

/**
 * 크롤링된 콘텐츠의 본문 추출 및 업데이트
 * @param {string[]} ids - 추출할 콘텐츠 ID 배열
 */
export async function extractAndUpdateContent(ids) {
  const supabase = getSupabaseAdmin();

  // 해당 콘텐츠 조회
  const { data: items, error: fetchError } = await supabase
    .from("crawled_content")
    .select("*")
    .in("id", ids);

  if (fetchError) {
    throw fetchError;
  }

  const results = [];

  for (const item of items) {
    try {
      let extracted;

      // 플랫폼별 추출 방식
      if (item.platform === "github" || item.platform === "trendshift") {
        extracted = await extractGitHubReadme(item.url);
      } else {
        extracted = await extractContent(item.url);
      }

      // DB 업데이트
      const { error: updateError } = await supabase
        .from("crawled_content")
        .update({
          content_text: extracted.content,
          description: extracted.description || item.description,
          raw_data: {
            ...item.raw_data,
            extracted_at: new Date().toISOString(),
            extraction_source: extracted.source || item.url,
          },
        })
        .eq("id", item.id);

      if (updateError) {
        results.push({ id: item.id, success: false, error: updateError.message });
      } else {
        results.push({ id: item.id, success: true, contentLength: extracted.content.length });
      }
    } catch (error) {
      results.push({ id: item.id, success: false, error: error.message });
    }
  }

  return results;
}
