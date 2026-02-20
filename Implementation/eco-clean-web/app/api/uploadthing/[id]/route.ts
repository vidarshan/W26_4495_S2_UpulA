import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params; // ✅ unwrap once, then use

  console.log("✅ DELETE route hit:", req.nextUrl.pathname, "id:", id);

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const img = await prisma.appointmentImage.findUnique({
    where: { id },
    select: { id: true, fileKey: true, url: true }, // include url for fallback if you want
  });

  if (!img) {
    // Nothing to delete; client may have already removed it optimistically / double-click
    return NextResponse.json(
      { ok: true, alreadyDeleted: true },
      { status: 200 },
    );
  }

  try {
    // Delete file from UploadThing if we have a key
    if (img.fileKey) {
      await utapi.deleteFiles(img.fileKey);
    } else {
      console.warn("⚠️ fileKey missing; skipping UT delete. id:", id);
    }

    // Delete DB row
    await prisma.appointmentImage.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE appointment image failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
