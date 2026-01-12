import { NextResponse } from "next/server";
import { crawlGithubTrending, crawlGithubTrendingAll } from "@/lib/crawlers/github";
import { crawlTrendshift, crawlTrendshiftAll } from "@/lib/crawlers/trendshift";
import { crawlYouTube } from "@/lib/crawlers/youtube";
import { crawlReddit } from "@/lib/crawlers/reddit";
import { crawlX } from "@/lib/crawlers/x";
import { crawlThreads } from "@/lib/crawlers/threads";

export async function POST(request) {
  try {
    const { platform, options = {} } = await request.json();

    let result;

    switch (platform) {
      case "github":
        result = await crawlGithubTrending(options);
        break;
      case "github-all":
        result = await crawlGithubTrendingAll(options);
        break;
      case "trendshift":
        result = await crawlTrendshift(options);
        break;
      case "trendshift-all":
        result = await crawlTrendshiftAll(options);
        break;
      case "youtube":
        result = await crawlYouTube(options);
        break;
      case "reddit":
        result = await crawlReddit(options);
        break;
      case "x":
        result = await crawlX(options);
        break;
      case "threads":
        result = await crawlThreads(options);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown platform: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Crawler run error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
