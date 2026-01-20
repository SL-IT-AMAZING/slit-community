import { getLocale } from "next-intl/server";
import { fetchLatestByPlatform } from "@/services/supabase";
import ContentList from "./content-list";

export default async function ContentPage({ searchParams }) {
  const locale = await getLocale();
  const content = await fetchLatestByPlatform({ limitCount: 100 });
  const initialType = (await searchParams)?.type || null;

  return (
    <ContentList
      initialContent={content}
      locale={locale}
      initialType={initialType}
    />
  );
}
