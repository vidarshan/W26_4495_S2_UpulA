import { DateTime } from "luxon";

// export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ ?? "America/Vancouver";
export const APP_TZ = "America/Vancouver";

type IsoOrDate = string | Date;

function toDateTimeUtc(input: IsoOrDate): DateTime {
  if (input instanceof Date) {
    // JS Date is an absolute instant already
    return DateTime.fromJSDate(input, { zone: "utc" });
  }
  // string
  return DateTime.fromISO(input, { zone: "utc" });
}

// ISO/Date (UTC instant) -> date-only (JS Date at local midnight, representing APP_TZ day)
export function isoToDateOnly(iso: string): Date {
  // Interpret the ISO instant in APP_TZ, then return a JS Date representing local midnight
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(APP_TZ);
  return dt.startOf("day").toJSDate();
}

// ISO/Date (UTC instant) -> "HH:mm" in APP_TZ
export function isoToHHmm(iso: string): string {
  // Interpret the ISO instant in APP_TZ and format time
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(APP_TZ);
  return dt.toFormat("HH:mm");
}

function ensureDate(d: Date | string): Date {
  if (d instanceof Date) return d;

  // If it's "YYYY-MM-DD", parse as local date (no timezone drift)
  const dt = DateTime.fromISO(d, { zone: APP_TZ });
  return new Date(dt.year, dt.month - 1, dt.day);
}

export function dateOnlyAndHHmmToIso(dateOnly: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);

  // Treat dateOnly as a calendar date in APP_TZ (ignore its internal UTC instant)
  const d = DateTime.fromJSDate(dateOnly, { zone: APP_TZ }).startOf("day");
  const local = d.set({ hour: h, minute: m, second: 0, millisecond: 0 });

  // Store/send as UTC ISO
  return local.toUTC().toISO()!;
}
