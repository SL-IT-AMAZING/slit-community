import { getLocale } from "next-intl/server";
import { fetchContent } from "@/services/supabase";
import ContentList from "./content-list";

export default async function ContentPage({ searchParams }) {
  const locale = await getLocale();
  const content = await fetchContent({ limitCount: 50 });
  const initialType = searchParams?.type || null;

  // Transform content to match expected format
  const formattedContent = content.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    titleEn: item.title_en,
    description: item.description,
    descriptionEn: item.description_en,
    type: item.type,
    category: item.category,
    isPremium: item.is_premium,
    viewCount: item.view_count || 0,
    thumbnailUrl: item.thumbnail_url,
    publishedAt: item.published_at,
  }));

  return <ContentList initialContent={formattedContent} locale={locale} initialType={initialType} />;
}
