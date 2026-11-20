import type {
  SceneEdgeState,
  SceneMessage,
  SceneNodeState,
  SceneSection,
  SceneStep,
} from "@engineering-playbook/content-schema";

export type ResolvedScene = {
  step: SceneStep;
  index: number;
  nodes: Record<string, Required<Omit<SceneNodeState, "sublabel">> & { sublabel?: string }>;
  edges: Record<string, Required<Omit<SceneEdgeState, "label">> & { label?: string }>;
  metrics: Record<string, string>;
  /** Metric ids whose value changed on this exact step. */
  changedMetrics: Set<string>;
  messages: SceneMessage[];
  completedObjectives: Set<string>;
};

/** Clamps `index` into the scene's step range. */
export function clampStep(scene: SceneSection, index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(scene.steps.length - 1, Math.max(0, Math.trunc(index)));
}

/**
 * Folds steps 0..index into a single visual state.
 * Node/edge/metric overrides accumulate; messages belong to the current step only.
 */
export function resolveSceneStep(scene: SceneSection, rawIndex: number): ResolvedScene {
  const index = clampStep(scene, rawIndex);

  const nodes: ResolvedScene["nodes"] = {};
  for (const n of scene.nodes) {
    nodes[n.id] = { tone: "neutral", badge: "", hidden: false, sublabel: n.sublabel };
  }

  const edges: ResolvedScene["edges"] = {};
  for (const e of scene.edges) {
    edges[e.id] = { tone: "neutral", hidden: false, label: e.label };
  }

  const metrics: Record<string, string> = {};
  for (const m of scene.metrics ?? []) metrics[m.id] = m.initial ?? "—";

  const completedObjectives = new Set<string>();
  let changedMetrics = new Set<string>();

  for (let i = 0; i <= index; i++) {
    const step = scene.steps[i];
    for (const [id, patch] of Object.entries(step.nodes ?? {})) {
      if (nodes[id]) nodes[id] = { ...nodes[id], ...patch };
    }
    for (const [id, patch] of Object.entries(step.edges ?? {})) {
      if (edges[id]) edges[id] = { ...edges[id], ...patch };
    }
    changedMetrics = new Set<string>();
    for (const [id, value] of Object.entries(step.metrics ?? {})) {
      if (metrics[id] !== value) changedMetrics.add(id);
      metrics[id] = value;
    }
    for (const id of step.completes ?? []) completedObjectives.add(id);
  }

  const step = scene.steps[index];
  return {
    step,
    index,
    nodes,
    edges,
    metrics,
    changedMetrics,
    messages: step.messages ?? [],
    completedObjectives,
  };
}

/** Returns human-readable problems with a scene's references; empty when valid. */
export function validateScene(scene: SceneSection): string[] {
  const problems: string[] = [];
  const nodeIds = new Set(scene.nodes.map((n) => n.id));
  const edgeIds = new Set(scene.edges.map((e) => e.id));
  const metricIds = new Set((scene.metrics ?? []).map((m) => m.id));
  const objectiveIds = new Set((scene.objectives ?? []).map((o) => o.id));

  if (scene.steps.length === 0) problems.push(`${scene.id}: scene has no steps`);
  if (nodeIds.size !== scene.nodes.length) problems.push(`${scene.id}: duplicate node id`);
  if (edgeIds.size !== scene.edges.length) problems.push(`${scene.id}: duplicate edge id`);

  for (const e of scene.edges) {
    if (!nodeIds.has(e.from))
      problems.push(`${scene.id}: edge ${e.id} has unknown from "${e.from}"`);
    if (!nodeIds.has(e.to)) problems.push(`${scene.id}: edge ${e.id} has unknown to "${e.to}"`);
  }
  for (const n of scene.nodes) {
    if (n.x < 0 || n.x > 640 || n.y < 0 || n.y > 360) {
      problems.push(`${scene.id}: node ${n.id} is outside the 640×360 canvas`);
    }
  }

  const stepIds = new Set<string>();
  const completed = new Set<string>();
  for (const s of scene.steps) {
    const where = `${scene.id}/${s.id}`;
    if (stepIds.has(s.id)) problems.push(`${where}: duplicate step id`);
    stepIds.add(s.id);
    for (const id of Object.keys(s.nodes ?? {})) {
      if (!nodeIds.has(id)) problems.push(`${where}: unknown node "${id}"`);
    }
    for (const id of Object.keys(s.edges ?? {})) {
      if (!edgeIds.has(id)) problems.push(`${where}: unknown edge "${id}"`);
    }
    for (const m of s.messages ?? []) {
      if (!edgeIds.has(m.edge)) problems.push(`${where}: message on unknown edge "${m.edge}"`);
    }
    for (const id of Object.keys(s.metrics ?? {})) {
      if (!metricIds.has(id)) problems.push(`${where}: unknown metric "${id}"`);
    }
    for (const id of s.completes ?? []) {
      if (!objectiveIds.has(id)) problems.push(`${where}: unknown objective "${id}"`);
      completed.add(id);
    }
  }
  for (const id of objectiveIds) {
    if (!completed.has(id)) problems.push(`${scene.id}: objective "${id}" is never completed`);
  }

  return problems;
}
