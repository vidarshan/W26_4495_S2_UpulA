import { prisma } from "@/lib/prisma";
import { LineItem } from "@/types";
import { AppointmentStatus, JobType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      clientId,
      addressId,
      jobType,
      isAnytime = false,
      visitInstructions,
      lineItems = [],
      appointments = [],
      recurrence,
    } = body;

    if (!title || !clientId || !addressId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Create Job
      const job = await tx.job.create({
        data: {
          title,
          type: jobType as JobType,
          clientId,
          addressId,
          isAnytime,
          visitInstructions,
          lineItems: {
            create: lineItems.map((li: LineItem) => ({
              name: li.name,
              quantity: li.quantity,
              unitCost: li.unitCost,
              unitPrice: li.unitPrice,
              description: li.description,
            })),
          },
        },
      });

      const createdAppointments: any[] = [];

      // Helper: create single appointment safely
      const createAppointment = async (appt: any) => {
        if (!appt.startDate) return null;

        const start = new Date(appt.startDate);
        const end = new Date(appt.startDate);

        if (!isAnytime) {
          const [sh, sm] = appt.startTime.split(":").map(Number);
          const [eh, em] = appt.endTime.split(":").map(Number);
          start.setHours(sh, sm, 0, 0);
          end.setHours(eh, em, 0, 0);
        }

        const data: Prisma.AppointmentCreateInput = {
          jobId: job.id,
          startTime: start,
          endTime: end,
          status: AppointmentStatus.SCHEDULED,
        };

        if (appt.staffId && appt.staffId.length > 0) {
          data.staff = { connect: appt.staffId.map((id: string) => ({ id })) };
        }

        if (appt.notes && appt.notes.trim() !== "") {
          data.notes = { create: [{ content: appt.notes }] };
        }

        if (appt.images && appt.images.length > 0) {
          // Convert File objects to URL strings or your storage URLs
          data.images = {
            create: appt.images.map((img: any) => ({ url: img.url || img })),
          };
        }

        return tx.appointment.create({ data });
      };

      // 2️⃣ ONE_OFF appointments
      if (jobType === JobType.ONE_OFF) {
        for (const appt of appointments) {
          const newAppt = await createAppointment(appt);
          if (newAppt) createdAppointments.push(newAppt);
        }
      }

      // 3️⃣ RECURRING appointments
      if (jobType === JobType.RECURRING && recurrence) {
        const { frequency, interval, endType, endsAfter, endsOn } = recurrence;

        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency,
            interval,
            endType,
            endsAfter: endType === "after" ? endsAfter : null,
            endsOn: endType === "on" && endsOn ? new Date(endsOn) : null,
          },
        });

        for (const appt of appointments) {
          if (!appt.startDate) continue;

          const start = new Date(appt.startDate);
          const end = new Date(appt.startDate);
          if (!isAnytime) {
            const [sh, sm] = appt.startTime.split(":").map(Number);
            const [eh, em] = appt.endTime.split(":").map(Number);
            start.setHours(sh, sm, 0, 0);
            end.setHours(eh, em, 0, 0);
          }

          const duration = end.getTime() - start.getTime();
          const current = new Date(start);
          let count = 0;

          while (true) {
            if (endType === "after" && endsAfter && count >= endsAfter) break;
            if (endType === "on" && endsOn && current > new Date(endsOn)) break;

            const newAppt = await createAppointment({
              ...appt,
              startDate: new Date(current),
              endTime: new Date(current.getTime() + duration),
            });

            if (newAppt) createdAppointments.push(newAppt);

            if (frequency === "weekly")
              current.setDate(current.getDate() + 7 * interval);
            if (frequency === "monthly")
              current.setMonth(current.getMonth() + interval);

            count++;
          }
        }
      }

      return { job, appointments: createdAppointments };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create Job Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type"); // ONE_OFF | RECURRING

    const jobs = await prisma.job.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(type && { type: type as JobType }),
      },
      include: {
        client: true,
        address: true,
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        recurrence: true,
        appointments: {
          orderBy: {
            startTime: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("GET Jobs Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}
