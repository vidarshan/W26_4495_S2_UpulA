import { CalendarSelection, ParsedSelection } from "@/types";

export function parseCalendarSelection(
  selection: CalendarSelection,
): ParsedSelection | null {
  const { start, end, startStr, endStr, allDay } = selection;

  if (!start || !end) return null;

  return {
    startDate: start,
    endDate: end,

    startISO: start.toISOString(),
    endISO: end.toISOString(),

    startWithOffset: startStr,
    endWithOffset: endStr,

    startTimestamp: start.getTime(),
    endTimestamp: end.getTime(),

    startDateOnly: start.toISOString().split("T")[0],
    endDateOnly: end.toISOString().split("T")[0],

    startTime: start.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),

    durationInMinutes: (end.getTime() - start.getTime()) / (1000 * 60),

    allDay,
  };
}
