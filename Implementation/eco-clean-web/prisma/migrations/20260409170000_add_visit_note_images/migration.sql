CREATE TABLE "VisitNoteImage" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "fileKey" TEXT,
  CONSTRAINT "VisitNoteImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisitNoteImage_noteId_idx" ON "VisitNoteImage"("noteId");

ALTER TABLE "VisitNoteImage"
ADD CONSTRAINT "VisitNoteImage_noteId_fkey"
FOREIGN KEY ("noteId") REFERENCES "VisitNote"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
