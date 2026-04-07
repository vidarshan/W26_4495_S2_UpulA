import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import type { CalendarSelection } from "../types";

const require = createRequire(import.meta.url);
const {
  parseCalendarSelection,
} = require("../lib/utils/parseCalendarSelection.ts");

test("parseCalendarSelection returns null when start or end is missing", () => {
  const missingStart: CalendarSelection = {
    start: null,
    end: new Date("2026-03-31T17:30:00.000Z"),
    startStr: "",
    endStr: "2026-03-31T10:30:00-07:00",
    allDay: false,
  };

  const missingEnd: CalendarSelection = {
    start: new Date("2026-03-31T16:00:00.000Z"),
    end: null,
    startStr: "2026-03-31T09:00:00-07:00",
    endStr: "",
    allDay: false,
  };

  assert.equal(parseCalendarSelection(missingStart), null);
  assert.equal(parseCalendarSelection(missingEnd), null);
});

test("parseCalendarSelection expands a timed selection into derived fields", () => {
  const start = new Date("2026-03-31T16:00:00.000Z");
  const end = new Date("2026-03-31T17:45:00.000Z");

  const selection: CalendarSelection = {
    start,
    end,
    startStr: "2026-03-31T09:00:00-07:00",
    endStr: "2026-03-31T10:45:00-07:00",
    allDay: false,
  };

  const parsed = parseCalendarSelection(selection);

  assert.ok(parsed);
  assert.equal(parsed.startDate, start);
  assert.equal(parsed.endDate, end);
  assert.equal(parsed.startISO, "2026-03-31T16:00:00.000Z");
  assert.equal(parsed.endISO, "2026-03-31T17:45:00.000Z");
  assert.equal(parsed.startWithOffset, selection.startStr);
  assert.equal(parsed.endWithOffset, selection.endStr);
  assert.equal(parsed.startTimestamp, start.getTime());
  assert.equal(parsed.endTimestamp, end.getTime());
  assert.equal(parsed.startDateOnly, "2026-03-31");
  assert.equal(parsed.endDateOnly, "2026-03-31");
  assert.equal(parsed.startTime, "09:00");
  assert.equal(parsed.endTime, "10:45");
  assert.equal(parsed.durationInMinutes, 105);
  assert.equal(parsed.allDay, false);
});
