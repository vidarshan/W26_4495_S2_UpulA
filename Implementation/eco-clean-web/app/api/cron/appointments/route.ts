import { runReminders } from "@/lib/appointments";

export async function GET() {
  await runReminders();
  return Response.json({ ok: true });
}
