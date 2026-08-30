import test from "node:test";
import assert from "node:assert/strict";
import { earliestContinuationDate } from "../src/streak-policy.js";

const activityDate = new Date("2026-08-30T18:00:00.000Z");

test("requires consecutive UTC dates by default", () => {
  assert.equal(earliestContinuationDate(activityDate, 1), "2026-08-29");
});

test("allows a configurable gap between qualifying UTC dates", () => {
  assert.equal(earliestContinuationDate(activityDate, 2), "2026-08-28");
});
