import { describe, it, expect } from "vitest";
import type { SceneSection } from "@engineering-playbook/content-schema";
import { allTopicDefinitions } from "@engineering-playbook/content";
import { clampStep, resolveSceneStep, validateScene } from "../sceneState";

const scene: SceneSection = {
  type: "scene",
  id: "s",
  heading: "S",
  scenario: "test",
  nodes: [
    { id: "a", label: "A", kind: "server", x: 100, y: 100 },
    { id: "b", label: "B", kind: "database", x: 300, y: 100, sublabel: "base" },
  ],
  edges: [{ id: "ab", from: "a", to: "b", label: "link" }],
  metrics: [
    { id: "m", label: "M", initial: "0" },
    { id: "n", label: "N" },
  ],
  objectives: [
    { id: "o1", text: "one" },
    { id: "o2", text: "two" },
  ],
  steps: [
    {
      id: "1",
      short: "1",
      title: "one",
      stage: "problem",
      body: [],
      nodes: { a: { tone: "danger", badge: "X" } },
      messages: [{ edge: "ab" }],
      metrics: { m: "1" },
      completes: ["o1"],
    },
    {
      id: "2",
      short: "2",
      title: "two",
      stage: "solution",
      body: [],
      nodes: { b: { sublabel: "changed" } },
      edges: { ab: { tone: "leader" } },
      metrics: { m: "1", n: "x" },
      completes: ["o2"],
    },
  ],
};

describe("resolveSceneStep", () => {
  it("starts from defaults before applying step 0", () => {
    const r = resolveSceneStep(scene, 0);
    expect(r.nodes.a).toEqual({ tone: "danger", badge: "X", hidden: false, sublabel: undefined });
    expect(r.nodes.b.sublabel).toBe("base");
    expect(r.metrics).toEqual({ m: "1", n: "—" });
    expect([...r.changedMetrics]).toEqual(["m"]);
    expect(r.messages).toHaveLength(1);
  });

  it("accumulates node, edge and metric overrides but not messages", () => {
    const r = resolveSceneStep(scene, 1);
    expect(r.nodes.a.tone).toBe("danger");
    expect(r.nodes.b.sublabel).toBe("changed");
    expect(r.edges.ab).toEqual({ tone: "leader", hidden: false, label: "link" });
    expect(r.messages).toEqual([]);
    expect([...r.completedObjectives].sort()).toEqual(["o1", "o2"]);
  });

  it("only flags metrics whose value actually changed on this step", () => {
    expect([...resolveSceneStep(scene, 1).changedMetrics]).toEqual(["n"]);
  });

  it("clamps out-of-range and non-numeric indices", () => {
    expect(clampStep(scene, -3)).toBe(0);
    expect(clampStep(scene, 99)).toBe(1);
    expect(clampStep(scene, Number.NaN)).toBe(0);
    expect(resolveSceneStep(scene, 99).index).toBe(1);
  });
});

describe("validateScene", () => {
  it("accepts a well-formed scene", () => {
    expect(validateScene(scene)).toEqual([]);
  });

  it("reports dangling references and uncompleted objectives", () => {
    const broken: SceneSection = {
      ...scene,
      edges: [{ id: "ab", from: "a", to: "nope" }],
      objectives: [...scene.objectives!, { id: "o3", text: "never" }],
      steps: [{ ...scene.steps[0], messages: [{ edge: "zz" }], metrics: { q: "1" } }],
    };
    const problems = validateScene(broken).join("\n");
    expect(problems).toContain('unknown to "nope"');
    expect(problems).toContain('unknown edge "zz"');
    expect(problems).toContain('unknown metric "q"');
    expect(problems).toContain('objective "o3" is never completed');
  });

  it("every scene in the catalog is valid", () => {
    const scenes = allTopicDefinitions.flatMap((t) =>
      (t.lesson?.sections ?? []).filter((s): s is SceneSection => s.type === "scene")
    );
    expect(scenes.length).toBeGreaterThan(0);
    for (const s of scenes) expect(validateScene(s)).toEqual([]);
  });
});
