export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID required" },
        { status: 400 },
      );
    }

    const addresses = await prisma.address.findMany({
      where: { clientId },
      orderBy: { isPrimary: "desc" },
    });

    return NextResponse.json({ data: addresses });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// export async function GET(req: Request, context: { params: { id: string } }) {
//   try {
//     const clientId = context.params.id;

//     console.log("Client ID:", clientId);

//     if (!clientId) {
//       return NextResponse.json(
//         { error: "Client ID required" },
//         { status: 400 },
//       );
//     }

//     const addresses = await prisma.address.findMany({
//       where: {
//         clientId,
//       },
//       orderBy: {
//         isPrimary: "desc",
//       },
//     });

//     return NextResponse.json({ data: addresses });
//   } catch (error) {
//     console.error("GET client addresses failed:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
