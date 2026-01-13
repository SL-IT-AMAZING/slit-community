import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * GET /api/metrics/[contentId]
 *
 * 콘텐츠의 메트릭 히스토리 조회
 *
 * Query params:
 * - days: 조회할 일수 (기본: 7)
 * - limit: 최대 레코드 수 (기본: 100)
 */
export async function GET(request, { params }) {
  try {
    const { contentId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId is required" },
        { status: 400 }
      );
    }

    // 날짜 범위 계산
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 메트릭 히스토리 조회
    const supabase = getSupabaseClient();
    const { data: history, error } = await supabase
      .from("metrics_history")
      .select("id, recorded_at, metrics")
      .eq("content_id", contentId)
      .gte("recorded_at", startDate.toISOString())
      .order("recorded_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    // 데이터 변환 (그래프용 포맷)
    const formattedHistory = history.map((record) => ({
      recorded_at: record.recorded_at,
      ...record.metrics,
    }));

    // 통계 계산
    const stats = calculateStats(formattedHistory);

    return NextResponse.json({
      success: true,
      contentId,
      history: formattedHistory,
      stats,
      meta: {
        days,
        count: history.length,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Metrics history API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch metrics history" },
      { status: 500 }
    );
  }
}

/**
 * 통계 계산
 */
function calculateStats(history) {
  if (!history || history.length === 0) {
    return {};
  }

  const stats = {};
  const keys = Object.keys(history[0]).filter((k) => k !== "recorded_at");

  for (const key of keys) {
    const values = history
      .map((h) => h[key])
      .filter((v) => typeof v === "number");

    if (values.length === 0) continue;

    const first = values[0];
    const last = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const change = last - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;

    stats[key] = {
      first,
      last,
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  return stats;
}

/**
 * POST /api/metrics/[contentId]
 *
 * 수동으로 메트릭 기록 추가
 */
export async function POST(request, { params }) {
  try {
    const { contentId } = params;
    const { metrics } = await request.json();

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId is required" },
        { status: 400 }
      );
    }

    if (!metrics || typeof metrics !== "object") {
      return NextResponse.json(
        { error: "metrics object is required" },
        { status: 400 }
      );
    }

    // 메트릭 기록 추가
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("metrics_history")
      .insert({
        content_id: contentId,
        recorded_at: new Date().toISOString(),
        metrics,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      record: data,
    });
  } catch (error) {
    console.error("Metrics insert API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to insert metrics" },
      { status: 500 }
    );
  }
}
