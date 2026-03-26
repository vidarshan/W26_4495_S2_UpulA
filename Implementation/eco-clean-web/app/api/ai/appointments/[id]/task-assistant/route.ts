import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAppointmentInsight,
  getTaskAssistantInsightType,
  runTaskAssistantFeature,
} from "@/lib/ai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? "plan";
    const includePreviousVisit = body?.includePreviousVisit ?? true;
    const staffNoteDraft = body?.staffNoteDraft ?? null;
    const insightType = getTaskAssistantInsightType({
      mode,
      includePreviousVisit,
      staffNoteDraft,
    });

    const existing = await getCachedAppointmentInsight(id, insightType);

    if (existing && !body?.forceRegenerate) {
      return NextResponse.json(existing.payload);
    }

    const result = await runTaskAssistantFeature(id, {
      mode,
      includePreviousVisit,
      staffNoteDraft,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate task assistant response" },
      { status: 500 },
    );
  }
}
