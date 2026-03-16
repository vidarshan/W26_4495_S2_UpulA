export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Helper to match the existing password generation logic
function generatePassword(length = 14) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString("base64url")
    .slice(0, length);
}



export async function GET(req: Request) {
  const session = await getAuthSession();

  // Security: Mirroring the User and Client protection logic
  // if (!session || session.user.role !== "ADMIN") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const paginate = searchParams.get("paginate") !== "false";

    const skip = (page - 1) * limit;

    // Filter by name or email, but only for users who have a Staff Profile
    const where = {
      role: "STAFF" as const,
      staffProfile: { isNot: null },
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    // Include the StaffProfile so we get the Postal Code and Hourly Rate
    const baseInclude = {
      staffProfile: true,
    } as const;

    if (!paginate) {
      const staffMembers = await prisma.user.findMany({
        where,
        include: baseInclude,
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        data: staffMembers,
        meta: { total: staffMembers.length },
      });
    }

    const [staffMembers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: baseInclude,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: staffMembers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/staff failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
