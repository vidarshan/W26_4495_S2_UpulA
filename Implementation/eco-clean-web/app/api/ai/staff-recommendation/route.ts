export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { generateStructuredJson } from "@/lib/ai";
import { buildStaffRecommendationPrompt } from "@/lib/ai/prompts";
import { StaffRecommendationResponseSchema } from "@/lib/ai/schemas";
import { CandidateResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const appointmentStart =
      typeof body?.appointmentStart === "string"
        ? body.appointmentStart.trim()
        : "";
    const appointmentEnd =
      typeof body?.appointmentEnd === "string" ? body.appointmentEnd.trim() : "";
    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle : null;
    const candidateData = body?.candidateData as CandidateResponse["data"] | undefined;

    if (!appointmentStart || !appointmentEnd || !candidateData) {
      return NextResponse.json(
        {
          error:
            "appointmentStart, appointmentEnd, and candidateData are required",
        },
        { status: 400 },
      );
    }

    const result = await generateStructuredJson({
      system:
        "You are an AI scheduling assistant for a residential cleaning company. Return valid JSON only.",
      user: buildStaffRecommendationPrompt({
        appointmentStart,
        appointmentEnd,
        jobTitle,
        candidateData,
      }),
      schemaName: "staff_recommendation_response",
      schema: StaffRecommendationResponseSchema,
      model: "gpt-5-mini",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST staff recommendation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate staff recommendation" },
      { status: 500 },
    );
  }
}
