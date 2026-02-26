export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";

type Role = "ADMIN" | "STAFF";
export async function GET(req: Request) {
  const session = await getAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const sort = searchParams.get("sort") || "newest";
    const paginate = searchParams.get("paginate") !== "false";

    const skip = (page - 1) * limit;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const orderBy = {
      createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const),
    };

    const baseSelect = {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    } as const;

    if (!paginate) {
      const users = await prisma.user.findMany({
        where,
        orderBy,
        select: baseSelect,
      });

      return NextResponse.json({
        data: users,
        meta: { total: users.length },
      });
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: baseSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /users failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generatePassword(length = 14) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString("base64url")
    .slice(0, length);
}

export async function POST(req: Request) {
  // const session = await getAuthSession();

  // Uncomment when ready:
  // if (!session || session.user.role !== "ADMIN") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    role?: Role;
  };

  const { name, email, role } = body;

  if (!name || !email || !role) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const tempPassword = generatePassword(14);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { name, email, role, password: hashedPassword },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // return tempPassword only once (admin can copy)
  return NextResponse.json({ user, tempPassword }, { status: 201 });
}

