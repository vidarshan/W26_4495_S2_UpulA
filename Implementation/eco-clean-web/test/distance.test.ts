import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  getBestProximityScore,
  getPostalPrefix,
  getProximityScore,
  normalizeCity,
} = require("../lib/utils/distance.ts");

test("getPostalPrefix normalizes spacing and case", () => {
  assert.equal(getPostalPrefix("v6b 1a1"), "V6B");
  assert.equal(getPostalPrefix(" V6K "), "V6K");
  assert.equal(getPostalPrefix(null), null);
});

test("normalizeCity trims and lowercases city names", () => {
  assert.equal(normalizeCity("  Vancouver "), "vancouver");
  assert.equal(normalizeCity(""), null);
  assert.equal(normalizeCity(undefined), null);
});

test("getProximityScore prefers exact postal prefix matches", () => {
  const score = getProximityScore({
    staffCity: "Burnaby",
    staffPostal: "V5H 2N2",
    jobCity: "Richmond",
    jobPostal: "V5H 9Z9",
  });

  assert.equal(score, 100);
});

test("getProximityScore falls back to city match before generic score", () => {
  const cityScore = getProximityScore({
    staffCity: " Vancouver ",
    staffPostal: "V6B 1A1",
    jobCity: "vancouver",
    jobPostal: "V5K 0A1",
  });

  const genericScore = getProximityScore({
    staffCity: "Burnaby",
    staffPostal: "V5H 2N2",
    jobCity: "Surrey",
    jobPostal: "V3T 1A1",
  });

  assert.equal(cityScore, 60);
  assert.equal(genericScore, 20);
});

test("getBestProximityScore chooses the stronger source between home and last job", () => {
  const fromLastJob = getBestProximityScore(
    {
      staffProfile: {
        staffAddress: {
          city: "Burnaby",
          postalCode: "V5H 2N2",
        },
      },
      lastKnownJobLocation: {
        city: "Richmond",
        postalCode: "V6B 1A1",
      },
    },
    {
      city: "Vancouver",
      postalCode: "V6B 9Z9",
    },
  );

  const fromHome = getBestProximityScore(
    {
      staffProfile: {
        staffAddress: {
          city: "Vancouver",
          postalCode: "V6K 1A1",
        },
      },
      lastKnownJobLocation: null,
    },
    {
      city: "Vancouver",
      postalCode: "V5K 0A1",
    },
  );

  assert.deepEqual(fromLastJob, { score: 100, origin: "last_job" });
  assert.deepEqual(fromHome, { score: 60, origin: "home" });
});
