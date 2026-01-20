import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ===== Generic Collection Functions (Legacy Support) =====

export const fetchCollectionData = async (collectionName) => {
  const supabase = await createClient();

  // Map old collection names to new table names (snake_case)
  const tableNameMap = {
    Experiences: "experiences",
    Projects: "projects",
  };

  const tableName =
    tableNameMap[collectionName] || collectionName.toLowerCase();

  let query = supabase.from(tableName).select("*");

  // Apply ordering for specific collections
  if (collectionName === "Experiences") {
    query = query.order("order", { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    // Return empty array instead of throwing to maintain backward compatibility
    return [];
  }

  return data || [];
};

// ===== Content Functions =====

export const fetchContent = async ({
  type,
  category,
  isPremium,
  limitCount = 20,
} = {}) => {
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limitCount);

  if (type) {
    query = query.eq("type", type);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (typeof isPremium === "boolean") {
    query = query.eq("is_premium", isPremium);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching content:", error);
    throw error;
  }

  return data || [];
};

export const fetchFeaturedContent = async (limitCount = 6) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error("Error fetching featured content:", error);
    throw error;
  }

  return data || [];
};

export const fetchContentBySlug = async (slug) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    console.error("Error fetching content by slug:", error);
    throw error;
  }

  return data;
};

export const incrementViewCount = async (contentId) => {
  const supabase = await createClient();

  const { error } = await supabase.rpc("increment_view_count", {
    content_id: contentId,
  });

  if (error) {
    console.error("Error incrementing view count:", error);
  }
};

// ===== User Functions =====

export const getUserProfile = async (userId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching user profile:", error);
    throw error;
  }

  return data;
};

export const updateUserProfile = async (userId, profileData) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const createOrUpdateUser = async (userData) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        email: userData.email,
        display_name: userData.displayName || userData.name,
        photo_url: userData.photoURL || userData.image,
        provider: userData.provider || "credentials",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error creating/updating user:", error);
    throw error;
  }

  return data;
};

// ===== Bookmark Functions =====

export const addBookmark = async (userId, contentId) => {
  const supabase = await createClient();

  const { error } = await supabase.from("bookmarks").insert({
    user_id: userId,
    content_id: contentId,
  });

  if (error) {
    console.error("Error adding bookmark:", error);
    throw error;
  }
};

export const removeBookmark = async (userId, contentId) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("content_id", contentId);

  if (error) {
    console.error("Error removing bookmark:", error);
    throw error;
  }
};

export const getUserBookmarks = async (userId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      content_id,
      content:content_id (*)
    `,
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user bookmarks:", error);
    throw error;
  }

  return data?.map((b) => b.content).filter(Boolean) || [];
};

export const isContentBookmarked = async (userId, contentId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    console.error("Error checking bookmark status:", error);
    return false;
  }

  return !!data;
};

// ===== Admin Functions =====

export const fetchAllContent = async ({ status, limitCount = 50 } = {}) => {
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all content:", error);
    throw error;
  }

  return data || [];
};

export const createContent = async (contentData) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .insert({
      slug: contentData.slug,
      title: contentData.title,
      title_en: contentData.titleEn,
      description: contentData.description,
      description_en: contentData.descriptionEn,
      body: contentData.body,
      body_en: contentData.bodyEn,
      type: contentData.type,
      category: contentData.category,
      tags: contentData.tags || [],
      thumbnail_url: contentData.thumbnailUrl,
      external_url: contentData.externalUrl,
      is_premium: contentData.isPremium || false,
      is_featured: contentData.isFeatured || false,
      status: contentData.status || "draft",
      published_at:
        contentData.status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating content:", error);
    throw error;
  }

  return data;
};

export const updateContent = async (contentId, contentData) => {
  const supabase = await createClient();

  const updateData = {
    title: contentData.title,
    title_en: contentData.titleEn,
    description: contentData.description,
    description_en: contentData.descriptionEn,
    body: contentData.body,
    body_en: contentData.bodyEn,
    type: contentData.type,
    category: contentData.category,
    tags: contentData.tags || [],
    thumbnail_url: contentData.thumbnailUrl,
    external_url: contentData.externalUrl,
    is_premium: contentData.isPremium || false,
    is_featured: contentData.isFeatured || false,
    status: contentData.status,
    updated_at: new Date().toISOString(),
  };

  // Set published_at if publishing for first time
  if (contentData.status === "published" && !contentData.publishedAt) {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("content")
    .update(updateData)
    .eq("id", contentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating content:", error);
    throw error;
  }

  return data;
};

export const deleteContent = async (contentId) => {
  const supabase = await createClient();

  const { error } = await supabase.from("content").delete().eq("id", contentId);

  if (error) {
    console.error("Error deleting content:", error);
    throw error;
  }
};

export const getContentById = async (contentId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("id", contentId)
    .single();

  if (error) {
    console.error("Error fetching content by id:", error);
    throw error;
  }

  return data;
};

// ===== Subscription Functions =====

export const createSubscription = async (subscriptionData) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: subscriptionData.userId,
      plan: subscriptionData.plan,
      payment_method: subscriptionData.paymentMethod,
      payment_id: subscriptionData.paymentId,
      status: "active",
      end_date: subscriptionData.endDate,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }

  // Update user's premium status
  await supabase
    .from("users")
    .update({
      is_premium: true,
      subscription_tier: subscriptionData.plan,
      subscription_end_date: subscriptionData.endDate,
    })
    .eq("id", subscriptionData.userId);

  return data;
};

export const cancelSubscription = async (subscriptionId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      auto_renew: false,
    })
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }

  return data;
};

// ===== Categories Functions =====

export const fetchCategories = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }

  return data || [];
};

// ===== Admin Stats =====

export const getAdminStats = async () => {
  const supabase = await createClient();

  const [contentResult, usersResult, premiumResult] = await Promise.all([
    supabase.from("content").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_premium", true),
  ]);

  return {
    totalContent: contentResult.count || 0,
    totalUsers: usersResult.count || 0,
    premiumUsers: premiumResult.count || 0,
  };
};

// ===== All Users (Admin) =====

export const fetchAllUsers = async ({ limitCount = 50 } = {}) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return data || [];
};

export const updateUserRole = async (userId, role) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// ===== SNS/Platform Content Functions =====

// 플랫폼별 타입 매핑
const PLATFORM_TYPE_MAP = {
  youtube: "video",
  x: "x-thread",
  linkedin: "linkedin",
  threads: "threads",
  github: "open-source",
  reddit: "reddit",
};

// 플랫폼별 최신 콘텐츠 조회
export const fetchLatestByPlatform = async ({
  platform,
  limitCount = 20,
} = {}) => {
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select("*, social_metadata, author_info")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limitCount);

  if (platform && PLATFORM_TYPE_MAP[platform]) {
    query = query.eq("type", PLATFORM_TYPE_MAP[platform]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching platform content:", error);
    throw error;
  }

  return data || [];
};

export const fetchRecommendedContent = async (limitCount = 6) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .in("type", ["news", "article"])
    .order("published_at", { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error("Error fetching recommended content:", error);
    throw error;
  }

  return data || [];
};

// ===== Metrics History Functions =====

// 메트릭 히스토리 저장
export const saveMetricsHistory = async (contentId, metrics) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("metrics_history")
    .insert({
      content_id: contentId,
      metrics,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving metrics history:", error);
    throw error;
  }

  return data;
};

// 메트릭 히스토리 조회 (그래프용)
export const fetchMetricsHistory = async (contentId, days = 30) => {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("metrics_history")
    .select("*")
    .eq("content_id", contentId)
    .gte("recorded_at", startDate.toISOString())
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("Error fetching metrics history:", error);
    throw error;
  }

  return data || [];
};

// 콘텐츠의 최신 메트릭 조회
export const getLatestMetrics = async (contentId) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("metrics_history")
    .select("*")
    .eq("content_id", contentId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching latest metrics:", error);
    return null;
  }

  return data;
};

// ===== Content with Social Metadata =====

// social_metadata 포함해서 콘텐츠 생성
export const createContentWithSocial = async (contentData) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .insert({
      slug: contentData.slug,
      title: contentData.title,
      title_en: contentData.titleEn,
      description: contentData.description,
      description_en: contentData.descriptionEn,
      body: contentData.body,
      body_en: contentData.bodyEn,
      type: contentData.type,
      category: contentData.category,
      tags: contentData.tags || [],
      thumbnail_url: contentData.thumbnailUrl,
      external_url: contentData.externalUrl,
      is_premium: contentData.isPremium || false,
      is_featured: contentData.isFeatured || false,
      status: contentData.status || "draft",
      published_at:
        contentData.status === "published" ? new Date().toISOString() : null,
      // SNS 관련 필드
      social_metadata: contentData.socialMetadata || {},
      platform_id: contentData.platformId || null,
      author_info: contentData.authorInfo || {},
      readme_image_url: contentData.readmeImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating content with social:", error);
    throw error;
  }

  return data;
};

// social_metadata 포함해서 콘텐츠 업데이트
export const updateContentWithSocial = async (contentId, contentData) => {
  const supabase = await createClient();

  const updateData = {
    title: contentData.title,
    title_en: contentData.titleEn,
    description: contentData.description,
    description_en: contentData.descriptionEn,
    body: contentData.body,
    body_en: contentData.bodyEn,
    type: contentData.type,
    category: contentData.category,
    tags: contentData.tags || [],
    thumbnail_url: contentData.thumbnailUrl,
    external_url: contentData.externalUrl,
    is_premium: contentData.isPremium || false,
    is_featured: contentData.isFeatured || false,
    status: contentData.status,
    updated_at: new Date().toISOString(),
    // SNS 관련 필드
    social_metadata: contentData.socialMetadata || {},
    platform_id: contentData.platformId || null,
    author_info: contentData.authorInfo || {},
    readme_image_url: contentData.readmeImageUrl || null,
  };

  if (contentData.status === "published" && !contentData.publishedAt) {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("content")
    .update(updateData)
    .eq("id", contentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating content with social:", error);
    throw error;
  }

  return data;
};

// ===== Crawled Content Functions =====

// 크롤링 콘텐츠 조회 (Admin - service_role 사용)
export const fetchCrawledContent = async ({
  platform,
  status,
  limit = 50,
} = {}) => {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("crawled_content")
    .select("*")
    .order("crawled_at", { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq("platform", platform);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching crawled content:", error);
    throw error;
  }

  return data || [];
};

export const getCrawledById = async (id) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching crawled content by ID:", error);
    throw error;
  }

  return data;
};

export const getCrawledByPlatform = async (
  platform,
  statuses = ["pending", "pending_analysis"],
) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", platform)
    .in("status", statuses)
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("Error fetching crawled content by platform:", error);
    throw error;
  }

  return data || [];
};

// 크롤링 콘텐츠 상태 업데이트
export const updateCrawledStatus = async (ids, status) => {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("crawled_content")
    .update({ status })
    .in("id", ids);

  if (error) {
    console.error("Error updating crawled status:", error);
    throw error;
  }
};

// 크롤링 콘텐츠 분석 결과 저장
export const saveCrawledDigest = async (id, digestResult) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("crawled_content")
    .update({
      digest_result: digestResult,
      status: "completed",
    })
    .eq("id", id);

  if (error) {
    console.error("Error saving crawled digest:", error);
    throw error;
  }
};

// 크롤링 콘텐츠 번역 결과 저장
export const updateCrawledTranslation = async (id, translation) => {
  const supabase = await createClient();

  const updateData = {};
  if (translation.translated_title) {
    updateData.translated_title = translation.translated_title;
  }
  if (translation.translated_content) {
    updateData.translated_content = translation.translated_content;
  }

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from("crawled_content")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error saving crawled translation:", error);
    throw error;
  }
};

// 크롤링 콘텐츠 삭제
export const deleteCrawledContent = async (ids) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("crawled_content")
    .delete()
    .in("id", ids);

  if (error) {
    console.error("Error deleting crawled content:", error);
    throw error;
  }
};

// LinkedIn 수동 업로드 (스크린샷)
export const uploadLinkedInScreenshot = async (
  screenshotUrl,
  metadata = {},
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("crawled_content")
    .insert({
      platform: "linkedin",
      platform_id: `manual_${Date.now()}`,
      title: metadata.title || "LinkedIn Screenshot",
      url: metadata.url || "https://linkedin.com",
      screenshot_url: screenshotUrl,
      status: "pending",
      raw_data: metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Error uploading LinkedIn screenshot:", error);
    throw error;
  }

  return data;
};

// ===== Open Source (GitHub) Functions =====

export const fetchOpenSourceContent = async ({
  language,
  sortBy = "stars",
  limitCount = 50,
} = {}) => {
  const supabase = await createClient();

  const query = supabase
    .from("content")
    .select("*")
    .eq("status", "published")
    .eq("type", "open-source")
    .limit(limitCount);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching open source content:", error);
    throw error;
  }

  let result = data || [];

  if (language) {
    result = result.filter((item) => {
      const lang = item.social_metadata?.language;
      return lang && lang.toLowerCase() === language.toLowerCase();
    });
  }

  result.sort((a, b) => {
    if (sortBy === "stars") {
      return (b.social_metadata?.stars || 0) - (a.social_metadata?.stars || 0);
    } else if (sortBy === "forks") {
      return (b.social_metadata?.forks || 0) - (a.social_metadata?.forks || 0);
    } else if (sortBy === "recent") {
      return new Date(b.published_at) - new Date(a.published_at);
    }
    return 0;
  });

  return result;
};

export const fetchOpenSourceLanguages = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select("social_metadata")
    .eq("status", "published")
    .eq("type", "open-source");

  if (error) {
    console.error("Error fetching languages:", error);
    throw error;
  }

  const languageCounts = {};
  (data || []).forEach((item) => {
    const lang = item.social_metadata?.language;
    if (lang) {
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
  });

  return Object.entries(languageCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

// ===== Newsletter Functions =====

export const subscribeToNewsletter = async (email) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) {
    console.error("Error subscribing to newsletter:", error);
    throw error;
  }

  return data;
};

export const unsubscribeFromNewsletter = async (email) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase().trim())
    .select()
    .single();

  if (error) {
    console.error("Error unsubscribing from newsletter:", error);
    throw error;
  }

  return data;
};

export const getNewsletterSubscriberCount = async () => {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    console.error("Error getting subscriber count:", error);
    return 0;
  }

  return count || 0;
};
