import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { User, UserForm } from "@/types";

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

    const where: Prisma.UserWhereInput = {
      ...(q && {
        OR: [
          {
            name: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput =
      sort === "oldest"
        ? { createdAt: Prisma.SortOrder.asc }
        : { createdAt: Prisma.SortOrder.desc };

    if (!paginate) {
      const users = await prisma.user.findMany({
        where,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        data: users,
        meta: {
          total: users.length,
        },
      });
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
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
    console.error("GET /staff failed:", error);
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
  const session = await getAuthSession();

  // if (!session || session.user.role !== "ADMIN") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  const { name, email, role } = await req.json();

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
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // return tempPassword only once (admin can copy)
  return NextResponse.json({ user, tempPassword }, { status: 201 });
}