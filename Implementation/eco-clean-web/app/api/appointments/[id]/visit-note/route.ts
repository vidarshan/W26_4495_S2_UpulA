export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type SaveVisitNoteBody = {
  content?: string;
  images?: Array<{
    url?: string;
    fileKey?: string | null;
  }>;
};

function normalizeVisitNoteBody(body: SaveVisitNoteBody) {
  const content = typeof body.content === "string" ? body.content.trim() : "";

  const images = Array.isArray(body.images)
    ? body.images
        .filter(
          (img) => typeof img?.url === "string" && img.url.trim().length > 0,
        )
        .map((img) => ({
          url: String(img!.url).trim(),
          fileKey:
            typeof img?.fileKey === "string" && img.fileKey.trim().length > 0
              ? img.fileKey.trim()
              : null,
        }))
    : [];

  return { content, images };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: appointmentId } = await params;

  if (!appointmentId) {
    return NextResponse.json(
      { error: "Missing appointment id" },
      { status: 400 },
    );
  }

  let rawBody: SaveVisitNoteBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, images } = normalizeVisitNoteBody(rawBody);

  if (!content && images.length === 0) {
    return NextResponse.json(
      { error: "Provide note content or at least one image" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx: Tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      const existing = await tx.visitNote.findFirst({
        where: {
          appointmentId,
          isClientVisible: false,
        },
        orderBy: { createdAt: "desc" },
      });

      if (content) {
        if (existing) {
          await tx.visitNote.update({
            where: { id: existing.id },
            data: {
              content,
              isClientVisible: false,
              // createdById: sessionUserId ?? null
            },
          });
        } else {
          await tx.visitNote.create({
            data: {
              appointmentId,
              content,
              isClientVisible: false,
              // createdById: sessionUserId ?? null
            },
          });
        }
      }

      if (images.length > 0) {
        await tx.appointmentImage.createMany({
          data: images.map((img) => ({
            appointmentId,
            url: img.url,
            fileKey: img.fileKey,
          })),
        });
      }

      const fullAppointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          assignments: {
            include: {
              staff: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
          images: true,
          workSessions: {
            orderBy: { startedAt: "asc" },
          },
          job: {
            include: {
              client: true,
              address: true,
              lineItems: true,
              recurrence: true,
              notes: {
                include: {
                  images: true,
                  createdBy: {
                    select: { id: true, name: true, email: true, role: true },
                  },
                },
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      });

      return fullAppointment;
    });

    return NextResponse.json({
      ...result,
      staff: result?.assignments.map((a) => a.staff) ?? [],
    });
  } catch (err: any) {
    console.error("POST /api/appointments/[id]/visit-note error:", err);

    const message =
      err instanceof Error ? err.message : "Failed to save visit note";

    return NextResponse.json(
      { error: message },
      { status: message === "Appointment not found" ? 404 : 500 },
    );
  }
}
