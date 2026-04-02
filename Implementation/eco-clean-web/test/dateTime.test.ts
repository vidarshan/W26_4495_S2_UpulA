import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  APP_TZ,
  buildUtcWindowFromLocal,
  dateOnlyAndHHmmToIso,
  isoToDateOnly,
  isoToHHmm,
} = require("../lib/dateTime.ts");

test("APP_TZ stays pinned to the app timezone", () => {
  assert.equal(APP_TZ, "America/Vancouver");
});

test("isoToHHmm converts UTC instants into app-local time", () => {
  assert.equal(isoToHHmm("2026-04-01T16:30:00.000Z"), "09:30");
  assert.equal(isoToHHmm("2026-12-15T17:30:00.000Z"), "09:30");
});

test("isoToDateOnly returns a Date positioned at local midnight for the app day", () => {
  const dateOnly = isoToDateOnly("2026-04-01T16:30:00.000Z");

  assert.ok(dateOnly instanceof Date);
  assert.equal(isoToHHmm(dateOnly.toISOString()), "00:00");
  assert.equal(dateOnly.toISOString(), "2026-04-01T07:00:00.000Z");
});

test("dateOnlyAndHHmmToIso turns a local day and time into a UTC ISO timestamp", () => {
  const localDay = new Date(2026, 3, 1);

  assert.equal(
    dateOnlyAndHHmmToIso(localDay, "09:30"),
    "2026-04-01T16:30:00.000Z",
  );
});

test("buildUtcWindowFromLocal uses defaults for anytime appointments", () => {
  const window = buildUtcWindowFromLocal("2026-04-01", null, null, true);

  assert.ok(window);
  assert.equal(window?.startUtc.toISOString(), "2026-04-01T16:00:00.000Z");
  assert.equal(window?.endUtc.toISOString(), "2026-04-01T17:00:00.000Z");
  assert.equal(window?.durationMs, 60 * 60 * 1000);
  assert.equal(window?.startLocal.toFormat("yyyy-LL-dd HH:mm"), "2026-04-01 09:00");
});

test("buildUtcWindowFromLocal enforces a minimum duration when the end is not after the start", () => {
  const window = buildUtcWindowFromLocal("2026-04-01", "14:00", "13:45", false);

  assert.ok(window);
  assert.equal(window?.startUtc.toISOString(), "2026-04-01T21:00:00.000Z");
  assert.equal(window?.endUtc.toISOString(), "2026-04-01T21:30:00.000Z");
  assert.equal(window?.durationMs, 30 * 60 * 1000);
});

test("buildUtcWindowFromLocal returns null for invalid dates", () => {
  assert.equal(buildUtcWindowFromLocal("2026-13-40", "09:00", "10:00", false), null);
});
