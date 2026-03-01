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

export async function POST(req: Request) {
  const session = await getAuthSession();

  // 1. Match security: Only Admins should create staff profiles
//   if (!session || session.user.role !== "ADMIN") {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

  try {
    const body = await req.json();
    const { name, email, postalCode, hourlyRate } = body;

    // 2. Validation
    if (!name || !email || !postalCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Security: Generate and hash password exactly like users/route.ts
    const tempPassword = generatePassword(14);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4. Atomic Transaction: User + Profile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: "STAFF", // Hardcoded for this route
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          postalCode,
          hourlyRate: Number(hourlyRate) || 0,
        },
      });

      return { user, profile };
    });

    // 5. Return tempPassword only once for the Admin to copy
    return NextResponse.json({ ...result, tempPassword }, { status: 201 });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    console.error("Staff Creation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
