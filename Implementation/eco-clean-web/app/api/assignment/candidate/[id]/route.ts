import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { getBestProximityScore } from "@/lib/utils/distance";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const appointmentStartRaw = searchParams.get("appointmentStart");
    const appointmentEndRaw = searchParams.get("appointmentEnd");

    if (!appointmentStartRaw || !appointmentEndRaw) {
      return NextResponse.json(
        { error: "appointmentStart and appointmentEnd are required" },
        { status: 400 },
      );
    }

    const appointmentStart = new Date(appointmentStartRaw);
    const appointmentEnd = new Date(appointmentEndRaw);

    if (
      Number.isNaN(appointmentStart.getTime()) ||
      Number.isNaN(appointmentEnd.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid appointmentStart or appointmentEnd" },
        { status: 400 },
      );
    }

    const where = {
      role: "STAFF" as const,
      staffProfile: { isNot: null },
    };
    const baseSelect = {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastKnownJobLocation: true,
      staffProfile: {
        include: {
          staffAddress: true,
          emergencyContact: true,
        },
      },
      leaves: {
        where: {
          startAt: { lte: appointmentEnd },
          endAt: { gte: appointmentStart },
        },
        select: {
          id: true,
          type: true,
          startAt: true,
          endAt: true,
        },
      },
      assignments: {
        where: {
          appointment: {
            startTime: {
              lte: appointmentEnd,
            },
            endTime: {
              gte: appointmentStart,
            },
          },
        },
        select: {
          id: true,
          status: true,
          plannedStart: true,
          plannedEnd: true,
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    } as const;
    const client = await prisma.address.findUnique({
      where: { id },
    });
    const staffMembers = await prisma.user.findMany({
      where,
      select: baseSelect,
      orderBy: { name: "asc" },
    });

    const recommendedMembers: Array<{
      staff: (typeof staffMembers)[number];
      reason: string;
    }> = [];
    if (client && staffMembers) {
      staffMembers.forEach((member) => {
        const comparison = getBestProximityScore(member, client);
        const hasLeaveConflict = member.leaves.length > 0;
        const hasScheduleConflict = member.assignments.length > 0;

        if (
          comparison.score > 20 &&
          !hasLeaveConflict &&
          !hasScheduleConflict
        ) {
          recommendedMembers.push({
            staff: member,
            reason: comparison.origin,
          });
        }
      });
    }
    return NextResponse.json({
      data: {
        jobLocation: client,
        recommendedMembers,
        staffMembers,
      },
      meta: { total: staffMembers.length },
    });
  } catch (error) {
    console.error("GET Assignments failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
