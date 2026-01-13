"use client";

import YouTubeCard from "./youtube-card";
import XCard from "./x-card";
import GitHubCard from "./github-card";
import RedditCard from "./reddit-card";
import LinkedInCard from "./linkedin-card";
import ThreadsCard from "./threads-card";
import ContentCard from "../content-card";

// 콘텐츠 타입을 플랫폼으로 매핑
const TYPE_TO_PLATFORM = {
  video: "youtube",
  "x-thread": "x",
  linkedin: "linkedin",
  threads: "threads",
  "open-source": "github",
  reddit: "reddit",
};

// social_metadata에서 카드 props로 변환
function mapToYouTubeProps(content) {
  const meta = content.social_metadata || {};
  const author = content.author_info || {};

  return {
    videoId: meta.videoId,
    title: content.title,
    description: content.description,
    channelName: meta.channelName || author.name,
    channelAvatar: meta.channelAvatar || author.avatar,
    viewCount: meta.viewCount,
    likeCount: meta.likeCount,
    duration: meta.duration,
    publishedAt: content.published_at,
    externalUrl: content.external_url,
    thumbnailUrl: content.thumbnail_url,
  };
}

function mapToXProps(content) {
  const meta = content.social_metadata || {};
  const author = content.author_info || {};

  return {
    content: content.body_en || content.description_en || content.body,
    authorName: author.name,
    authorHandle: meta.authorHandle || author.handle,
    authorAvatar: author.avatar,
    verified: author.verified,
    likeCount: meta.likeCount,
    retweetCount: meta.retweetCount,
    replyCount: meta.replyCount,
    publishedAt: content.published_at,
    mediaUrls: meta.mediaUrls || [],
    externalUrl: content.external_url,
    contentId: content.id,
    translatedContent: meta.translatedContent || content.body,
  };
}

function mapToGitHubProps(content) {
  const meta = content.social_metadata || {};

  return {
    repoOwner: meta.repoOwner,
    repoName: meta.repoName,
    description: content.description,
    language: meta.language,
    languageColor: meta.languageColor,
    stars: meta.stars,
    forks: meta.forks,
    issues: meta.issues,
    watchers: meta.watchers,
    topics: meta.topics || content.tags || [],
    lastUpdated: meta.lastUpdated,
    readmeImageUrl: content.readme_image_url,
    externalUrl: content.external_url,
    // 새로운 props (Trendshift + Star History + License)
    trendshiftBadgeUrl: meta.trendshiftBadgeUrl,
    trendshiftRank: meta.trendshiftRank,
    trendshiftRepoId: meta.trendshiftRepoId,
    licenseType: meta.license,
    starHistoryUrl: meta.starHistoryUrl,
  };
}

function mapToRedditProps(content) {
  const meta = content.social_metadata || {};
  const author = content.author_info || {};

  return {
    title: content.title_en || content.title,
    content: content.body_en || content.description_en || content.body,
    subreddit: meta.subreddit,
    authorName: meta.authorName || author.name,
    authorAvatar: author.avatar,
    upvotes: meta.upvotes,
    downvotes: meta.downvotes,
    commentCount: meta.commentCount,
    awards: meta.awards || [],
    publishedAt: content.published_at,
    mediaUrl: content.thumbnail_url,
    externalUrl: content.external_url,
    contentId: content.id,
    translatedTitle: meta.translatedTitle || content.title,
    translatedContent: meta.translatedContent || content.body,
  };
}

function mapToLinkedInProps(content) {
  const meta = content.social_metadata || {};
  const author = content.author_info || {};

  return {
    content: content.description || content.body,
    authorName: author.name,
    authorTitle: meta.authorTitle || author.subtitle,
    authorAvatar: author.avatar,
    likeCount: meta.likeCount,
    commentCount: meta.commentCount,
    repostCount: meta.repostCount,
    publishedAt: content.published_at,
    articlePreview: meta.articlePreview,
    externalUrl: content.external_url,
  };
}

function mapToThreadsProps(content) {
  const meta = content.social_metadata || {};
  const author = content.author_info || {};

  return {
    content: content.body_en || content.description_en || content.body,
    authorName: author.name,
    authorHandle: meta.authorHandle || author.handle,
    authorAvatar: author.avatar,
    verified: author.verified,
    likeCount: meta.likeCount,
    replyCount: meta.replyCount,
    repostCount: meta.repostCount,
    publishedAt: content.published_at,
    mediaUrls: meta.mediaUrls || [],
    externalUrl: content.external_url,
    contentId: content.id,
    translatedContent: meta.translatedContent || content.body,
  };
}

export default function SocialCardRenderer({
  content,
  metricsHistory = [],
  className,
}) {
  const platform = TYPE_TO_PLATFORM[content.type];

  switch (platform) {
    case "youtube":
      return (
        <YouTubeCard
          {...mapToYouTubeProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    case "x":
      return (
        <XCard
          {...mapToXProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    case "github":
      return (
        <GitHubCard
          {...mapToGitHubProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    case "reddit":
      return (
        <RedditCard
          {...mapToRedditProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    case "linkedin":
      return (
        <LinkedInCard
          {...mapToLinkedInProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    case "threads":
      return (
        <ThreadsCard
          {...mapToThreadsProps(content)}
          metricsHistory={metricsHistory}
          className={className}
        />
      );

    default:
      // article, news 등 일반 콘텐츠는 기존 ContentCard 사용
      return (
        <ContentCard
          slug={content.slug}
          title={content.title}
          titleEn={content.title_en}
          description={content.description}
          descriptionEn={content.description_en}
          type={content.type}
          category={content.category}
          isPremium={content.is_premium}
          isFeatured={content.is_featured}
          viewCount={content.view_count}
          thumbnailUrl={content.thumbnail_url}
          publishedAt={content.published_at}
        />
      );
  }
}
