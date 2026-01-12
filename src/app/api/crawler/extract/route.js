import { NextResponse } from "next/server";
import { extractAndUpdateContent } from "@/lib/crawlers/content-extractor";

export async function POST(request) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const results = await extractAndUpdateContent(ids);

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: ids.length,
        succeeded: succeeded.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("Extract API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract content" },
      { status: 500 }
    );
  }
}
