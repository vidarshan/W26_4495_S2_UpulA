export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCachedAppointmentInsight,
  getTaskAssistantInsightType,
  runTaskAssistantFeature,
} from "@/lib/ai";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!AI_FEATURES_ENABLED) {
      return NextResponse.json(
        { error: "AI features are disabled" },
        { status: 503 },
      );
    }

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

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        assignments: {
          select: {
            id: true,
          },
        },
        job: {
          select: {
            title: true,
            addressId: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const result = await runTaskAssistantFeature({
      appointmentId: id,
      addressId: appointment.job.addressId,
      appointmentStart: appointment.startTime.toISOString(),
      appointmentEnd: appointment.endTime.toISOString(),
      mode,
      includePreviousVisit,
      staffNoteDraft,
      jobTitle: appointment.job.title,
      clientName:
        appointment.job.client.companyName ||
        `${appointment.job.client.firstName ?? ""} ${appointment.job.client.lastName ?? ""}`.trim(),
      requiredStaffCount: appointment.assignments.length || 1,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate task assistant response" },
      { status: 500 },
    );
  }
}
