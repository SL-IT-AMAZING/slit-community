import { getLocale } from "next-intl/server";
import { fetchContentBySlug, incrementViewCount } from "@/services/supabase";
import { notFound } from "next/navigation";
import ContentDetail from "./content-detail";

export async function generateMetadata({ params }) {
  // URL 인코딩된 한글 slug 디코딩
  const decodedSlug = decodeURIComponent(params.slug);
  const content = await fetchContentBySlug(decodedSlug);
  const locale = await getLocale();

  if (!content) {
    return { title: "Content Not Found" };
  }

  const title = locale === "en" && content.title_en ? content.title_en : content.title;
  const description = locale === "en" && content.description_en ? content.description_en : content.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: content.thumbnail_url ? [{ url: content.thumbnail_url }] : [],
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
  };

  return <ContentDetail content={formattedContent} locale={locale} />;
}
