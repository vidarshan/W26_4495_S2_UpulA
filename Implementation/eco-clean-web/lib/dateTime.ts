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
export function isoToDateOnly(iso: string) {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(APP_TZ);
  // return a real "date-only" JS Date in local time
  return new Date(dt.year, dt.month - 1, dt.day);
}
// ISO/Date (UTC instant) -> "HH:mm" in APP_TZ
export function isoToHHmm(input: IsoOrDate): string {
  const dt = toDateTimeUtc(input).setZone(APP_TZ);
  if (!dt.isValid) throw new Error(`isoToHHmm invalid: ${String(input)}`);
  return dt.toFormat("HH:mm");
}

function ensureDate(d: Date | string): Date {
  if (d instanceof Date) return d;

  // If it's "YYYY-MM-DD", parse as local date (no timezone drift)
  const dt = DateTime.fromISO(d, { zone: APP_TZ });
  return new Date(dt.year, dt.month - 1, dt.day);
}

export function dateOnlyAndHHmmToIso(dateOnly: Date | string, hhmm: string) {
  const safeDate = ensureDate(dateOnly);
  const [hour, minute] = hhmm.split(":").map(Number);

  const dtLocal = DateTime.fromObject(
    {
      year: safeDate.getFullYear(),
      month: safeDate.getMonth() + 1,
      day: safeDate.getDate(),
      hour,
      minute,
      second: 0,
      millisecond: 0,
    },
    { zone: APP_TZ },
  );

  return dtLocal.toUTC().toISO()!;
}
