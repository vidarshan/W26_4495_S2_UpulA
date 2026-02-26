export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type AddressInput = {
  id?: string;
  street1: string;
  street2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await context.params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID required" },
        { status: 400 },
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        addresses: { orderBy: { isPrimary: "desc" } },
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await context.params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID required" },
        { status: 400 },
      );
    }

    const body = await req.json();

    const {
      title,
      firstName,
      lastName,
      companyName,
      phone,
      email,
      preferredContact,
      leadSource,
      note,
      addresses = [],
    }: {
      title?: string | null;
      firstName?: string;
      lastName?: string;
      companyName?: string | null;
      phone?: string;
      email?: string;
      preferredContact?: string;
      leadSource?: string | null;
      note?: string;
      addresses?: AddressInput[];
    } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });

      if (!existing) return null;

      // 1) update client core fields
      await tx.client.update({
        where: { id: clientId },
        data: {
          title: title ?? null,
          firstName,
          lastName,
          companyName: companyName ?? null,
          phone,
          email,
          preferredContact,
          leadSource: leadSource ?? null,
        },
      });

      // 2) addresses: delete removed + upsert incoming
      const incomingIds = addresses
        .map((a) => a.id)
        .filter(Boolean) as string[];

      await tx.address.deleteMany({
        where: {
          clientId,
          ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}),
        },
      });

      for (const a of addresses) {
        const data = {
          street1: a.street1,
          street2: a.street2?.trim() ? a.street2 : null,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          country: a.country,
        };

        if (a.id) {
          await tx.address.update({
            where: { id: a.id },
            data,
          });
        } else {
          await tx.address.create({
            data: {
              clientId,
              ...data,
              // your schema has these defaults, so you can omit:
              // isPrimary: false,
              // isBilling: false,
            },
          });
        }
      }

      // 3) note: create a ClientNote if provided (simple + reliable)
      const trimmed = (note ?? "").trim();
      if (trimmed.length) {
        await tx.clientNote.create({
          data: {
            clientId,
            content: trimmed,
          },
        });
      }

      // return fresh client
      return tx.client.findUnique({
        where: { id: clientId },
        include: {
          addresses: { orderBy: { isPrimary: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    if (!result) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("PATCH /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
