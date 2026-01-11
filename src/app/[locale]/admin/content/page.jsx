import { getLocale } from "next-intl/server";
import { fetchAllContent } from "@/services/supabase";
import AdminContentList from "./content-list";

export default async function AdminContentPage() {
  const locale = await getLocale();
  const content = await fetchAllContent({ limitCount: 100 });

  return <AdminContentList initialContent={content} locale={locale} />;
}
