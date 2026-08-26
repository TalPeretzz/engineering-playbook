import { describe, it, expect } from "vitest";
import { allRequiredCompleted, buildDraftRecord } from "../challengeCompletion";

// ---------------------------------------------------------------------------
// allRequiredCompleted — topic completion logic
// ---------------------------------------------------------------------------

const CHALLENGES = [
  { id: "ch-conceptual", required: true },
  { id: "ch-impl", required: true },
  { id: "ch-sysdesign", required: false },
];

describe("allRequiredCompleted", () => {
  it("returns false when no challenges have been completed", () => {
    expect(allRequiredCompleted(CHALLENGES, [])).toBe(false);
  });

  it("returns false when only optional challenges are completed", () => {
    // Revealing a solution or viewing discussion points does not add to completedIds.
    // This test documents that solution-reveal state is component-local and never
    // flows into completedIds — so it cannot trigger topic completion.
    expect(allRequiredCompleted(CHALLENGES, ["ch-sysdesign"])).toBe(false);
  });

  it("returns false when only some required challenges are completed", () => {
    expect(allRequiredCompleted(CHALLENGES, ["ch-conceptual"])).toBe(false);
  });

  it("returns true when all required challenges are explicitly completed", () => {
    expect(allRequiredCompleted(CHALLENGES, ["ch-conceptual", "ch-impl"])).toBe(true);
  });

  it("optional challenges do not block topic completion", () => {
    // Topic completes as soon as required challenges are done,
    // regardless of whether optional challenges are touched.
    expect(allRequiredCompleted(CHALLENGES, ["ch-conceptual", "ch-impl"])).toBe(true);
  });

  it("extra completed ids (e.g. optional) do not affect the result", () => {
    expect(
      allRequiredCompleted(CHALLENGES, ["ch-conceptual", "ch-impl", "ch-sysdesign"])
    ).toBe(true);
  });

  it("returns false when there are no required challenges", () => {
    // A topic with only optional challenges is never auto-completed.
    expect(allRequiredCompleted([{ id: "opt", required: false }], ["opt"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildDraftRecord — per-language draft initialisation
// ---------------------------------------------------------------------------

describe("buildDraftRecord", () => {
  it("initialises each language slot with its starter code", () => {
    const drafts = buildDraftRecord({
      typescript: "ts starter",
      python: "py starter",
      java: "java starter",
    });
    expect(drafts.typescript).toBe("ts starter");
    expect(drafts.python).toBe("py starter");
    expect(drafts.java).toBe("java starter");
  });

  it("falls back to typescript starter for a missing language", () => {
    const drafts = buildDraftRecord({ typescript: "ts starter" });
    expect(drafts.python).toBe("ts starter");
    expect(drafts.java).toBe("ts starter");
  });

  it("preserves each language draft independently after edits", () => {
    // Simulate: open TypeScript, write code, switch to Python, switch back.
    let drafts = buildDraftRecord({
      typescript: "ts starter",
      python: "py starter",
      java: "",
    });

    // User edits the TypeScript draft.
    drafts = { ...drafts, typescript: "my ts implementation" };

    // Switch to Python — Python draft is untouched.
    expect(drafts["python"]).toBe("py starter");

    // Switch back to TypeScript — user's edit is still there.
    expect(drafts["typescript"]).toBe("my ts implementation");
  });

  it("resetting one language does not affect the others", () => {
    let drafts = buildDraftRecord({
      typescript: "ts starter",
      python: "py starter",
      java: "java starter",
    });
    drafts = { ...drafts, typescript: "edited ts" };

    // Reset only TypeScript.
    drafts = { ...drafts, typescript: "ts starter" };

    expect(drafts.typescript).toBe("ts starter");
    expect(drafts.python).toBe("py starter");
    expect(drafts.java).toBe("java starter");
  });
});
