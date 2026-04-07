import { NextRequest, NextResponse } from "next/server";
import { runPayComparisonFeature } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await runPayComparisonFeature(
      body.periodA,
      body.periodB
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to compare pay" },
      { status: 500 }
    );
  }
}