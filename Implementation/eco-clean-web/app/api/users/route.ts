export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";

/**
 * GET: Fetch all users (Admin only)
 */
export async function GET() {
  const session = await getAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        staffProfile: {
          select: {
            id: true,
            staffId: true,
            position: true,
            hourlyRate: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET users failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create user + temp password + staff profile
 */
export async function POST(req: Request) {
  const session = await getAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    let { name, email, role, position, hourlyRate } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    email = email.trim().toLowerCase();
    name = name?.trim() || "";

    // Check duplicate
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Generate temp password
    const tempPassword = crypto.randomBytes(4).toString("hex");

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role ?? "STAFF",
        },
      });

      let staffProfile = null;

      if ((role ?? "STAFF") === "STAFF") {
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();

        staffProfile = await tx.staffProfile.create({
          data: {
            userId: user.id,
            staffId: `STF-ECO-${randomSuffix}`,
            position: position ?? null,
            hourlyRate:
              hourlyRate !== undefined ? Number(hourlyRate) : 0,
          },
        });
      }

      return { user, staffProfile };
    });

    // Consistent response
    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        createdAt: result.user.createdAt,
      },
      staffProfile: result.staffProfile,
      temporaryPassword: tempPassword,
    });

  } catch (error: any) {
    console.error("POST user failed:", error);

    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
