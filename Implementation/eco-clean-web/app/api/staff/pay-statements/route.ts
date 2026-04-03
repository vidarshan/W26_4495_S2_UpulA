import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statements = await prisma.payStatement.findMany({
      where: {
        userId: token.id,
      },
      orderBy: {
        payPeriodStart: "desc",
      },
      select: {
        id: true,
        payPeriodStart: true,
        payPeriodEnd: true,
        payDate: true,
        grossEarnings: true,
        netEarnings: true,
      },
    });

    return NextResponse.json(statements);
  } catch (error) {
    console.error("GET PAY HISTORY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load pay history" },
      { status: 500 }
    );
  }
}