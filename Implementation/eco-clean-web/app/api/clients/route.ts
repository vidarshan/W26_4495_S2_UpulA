import { Address } from "@/app/components/tables/ClientTable";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const sort = searchParams.get("sort") || "newest";

    const skip = (page - 1) * limit;

    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const orderBy = {
      createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phone: true,
          preferredContact: true,
          leadSource: true,
          createdAt: true,
        },
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /clients failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      firstName,
      lastName,
      companyName,
      email,
      phone,
      preferredContact,
      leadSource,
      addresses,
      note,
    } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!addresses || addresses.length === 0) {
      return NextResponse.json(
        { error: "At least one address is required" },
        { status: 400 },
      );
    }

    const client = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const createdClient = await tx.client.create({
          data: {
            title,
            firstName,
            lastName,
            companyName,
            email,
            phone,
            preferredContact,
            leadSource,
          },
        });

        await tx.address.createMany({
          data: addresses.map((addr: Address, index: number) => ({
            clientId: createdClient.id,
            street1: addr.street1,
            street2: addr.street2,
            city: addr.city,
            province: addr.province,
            postalCode: addr.postalCode,
            country: addr.country,
            isBilling: !!addr.isBilling,
            isPrimary: index === 0,
          })),
        });

        if (note) {
          await tx.clientNote.create({
            data: {
              clientId: createdClient.id,
              content: note,
            },
          });
        }

        return createdClient;
      },
    );

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
