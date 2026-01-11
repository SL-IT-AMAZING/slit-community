"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ContentCard from "@/components/content/content-card";

import { FaBookmark, FaArrowLeft } from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

export default function BookmarksPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("profile.bookmarks");
  const locale = useLocale();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookmarks")
          .select(`
            content_id,
            content:content_id (
              id,
              slug,
              title,
              title_en,
              description,
              description_en,
              type,
              category,
              is_premium,
              view_count,
              thumbnail_url,
              published_at
            )
          `)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error fetching bookmarks:", error);
          return;
        }

        const formattedBookmarks = (data || [])
          .filter((b) => b.content)
          .map((b) => ({
            id: b.content.id,
            slug: b.content.slug,
            title: b.content.title,
            titleEn: b.content.title_en,
            description: b.content.description,
            descriptionEn: b.content.description_en,
            type: b.content.type,
            category: b.content.category,
            isPremium: b.content.is_premium,
            viewCount: b.content.view_count || 0,
            thumbnailUrl: b.content.thumbnail_url,
            publishedAt: b.content.published_at,
          }));

        setBookmarks(formattedBookmarks);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [session?.user?.id]);

  const handleRemoveBookmark = async (contentId) => {
    if (!session?.user?.id) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", session.user.id)
        .eq("content_id", contentId);

      if (error) {
        console.error("Error removing bookmark:", error);
        return;
      }

      setBookmarks((prev) => prev.filter((b) => b.id !== contentId));
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center py-8">
        <p className="mb-4 text-muted-foreground">
          {locale === "ko" ? "로그인이 필요합니다." : "Please log in to view your bookmarks."}
        </p>
        <Link href="/login">
          <Button>{locale === "ko" ? "로그인" : "Login"}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <FaArrowLeft />
          </Button>
        </Link>
        <h1 className="font-cera text-3xl font-bold">{t("title")}</h1>
      </div>

      {bookmarks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FaBookmark size={48} className="mb-4 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">{t("empty")}</p>
            <Link href="/content">
              <Button>
                {locale === "ko" ? "콘텐츠 둘러보기" : "Browse Content"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((item) => (
            <ContentCard
              key={item.id}
              slug={item.slug}
              title={item.title}
              titleEn={item.titleEn}
              description={item.description}
              descriptionEn={item.descriptionEn}
              type={item.type}
              category={item.category}
              isPremium={item.isPremium}
              viewCount={item.viewCount}
              thumbnailUrl={item.thumbnailUrl}
              publishedAt={item.publishedAt}
              isBookmarked={true}
              onBookmarkToggle={() => handleRemoveBookmark(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
