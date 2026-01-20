import { getLocale } from "next-intl/server";
import {
  fetchOpenSourceContent,
  fetchOpenSourceLanguages,
} from "@/services/supabase";
import OpenSourceList from "./opensource-list";

export const metadata = {
  title: "Open Source Trends",
  description: "Discover trending open-source projects in AI and development",
};

export default async function OpenSourcePage() {
  const locale = await getLocale();
  const [content, languages] = await Promise.all([
    fetchOpenSourceContent({ limitCount: 100 }),
    fetchOpenSourceLanguages(),
  ]);

  const formattedContent = content.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    titleEn: item.title_en,
    description: item.description,
    descriptionEn: item.description_en,
    externalUrl: item.external_url,
    thumbnailUrl: item.thumbnail_url,
    readmeImageUrl: item.readme_image_url,
    publishedAt: item.published_at,
    socialMetadata: item.social_metadata || {},
    authorInfo: item.author_info || {},
  }));

  return (
    <OpenSourceList
      initialContent={formattedContent}
      languages={languages}
      locale={locale}
    />
  );
}
