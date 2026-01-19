import { google } from "googleapis";
import { upsertCrawledContent, getExistingPlatformIds, logCrawl } from "./index.js";

/**
 * 제목을 한국어로 번역 (Claude 에이전트가 분석 시 처리)
 */
async function translateTitle(title) {
  // 번역은 Claude 에이전트가 분석 단계에서 처리
  return null;
}

/**
 * YouTube 구독 피드 크롤러
 * YouTube Data API v3 + OAuth2 사용
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 무제한)
 */
export async function crawlYouTube({ limit } = {}) {
  logCrawl("youtube", "Starting crawl for subscription feed");

  // OAuth2 클라이언트 설정
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    // 1. 구독 채널 목록 가져오기
    logCrawl("youtube", "Fetching subscription list...");
    const subscriptions = await getAllSubscriptions(youtube);
    logCrawl("youtube", `Found ${subscriptions.length} subscribed channels`);

    // 2. 각 채널의 최근 24시간 영상 조회
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allVideos = [];

    for (const sub of subscriptions) {
      const channelId = sub.snippet.resourceId.channelId;
      const channelTitle = sub.snippet.title;

      try {
        const videos = await getChannelVideos(youtube, channelId, twentyFourHoursAgo);
        videos.forEach((video) => {
          video.channelTitle = channelTitle;
        });
        allVideos.push(...videos);
      } catch (error) {
        logCrawl("youtube", `Error fetching videos for ${channelTitle}: ${error.message}`);
      }
    }

    logCrawl("youtube", `Found ${allVideos.length} videos from last 24 hours`);

    // 3분 미만 영상 제외 (쇼츠 + 짧은 영상)
    const nonShortsVideos = allVideos.filter((video) => {
      const duration = video.contentDetails?.duration;
      if (!duration) return true; // duration이 없으면 포함
      const seconds = parseDuration(duration);
      return seconds >= 180; // 3분 이상만
    });

    logCrawl("youtube", `After filtering (<3min): ${nonShortsVideos.length} videos (removed ${allVideos.length - nonShortsVideos.length} short videos)`);

    if (nonShortsVideos.length === 0) {
      logCrawl("youtube", "No new videos found");
      return { success: true, count: 0 };
    }

    // 3. 중복 체크
    const videoIds = nonShortsVideos.map((v) => v.id);
    const existingIds = await getExistingPlatformIds("youtube", videoIds);
    const newVideos = nonShortsVideos.filter((v) => !existingIds.has(v.id));

    logCrawl("youtube", `New videos: ${newVideos.length}, Duplicates: ${existingIds.size}`);

    if (newVideos.length === 0) {
      logCrawl("youtube", "No new videos to save");
      return { success: true, count: 0 };
    }

    // 4. limit 적용
    const videosToSave = limit ? newVideos.slice(0, limit) : newVideos;

    // 5. 데이터 변환 및 제목 번역
    logCrawl("youtube", "Translating video titles...");
    const items = [];

    for (const video of videosToSave) {
      const translatedTitle = await translateTitle(video.snippet.title);

      items.push({
        platform: "youtube",
        platform_id: video.id,
        title: video.snippet.title,
        translated_title: translatedTitle,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        author_name: video.channelTitle || video.snippet.channelTitle,
        author_url: `https://www.youtube.com/channel/${video.snippet.channelId}`,
        thumbnail_url: getBestThumbnail(video.snippet.thumbnails),
        video_duration: video.contentDetails?.duration || null,
        published_at: video.snippet.publishedAt,  // 업로드 시간
        status: "pending",
        raw_data: {
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          tags: video.snippet.tags,
          categoryId: video.snippet.categoryId,
        },
      });

      // Rate limiting: 200ms 대기
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const { data: savedData, error } = await upsertCrawledContent(items);

    if (error) {
      throw error;
    }

    logCrawl("youtube", `Successfully saved ${savedData?.length || items.length} videos`);
    return { success: true, count: savedData?.length || items.length };
  } catch (error) {
    logCrawl("youtube", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 모든 구독 채널 가져오기 (페이지네이션 처리)
 */
async function getAllSubscriptions(youtube) {
  const subscriptions = [];
  let pageToken = null;

  do {
    const response = await youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken,
    });

    subscriptions.push(...response.data.items);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return subscriptions;
}

/**
 * 채널의 최근 영상 가져오기
 */
async function getChannelVideos(youtube, channelId, since) {
  // 채널의 업로드 플레이리스트 ID 조회
  const channelResponse = await youtube.channels.list({
    part: "contentDetails",
    id: channelId,
  });

  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    return [];
  }

  // 최근 영상 조회
  const playlistResponse = await youtube.playlistItems.list({
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: 10, // 채널당 최대 10개
  });

  // 24시간 이내 영상만 필터
  const recentVideos = playlistResponse.data.items.filter((item) => {
    const publishedAt = new Date(item.contentDetails.videoPublishedAt || item.snippet.publishedAt);
    return publishedAt >= since;
  });

  if (recentVideos.length === 0) {
    return [];
  }

  // 비디오 상세 정보 조회 (duration, statistics)
  const videoIds = recentVideos.map((item) => item.contentDetails.videoId);
  const videosResponse = await youtube.videos.list({
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(","),
  });

  return videosResponse.data.items;
}

/**
 * 최적의 썸네일 URL 선택
 */
function getBestThumbnail(thumbnails) {
  if (!thumbnails) return null;
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url
  );
}

/**
 * ISO 8601 duration을 초로 변환
 * 예: "PT1M30S" => 90, "PT1H2M3S" => 3723
 */
function parseDuration(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);

  return hours * 3600 + minutes * 60 + seconds;
}
