import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { combineDateAndTime } = require("../lib/utils/combineDateAndTime.ts");

test("combineDateAndTime returns null when either input is missing", () => {
  assert.equal(combineDateAndTime(null, "09:30"), null);
  assert.equal(combineDateAndTime(new Date("2026-03-31T00:00:00.000Z"), ""), null);
});

test("combineDateAndTime preserves the calendar day and applies hours and minutes", () => {
  const base = new Date(2026, 2, 31, 0, 0, 0, 0);

  const combined = combineDateAndTime(base, "14:45");

  assert.ok(combined instanceof Date);
  assert.notEqual(combined, base);
  assert.equal(combined?.getFullYear(), 2026);
  assert.equal(combined?.getMonth(), 2);
  assert.equal(combined?.getDate(), 31);
  assert.equal(combined?.getHours(), 14);
  assert.equal(combined?.getMinutes(), 45);
  assert.equal(combined?.getSeconds(), 0);
  assert.equal(combined?.getMilliseconds(), 0);
});
