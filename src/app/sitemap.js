import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function sitemap() {
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.slit-ai.com";

  const staticPages = [
    "",
    "/content",
    "/categories",
    "/premium",
    "/login",
    "/register",
  ];

  const locales = ["ko", "en"];

  const staticUrls = locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "daily" : "weekly",
      priority: page === "" ? 1 : 0.8,
    })),
  );

  let contentUrls = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data: contentDocs } = await supabase
      .from("content")
      .select("slug, updated_at, published_at, is_featured")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100);

    if (contentDocs) {
      contentUrls = locales.flatMap((locale) =>
        contentDocs.map((content) => ({
          url: `${baseUrl}/${locale}/content/${content.slug}`,
          lastModified:
            content.updated_at || content.published_at || new Date(),
          changeFrequency: "weekly",
          priority: content.is_featured ? 0.8 : 0.6,
        })),
      );
    }
  } catch (error) {
    console.error("Error fetching content for sitemap:", error);
  }

  return [...staticUrls, ...contentUrls];
}
