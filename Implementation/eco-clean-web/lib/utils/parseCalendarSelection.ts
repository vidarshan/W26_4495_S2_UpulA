import { CalendarSelection } from "@/types";

export function parseCalendarSelection(selection: CalendarSelection) {
  const { start, end, startStr, endStr, allDay } = selection;

  return {
    // Raw Date objects
    startDate: start,
    endDate: end,

    // ISO strings (UTC)
    startISO: start.toISOString(),
    endISO: end.toISOString(),

    // Original timezone-preserved strings
    startWithOffset: startStr,
    endWithOffset: endStr,

    // Timestamps (useful for comparisons)
    startTimestamp: start.getTime(),
    endTimestamp: end.getTime(),

    // Date parts
    startDateOnly: start.toISOString().split("T")[0],
    endDateOnly: end.toISOString().split("T")[0],

    // Time parts (local)
    startTime: start.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),

    durationInMinutes: (end.getTime() - start.getTime()) / (1000 * 60),

    allDay,
  };
}
