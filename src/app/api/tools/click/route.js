import { NextResponse } from "next/server";
import { recordToolClick } from "@/services/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { toolId, userId } = body;

    if (!toolId) {
      return NextResponse.json(
        { error: "toolId is required" },
        { status: 400 },
      );
    }

    await recordToolClick(toolId, userId || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording tool click:", error);
    return NextResponse.json(
      { error: "Failed to record click" },
      { status: 500 },
    );
  }
}
