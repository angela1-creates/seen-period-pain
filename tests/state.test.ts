import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneState,
  createInitialState,
  hasAnswerData,
  resetAnswer,
  statusLabel,
} from "../src/state.ts";

test("fresh state starts at the public introduction with no answers", () => {
  const state = createInitialState();
  assert.equal(state.view, "introduction");
  assert.equal(hasAnswerData(state), false);
  assert.equal(state.experience.status, "unanswered");
});

test("skipped and prefer-not states remain distinct from unanswered", () => {
  const state = createInitialState();
  state.experience.status = "skipped";
  state.timing.status = "prefer-not";
  assert.equal(statusLabel(state.experience.status), "Skipped");
  assert.equal(statusLabel(state.timing.status), "Prefer not to answer");
  assert.equal(hasAnswerData(state), true);
});

test("clearing one answer does not affect another", () => {
  const state = createInitialState();
  state.experience = { status: "answered", value: "Synthetic example" };
  state.notes = { status: "answered", value: "Synthetic note" };
  resetAnswer(state, "experience");
  assert.deepEqual(state.experience, { status: "unanswered", value: "" });
  assert.equal(state.notes.value, "Synthetic note");
});

test("a cloned snapshot can restore an individually cleared answer", () => {
  const state = createInitialState();
  state.impact.status = "answered";
  state.impact.entries = [{ area: "School", level: "varies" }];
  const snapshot = cloneState(state);
  resetAnswer(state, "impact");
  state.impact = snapshot.impact;
  assert.deepEqual(state.impact.entries, [{ area: "School", level: "varies" }]);
});
