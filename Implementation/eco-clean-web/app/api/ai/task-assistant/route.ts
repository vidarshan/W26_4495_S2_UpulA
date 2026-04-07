export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { runTaskAssistantFeature } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const addressId =
      typeof body?.addressId === "string" ? body.addressId.trim() : "";
    const appointmentStart =
      typeof body?.appointmentStart === "string"
        ? body.appointmentStart.trim()
        : "";
    const appointmentEnd =
      typeof body?.appointmentEnd === "string" ? body.appointmentEnd.trim() : "";

    if (!addressId || !appointmentStart || !appointmentEnd) {
      return NextResponse.json(
        { error: "addressId, appointmentStart, and appointmentEnd are required" },
        { status: 400 },
      );
    }

    const result = await runTaskAssistantFeature({
      addressId,
      appointmentStart,
      appointmentEnd,
      mode: body?.mode ?? "plan",
      includePreviousVisit: body?.includePreviousVisit ?? true,
      staffNoteDraft: body?.staffNoteDraft ?? null,
      jobTitle: typeof body?.jobTitle === "string" ? body.jobTitle : null,
      clientName: typeof body?.clientName === "string" ? body.clientName : null,
      requiredStaffCount:
        typeof body?.requiredStaffCount === "number"
          ? body.requiredStaffCount
          : null,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Could not build task assistant context" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST task assistant preview failed:", error);
    return NextResponse.json(
      { error: "Failed to generate task assistant response" },
      { status: 500 },
    );
  }
}
