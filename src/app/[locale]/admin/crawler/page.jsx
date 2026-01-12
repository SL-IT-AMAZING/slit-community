import { getLocale } from "next-intl/server";
import { fetchCrawledContent } from "@/services/supabase";
import CrawlerList from "./crawler-list";

export default async function AdminCrawlerPage() {
  const locale = await getLocale();

  let crawledContent = [];
  try {
    crawledContent = await fetchCrawledContent({ limit: 100 });
  } catch (error) {
    console.error("Error fetching crawled content:", error);
  }

  return <CrawlerList initialContent={crawledContent} locale={locale} />;
}
