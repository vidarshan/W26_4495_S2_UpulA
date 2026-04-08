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

export function toAppDateKey(input: IsoOrDate): string {
  return toDateTimeUtc(input).setZone(APP_TZ).toFormat("yyyy-LL-dd");
}

export function appDateKeyToDate(dateKey: string): Date {
  const dt = DateTime.fromFormat(dateKey, "yyyy-LL-dd", { zone: APP_TZ });
  return dt.startOf("day").toJSDate();
}

export function appNowDate(): Date {
  return DateTime.now().setZone(APP_TZ).startOf("day").toJSDate();
}

export function addAppDays(date: Date, days: number): Date {
  return DateTime.fromJSDate(date, { zone: APP_TZ })
    .startOf("day")
    .plus({ days })
    .toJSDate();
}

export function formatAppDate(input: IsoOrDate, format = "dd/LL/yyyy"): string {
  return toDateTimeUtc(input).setZone(APP_TZ).toFormat(format);
}

export function formatAppTime(input: IsoOrDate, format = "h:mm a"): string {
  return toDateTimeUtc(input).setZone(APP_TZ).toFormat(format);
}

export function parseAppDateTimeInput(value: string): Date | null {
  const dt = DateTime.fromISO(value, { setZone: true });
  if (dt.isValid) {
    return dt.toUTC().toJSDate();
  }

  const localDate = DateTime.fromFormat(value, "yyyy-LL-dd", { zone: APP_TZ });
  if (localDate.isValid) {
    return localDate.startOf("day").toUTC().toJSDate();
  }

  return null;
}

export function dateKeyAndHHmmToIso(dateKey: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const base = DateTime.fromFormat(dateKey, "yyyy-LL-dd", { zone: APP_TZ });
  const local = base.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  return local.toUTC().toISO()!;
}

export function dateOnlyAndHHmmToIso(dateOnly: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);

  // Treat dateOnly as a calendar date in APP_TZ (ignore its internal UTC instant)
  const d = DateTime.fromJSDate(dateOnly, { zone: APP_TZ }).startOf("day");
  const local = d.set({ hour: h, minute: m, second: 0, millisecond: 0 });

  // Store/send as UTC ISO
  return local.toUTC().toISO()!;
}

export function buildUtcWindowFromLocal(
  dateYmd: string,
  startTime: string | null,
  endTime: string | null,
  isAnytime: boolean,
) {
  // dateYmd: "YYYY-MM-DD"
  const base = DateTime.fromFormat(dateYmd, "yyyy-LL-dd", { zone: APP_TZ });
  if (!base.isValid) return null;

  const startStr = isAnytime ? "09:00" : startTime || "09:00";
  const [sh, sm] = startStr.split(":").map(Number);

  const startLocal = base.set({
    hour: sh,
    minute: sm,
    second: 0,
    millisecond: 0,
  });
  if (!startLocal.isValid) return null;

  let endLocal: DateTime;
  if (isAnytime) {
    endLocal = startLocal.plus({ hours: 1 });
  } else if (endTime) {
    const [eh, em] = endTime.split(":").map(Number);
    endLocal = base.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
    if (!endLocal.isValid) return null;
  } else {
    endLocal = startLocal.plus({ hours: 1 });
  }

  if (endLocal <= startLocal) endLocal = startLocal.plus({ minutes: 30 });

  return {
    startUtc: startLocal.toUTC().toJSDate(),
    endUtc: endLocal.toUTC().toJSDate(),
    durationMs: Math.max(
      endLocal.toUTC().toMillis() - startLocal.toUTC().toMillis(),
      30 * 60 * 1000,
    ),
    startLocal, // might help for debugging
  };
}
