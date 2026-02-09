import { getLocale } from "next-intl/server";
import { fetchLatestByPlatform } from "@/services/supabase";
import ContentList from "./content-list";

const INITIAL_LOAD_COUNT = 12;

export default async function ContentPage({ searchParams }) {
  const locale = await getLocale();
  const { data, total } = await fetchLatestByPlatform({
    limitCount: INITIAL_LOAD_COUNT,
    offset: 0,
  });
  const initialType = (await searchParams)?.type || null;

  return (
    <ContentList
      initialContent={data}
      initialTotal={total}
      locale={locale}
      initialType={initialType}
    />
  );
}
