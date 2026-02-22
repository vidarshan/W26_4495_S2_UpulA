import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        staff: true,
        notes: true,
        images: true,
        job: { include: { client: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(appointment);
  } catch (err) {
    console.error("GET appointment by ID error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { startTime, endTime, status, staffIds, note, noteIsClientVisible } =
    body;

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return NextResponse.json(
      { error: "Provide both startTime and endTime together" },
      { status: 400 },
    );
  }

  // Build appointment update data
  const data: any = {};

  if (startTime && endTime) {
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime/endTime" },
        { status: 400 },
      );
    }
    data.startTime = s;
    data.endTime = e;
  }

  if (status) data.status = status;

  if (Array.isArray(staffIds)) {
    data.staff = { set: staffIds.map((sid: string) => ({ id: sid })) };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1) Update appointment core fields (only if needed)
      let appt = null as any;

      if (Object.keys(data).length > 0) {
        appt = await tx.appointment.update({
          where: { id },
          data,
        });
      } else {
        appt = await tx.appointment.findUnique({ where: { id } });
      }

      if (!appt) throw new Error("Appointment not found");

      // 2) Handle note updates (VisitNote)
      // - note: string | null | undefined
      //   undefined => don't touch notes
      //   null/""    => remove the latest internal note (optional behavior)
      //   string     => upsert latest internal note
      if (note !== undefined) {
        const trimmed = typeof note === "string" ? note.trim() : "";

        // Find latest note (you can filter isClientVisible if you want)
        const existing = await tx.visitNote.findFirst({
          where: { appointmentId: id },
          orderBy: { createdAt: "desc" },
        });

        if (!trimmed) {
          // User cleared note => delete existing latest note (or you can keep it)
          if (existing) {
            await tx.visitNote.delete({ where: { id: existing.id } });
          }
        } else {
          if (existing) {
            await tx.visitNote.update({
              where: { id: existing.id },
              data: {
                content: trimmed,
                ...(typeof noteIsClientVisible === "boolean"
                  ? { isClientVisible: noteIsClientVisible }
                  : {}),
              },
            });
          } else {
            await tx.visitNote.create({
              data: {
                appointmentId: id,
                content: trimmed,
                isClientVisible:
                  typeof noteIsClientVisible === "boolean"
                    ? noteIsClientVisible
                    : false,
              },
            });
          }
        }
      }

      // 3) Return fresh included data
      return tx.appointment.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          job: true,
          notes: true,
          images: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update appointment:", err);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}
