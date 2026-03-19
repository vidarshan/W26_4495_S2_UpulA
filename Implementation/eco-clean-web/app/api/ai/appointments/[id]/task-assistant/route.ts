import { NextRequest, NextResponse } from "next/server";
import { TaskAssistantResponseSchema } from "@/lib/ai/schemas";
import { buildTaskAssistantPrompt } from "@/lib/ai/prompts";
import { getTaskAssistantContext } from "@/lib/ai/context";
import { generateStructuredJson } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? "plan";

    const existing = await prisma.appointmentAiInsight.findUnique({
      where: { appointmentId: id },
    });

    if (existing && !body?.forceRegenerate) {
      return NextResponse.json(existing.payload);
    }

    const context = await getTaskAssistantContext(id, {
      includePreviousVisit: body?.includePreviousVisit ?? true,
      staffNoteDraft: body?.staffNoteDraft ?? null,
    });

    if (!context) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const prompt = buildTaskAssistantPrompt(context, mode);

    const result = await generateStructuredJson({
      system: `You are an AI task assistant for a professional residential cleaning company. Return valid JSON only.`,
      user: prompt,
      schema: TaskAssistantResponseSchema,
    });

    await prisma.appointmentAiInsight.upsert({
      where: { appointmentId: id },
      update: {
        payload: result,
        type: "task_assistant",
        model: "gpt-5-mini",
        promptVersion: "task_assistant_v1",
      },
      create: {
        appointmentId: id,
        payload: result,
        type: "task_assistant",
        model: "gpt-5-mini",
        promptVersion: "task_assistant_v1",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate task assistant response" },
      { status: 500 },
    );
  }
}
