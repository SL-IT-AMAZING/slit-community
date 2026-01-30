import { getLocale } from "next-intl/server";
import { fetchTools, fetchToolStats } from "@/services/supabase";
import RatingsList from "./ratings-list";

export const metadata = {
  title: "Tool Ratings",
  description: "Discover and rate useful AI tools for development",
};

export default async function RatingsPage() {
  const locale = await getLocale();
  const [tools, stats] = await Promise.all([
    fetchTools({ limit: 100 }),
    fetchToolStats(),
  ]);

  const formattedTools = tools.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    descriptionEn: item.description_en,
    link: item.link,
    thumbnailUrl: item.thumbnail_url,
    adminRating: item.admin_rating,
    tags: item.tags || [],
    pricing: item.pricing,
    isFeatured: item.is_featured,
    pros: item.pros || [],
    cons: item.cons || [],
    createdAt: item.created_at,
  }));

  return (
    <RatingsList
      initialTools={formattedTools}
      toolStats={stats}
      locale={locale}
    />
  );
}
