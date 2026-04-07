import { NextRequest, NextResponse } from "next/server";
import { runPayComparisonFeature } from "@/lib/ai"; // ✅ uses your lib folder

export async function POST(req: NextRequest) {
  try {
    const { periodA, periodB } = await req.json();

    if (!periodA || !periodB) {
      return NextResponse.json(
        { error: "Missing periods" },
        { status: 400 }
      );
    }

    const result = await runPayComparisonFeature(periodA, periodB);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI ERROR:", error);

    return NextResponse.json(
      { error: "AI comparison failed" },
      { status: 500 }
    );
  }
}