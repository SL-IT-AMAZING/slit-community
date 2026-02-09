/**
 * GitHub Standalone Crawler
 *
 * Usage:
 *   node scripts/crawl-github.mjs
 *   node scripts/crawl-github.mjs --since=daily --limit=25
 *   node scripts/crawl-github.mjs --all --includeLanguages
 *
 * Options:
 *   --since=daily|weekly|monthly  Period filter (default: daily)
 *   --limit=N                     Max items per period (default: 25)
 *   --all                         Crawl all periods (daily + weekly + monthly)
 *   --includeLanguages            Include language-specific trending (14 languages)
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  crawlGithubTrending,
  crawlGithubTrendingAll,
} from "../src/lib/crawlers/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    since: "daily",
    limit: 25,
    all: false,
    includeLanguages: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key === "since") options.since = value;
      if (key === "limit") options.limit = parseInt(value, 10);
      if (key === "all") options.all = true;
      if (key === "includeLanguages") options.includeLanguages = true;
    }
  });

  return options;
}

async function main() {
  const options = parseArgs();

  console.log(`[GitHub Crawler] Starting`);
  console.log(`[GitHub Crawler] Options: ${JSON.stringify(options)}`);
  console.log(`[GitHub Crawler] Timestamp: ${new Date().toISOString()}`);

  try {
    let result;

    if (options.all) {
      // Crawl all periods (daily + weekly + monthly)
      result = await crawlGithubTrendingAll({
        limit: options.limit,
        includeLanguages: options.includeLanguages,
      });
    } else {
      // Crawl single period
      result = await crawlGithubTrending({
        since: options.since,
        limit: options.limit,
      });
    }

    if (result.success) {
      console.log(
        `\n[GitHub Crawler] ✅ Success: ${result.count} items crawled`,
      );
      if (result.details) {
        console.log("\n=== Details ===");
        result.details.forEach((d) => {
          const label = d.language ? `${d.language}/${d.since}` : d.since;
          console.log(`  ${label}: ${d.count} repos`);
        });
      }
    } else {
      console.error(`[GitHub Crawler] ❌ Failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[GitHub Crawler] ❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
