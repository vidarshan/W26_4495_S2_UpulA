import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { normalizeAddressLocation } = require("../lib/staffLocation.ts");

test("normalizeAddressLocation trims populated address parts", () => {
  const normalized = normalizeAddressLocation({
    street1: " 123 Main St ",
    street2: " Apt 4 ",
    city: " Vancouver ",
    province: " BC ",
    postalCode: " V6B 1A1 ",
    country: " Canada ",
  });

  assert.deepEqual(normalized, {
    street1: "123 Main St",
    street2: "Apt 4",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    country: "Canada",
  });
});

test("normalizeAddressLocation returns null when every field is empty or missing", () => {
  assert.equal(
    normalizeAddressLocation({
      street1: " ",
      street2: null,
      city: "",
      province: undefined,
      postalCode: "   ",
      country: null,
    }),
    null,
  );

  assert.equal(normalizeAddressLocation(null), null);
  assert.equal(normalizeAddressLocation(undefined), null);
});
