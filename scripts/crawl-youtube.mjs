/**
 * YouTube Standalone Crawler
 *
 * Usage:
 *   node scripts/crawl-youtube.mjs
 *   node scripts/crawl-youtube.mjs --limit=30
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { crawlYouTube } from "../src/lib/crawlers/youtube.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key === "limit") options.limit = parseInt(value, 10);
    }
  });

  return options;
}

async function main() {
  const options = parseArgs();

  console.log(
    `[YouTube Crawler] Starting${options.limit ? ` with limit=${options.limit}` : ""}`,
  );
  console.log(`[YouTube Crawler] Timestamp: ${new Date().toISOString()}`);

  try {
    const result = await crawlYouTube(options);

    if (result.success) {
      console.log(
        `\n[YouTube Crawler] ✅ Success: ${result.count} items crawled`,
      );
    } else {
      console.error(`[YouTube Crawler] ❌ Failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[YouTube Crawler] ❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
