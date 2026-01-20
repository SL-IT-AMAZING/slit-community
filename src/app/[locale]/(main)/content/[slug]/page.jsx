import { getLocale } from "next-intl/server";
import { fetchContentBySlug, incrementViewCount } from "@/services/supabase";
import { notFound } from "next/navigation";
import ContentDetail from "./content-detail";

const OG_IMAGE_PATTERNS = [
  /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
];

const CACHE_24_HOURS = 86400;

async function fetchOgImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OGBot/1.0)" },
      next: { revalidate: CACHE_24_HOURS },
    });
    const html = await response.text();

    for (const pattern of OG_IMAGE_PATTERNS) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  // URL 인코딩된 한글 slug 디코딩
  const decodedSlug = decodeURIComponent(params.slug);
  const content = await fetchContentBySlug(decodedSlug);
  const locale = await getLocale();

  if (!content) {
    return { title: "Content Not Found" };
  }

  const title =
    locale === "en" && content.title_en ? content.title_en : content.title;
  const description =
    locale === "en" && content.description_en
      ? content.description_en
      : content.description;

  // 이미지 우선순위: thumbnail_url > external_url의 OG 이미지 > 기본 이미지
  let imageUrl = content.thumbnail_url;

  if (!imageUrl && content.external_url) {
    imageUrl = await fetchOgImage(content.external_url);
  }

  // 기본 OG 이미지 (없으면)
  const defaultImage = "/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl || defaultImage }],
    },
  };
}

export default async function ContentDetailPage({ params }) {
  // URL 인코딩된 한글 slug 디코딩
  const slug = decodeURIComponent(params.slug);
  const locale = await getLocale();

  const content = await fetchContentBySlug(slug);

  if (!content) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementViewCount(content.id).catch(() => {});

  // Transform to expected format
  const formattedContent = {
    id: content.id,
    slug: content.slug,
    title: content.title,
    titleEn: content.title_en,
    description: content.description,
    descriptionEn: content.description_en,
    body: content.body,
    bodyEn: content.body_en,
    type: content.type,
    category: content.category,
    tags: content.tags || [],
    isPremium: content.is_premium,
    isFeatured: content.is_featured,
    viewCount: (content.view_count || 0) + 1,
    thumbnailUrl: content.thumbnail_url,
    externalUrl: content.external_url,
    publishedAt: content.published_at,
    // 소셜 미디어 메타데이터 (다운로드된 미디어 포함)
    socialMetadata: content.social_metadata,
  };

  return <ContentDetail content={formattedContent} locale={locale} />;
}
