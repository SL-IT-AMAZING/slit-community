import { fetchContent } from "@/services/supabase";

export default async function sitemap() {
  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-community.vercel.app";

  // Static pages
  const staticPages = [
    "",
    "/content",
    "/categories",
    "/premium",
    "/login",
    "/register",
  ];

  const locales = ["ko", "en"];

  // Generate URLs for static pages in both locales
  const staticUrls = locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "daily" : "weekly",
      priority: page === "" ? 1 : 0.8,
    }))
  );

  // Fetch content from Supabase and add dynamic content URLs
  let contentUrls = [];
  try {
    const contentDocs = await fetchContent({ limitCount: 100 });
    contentUrls = locales.flatMap((locale) =>
      contentDocs.map((content) => ({
        url: `${baseUrl}/${locale}/content/${content.slug}`,
        lastModified: content.updated_at || content.published_at || new Date(),
        changeFrequency: "weekly",
        priority: content.is_featured ? 0.8 : 0.6,
      }))
    );
  } catch (error) {
    console.error("Error fetching content for sitemap:", error);
  }

  return [...staticUrls, ...contentUrls];
}
