import { CalendarSelection, ParsedSelection } from "@/types";
import { APP_TZ } from "@/lib/dateTime";
import { DateTime } from "luxon";

export function parseCalendarSelection(
  selection: CalendarSelection,
): ParsedSelection | null {
  const { start, end, startStr, endStr, allDay } = selection;

  if (!start || !end) return null;

  const startLocal = DateTime.fromJSDate(start, { zone: APP_TZ });
  const endLocal = DateTime.fromJSDate(end, { zone: APP_TZ });

  return {
    startDate: start,
    endDate: end,

    startISO: start.toISOString(),
    endISO: end.toISOString(),

    startWithOffset: startStr,
    endWithOffset: endStr,

    startTimestamp: start.getTime(),
    endTimestamp: end.getTime(),

    startDateOnly: startLocal.toFormat("yyyy-LL-dd"),
    endDateOnly: endLocal.toFormat("yyyy-LL-dd"),

    startTime: startLocal.toFormat("HH:mm"),
    endTime: endLocal.toFormat("HH:mm"),

    durationInMinutes: (end.getTime() - start.getTime()) / (1000 * 60),

    allDay,
  };
}
