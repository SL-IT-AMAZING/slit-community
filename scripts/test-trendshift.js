import * as cheerio from 'cheerio';

const BASE_URL = 'https://trendshift.io';
const response = await fetch(BASE_URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
});

const html = await response.text();
const $ = cheerio.load(html);

const repos = [];
const limit = 3;

$('a[href^="/repositories/"]').each((i, el) => {
  if (repos.length >= limit) return;

  const $card = $(el).closest('.rounded-lg.border');
  if ($card.length === 0) return;
  if ($card.data('processed')) return;
  $card.data('processed', true);

  const repoHref = $(el).attr('href');
  const repoIdMatch = repoHref?.match(/\/repositories\/(\d+)/);
  if (!repoIdMatch) return;

  const repoId = repoIdMatch[1];
  const githubLink = $card.find('a[href^="https://github.com/"]').attr('href');
  if (!githubLink) return;

  const repoPath = githubLink.replace('https://github.com/', '');
  const [owner, repoName] = repoPath.split('/');
  if (!owner || !repoName) return;

  const fullName = `${owner}/${repoName}`;
  const description = $card.find('.text-xs.leading-5.text-gray-500').first().text().trim() || null;

  // 언어
  const languageSpan = $card.find('span').filter((_, span) => {
    return $(span).find('span[style*="background"]').length > 0;
  });
  const language = languageSpan.text().trim() || null;

  // 스타
  let stars = 0;
  $card.find('svg.lucide-star').each((_, svg) => {
    const starsText = $(svg).parent().text().trim();
    const starsMatch = starsText.match(/([\d.]+)k?/i);
    if (starsMatch) {
      stars = starsMatch[1].includes('.')
        ? parseFloat(starsMatch[1]) * 1000
        : parseInt(starsMatch[1], 10);
      if (starsText.toLowerCase().includes('k')) {
        stars = parseFloat(starsMatch[1]) * 1000;
      }
    }
  });

  // 포크
  let forks = 0;
  $card.find('svg.lucide-git-fork').each((_, svg) => {
    const forksText = $(svg).parent().text().trim();
    const forksMatch = forksText.match(/([\d.]+)k?/i);
    if (forksMatch) {
      forks = forksMatch[1].includes('.')
        ? parseFloat(forksMatch[1]) * 1000
        : parseInt(forksMatch[1], 10);
      if (forksText.toLowerCase().includes('k')) {
        forks = parseFloat(forksMatch[1]) * 1000;
      }
    }
  });

  const rankBadge = $card.find('.bg-amber-300, .bg-secondary').first();
  const rank = parseInt(rankBadge.text().trim(), 10) || i + 1;

  repos.push({
    platform: 'trendshift',
    platform_id: `ts-${repoId}`,
    title: fullName,
    description,
    url: githubLink,
    author_name: owner,
    author_url: `https://github.com/${owner}`,
    thumbnail_url: `https://opengraph.githubassets.com/1/${fullName}`,
    status: 'pending',
    raw_data: {
      language,
      stars: Math.round(stars),
      forks: Math.round(forks),
      rank,
      trendshiftUrl: `${BASE_URL}${repoHref}`,
      badge_url: `https://trendshift.io/api/badge/repositories/${repoId}`,
    },
  });
});

console.log(JSON.stringify(repos, null, 2));
