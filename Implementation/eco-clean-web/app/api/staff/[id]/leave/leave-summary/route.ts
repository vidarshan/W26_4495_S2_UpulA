import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const POLICY = {
  VACATION: 80, // hours per year
  SICK: 40,
};

function calculateLeaveHours(start: Date, end: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;

  const days =
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / msPerDay
    ) || 1;

  return days * 8;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;

    const leaves = await prisma.leave.findMany({
      where: { staffId },
    });

    const vacationUsed = leaves
      .filter((l) => l.type === "VACATION")
      .reduce((acc, l) => {
        return acc + calculateLeaveHours(l.startAt, l.endAt);
      }, 0);

    const sickUsed = leaves
      .filter((l) => l.type.includes("SICK"))
      .reduce((acc, l) => {
        return acc + calculateLeaveHours(l.startAt, l.endAt);
      }, 0);

    // Guardrails
    const vacationRemaining = Math.max(
      POLICY.VACATION - vacationUsed,
      0
    );

    const sickRemaining = Math.max(
      POLICY.SICK - sickUsed,
      0
    );

    return NextResponse.json({
      vacationUsed,
      vacationRemaining,
      sickUsed,
      sickRemaining,
    });
  } catch (error) {
    console.error("Leave summary error:", error);
    return NextResponse.json(
      { error: "Failed to calculate leave summary" },
      { status: 500 }
    );
  }
}
