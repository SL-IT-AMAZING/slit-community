import { fetchPostDetails, loadCookies, loadCookiesFromEnv } from '../src/lib/crawlers/screenshot-crawler.js';
import { getScreenshotDir } from '../src/lib/crawlers/index.js';

const url = 'https://x.com/vibecodeapp/status/2011962194993561934';
const cookies = loadCookies('x') || loadCookiesFromEnv('x');

if (!cookies) {
  console.log('No cookies found');
  process.exit(1);
}

const screenshotInfo = getScreenshotDir('x');
console.log('Screenshot dir:', screenshotInfo.dir);

try {
  const result = await fetchPostDetails('x', url, cookies, screenshotInfo);
  console.log('\n=== Result ===');
  console.log('screenshotUrl:', result.screenshotUrl);
  console.log('mediaUrls:', result.mediaUrls?.length || 0, 'items');
  console.log('downloadedMedia:', result.downloadedMedia?.length || 0, 'items');
  console.log('hasVideo:', result.hasVideo);
  console.log('twitterVideoUrl:', result.twitterVideoUrl ? 'EXISTS (' + result.twitterVideoUrl.substring(0, 60) + '...)' : 'MISSING');
  console.log('downloadedVideoUrl:', result.downloadedVideoUrl || 'MISSING');
  console.log('youtubeEmbedUrl:', result.youtubeEmbedUrl || 'MISSING');
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}
