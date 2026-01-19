import 'dotenv/config';
import { fetchPostDetails, loadCookies, loadCookiesFromEnv } from '../src/lib/crawlers/screenshot-crawler.js';
import { getScreenshotDir, upsertCrawledContent } from '../src/lib/crawlers/index.js';

const url = 'https://x.com/vibecodeapp/status/2011962194993561934';
const tweetId = '2011962194993561934';
const username = 'vibecodeapp';

const cookies = loadCookies('x') || loadCookiesFromEnv('x');
const screenshotInfo = getScreenshotDir('x');

try {
  const postDetails = await fetchPostDetails('x', url, cookies, screenshotInfo);
  
  const item = {
    platform: 'x',
    platform_id: tweetId,
    url: url,
    author_name: `@${username}`,
    author_url: `https://x.com/${username}`,
    screenshot_url: postDetails.screenshotUrl,
    status: 'pending_analysis',
    raw_data: {
      screenshotUrls: postDetails.screenshotUrls || [],
      downloadedMedia: postDetails.downloadedMedia || [],
      mediaUrls: postDetails.mediaUrls || [],
      externalLinks: postDetails.externalLinks || [],
      youtubeUrl: postDetails.youtubeUrl || null,
      youtubeVideoId: postDetails.youtubeVideoId || null,
      youtubeEmbedUrl: postDetails.youtubeEmbedUrl || null,
      twitterVideoUrl: postDetails.twitterVideoUrl || null,
      downloadedVideoUrl: postDetails.downloadedVideoUrl || null,
      hasVideo: postDetails.hasVideo || false,
    },
  };
  
  const { data, error } = await upsertCrawledContent([item]);
  
  if (error) {
    console.error('DB Error:', error);
  } else {
    console.log('Saved to DB:', data?.length || 1, 'items');
    console.log('ID:', data?.[0]?.id);
    console.log('downloadedVideoUrl:', item.raw_data.downloadedVideoUrl);
  }
} catch (err) {
  console.error('Error:', err.message);
}
