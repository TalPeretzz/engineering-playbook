"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SceneMessageKind,
  SceneNode,
  SceneNodeKind,
  SceneSection,
  SceneStage,
  SceneTone,
} from "@engineering-playbook/content-schema";
import { clampStep, resolveSceneStep } from "@/utils/sceneState";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const CANVAS_W = 640;
const CANVAS_H = 360;
const NODE_MIN_W = 124;
const NODE_H = 52;
const CHIP_AT = 0.4;

/** Node box width, sized to fit its label and sublabel (≈ glyph widths at the rendered font sizes). */
function nodeWidth(label: string, sublabel?: string): number {
  const text = Math.max(label.length * 7.2, (sublabel?.length ?? 0) * 6.1);
  return Math.max(NODE_MIN_W, Math.ceil(38 + text + 14));
}
const AUTOPLAY_MS = 7000;

type Point = { x: number; y: number };

/** Point where the ray from the node centre towards `toward` leaves the node's box. */
function exitPoint(center: Point, width: number, toward: Point, pad = 6): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const hw = width / 2 + pad;
  const hh = NODE_H / 2 + pad;
  const scale = Math.min(
    dx === 0 ? Infinity : hw / Math.abs(dx),
    dy === 0 ? Infinity : hh / Math.abs(dy)
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function edgeEndpoints(from: SceneNode, fromW: number, to: SceneNode, toW: number): [Point, Point] {
  return [exitPoint(from, fromW, to), exitPoint(to, toW, from)];
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------------------------------------------------------------------------
// Visual vocabulary
// ---------------------------------------------------------------------------

const NODE_TONE: Record<SceneTone, { box: string; label: string }> = {
  neutral: {
    box: "fill-[var(--surface-raised)] stroke-[var(--wire-strong)]",
    label: "fill-[var(--ink)]",
  },
  active: {
    box: "fill-sky-50 stroke-sky-500 dark:fill-sky-950",
    label: "fill-sky-900 dark:fill-sky-200",
  },
  leader: {
    box: "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950",
    label: "fill-emerald-900 dark:fill-emerald-200",
  },
  success: {
    box: "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950",
    label: "fill-emerald-900 dark:fill-emerald-200",
  },
  warning: {
    box: "fill-amber-50 stroke-amber-500 dark:fill-amber-950",
    label: "fill-amber-900 dark:fill-amber-200",
  },
  danger: {
    box: "fill-red-50 stroke-red-500 dark:fill-red-950",
    label: "fill-red-900 dark:fill-red-200",
  },
  muted: {
    box: "fill-[var(--surface-overlay)] stroke-[var(--wire-strong)]",
    label: "fill-[var(--ink-faint)]",
  },
};

const BADGE_TONE: Record<SceneTone, string> = {
  neutral: "fill-[var(--ink-muted)]",
  active: "fill-sky-600",
  leader: "fill-emerald-600",
  success: "fill-emerald-600",
  warning: "fill-amber-600",
  danger: "fill-red-600",
  muted: "fill-[var(--ink-faint)]",
};

const EDGE_TONE: Record<SceneTone, string> = {
  neutral: "stroke-[var(--wire-strong)]",
  active: "stroke-sky-500",
  leader: "stroke-emerald-500",
  success: "stroke-emerald-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
  muted: "stroke-[var(--wire)]",
};

const MESSAGE_TONE: Record<SceneMessageKind, { dot: string; chip: string; label: string }> = {
  request: { dot: "fill-sky-500", chip: "stroke-sky-500", label: "Request" },
  response: { dot: "fill-emerald-500", chip: "stroke-emerald-500", label: "Response" },
  heartbeat: { dot: "fill-violet-500", chip: "stroke-violet-500", label: "Heartbeat / watch" },
  failure: { dot: "fill-red-500", chip: "stroke-red-500", label: "Failure" },
};

const STAGE_STYLE: Record<SceneStage, { label: string; cls: string }> = {
  problem: {
    label: "Problem",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  },
  mechanism: {
    label: "How it works",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  },
  failure: {
    label: "Failure",
    cls: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  },
  solution: {
    label: "Solution",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  },
  recap: {
    label: "Recap",
    cls: "bg-surface-overlay text-ink-muted border-wire",
  },
};

function KindIcon({ kind, x, y }: { kind: SceneNodeKind; x: number; y: number }) {
  const common = {
    fill: "none",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "stroke-[var(--ink-muted)]",
  };
  const t = `translate(${x} ${y})`;
  switch (kind) {
    case "client":
      return (
        <g transform={t} {...common}>
          <rect x={1} y={2} width={18} height={12} rx={2} />
          <path d="M6 18h8M10 14v4" />
        </g>
      );
    case "server":
    case "worker":
      return (
        <g transform={t} {...common}>
          <rect x={2} y={2} width={16} height={7} rx={1.5} />
          <rect x={2} y={11} width={16} height={7} rx={1.5} />
          <path d="M5.5 5.5h.01M5.5 14.5h.01" />
        </g>
      );
    case "database":
      return (
        <g transform={t} {...common}>
          <ellipse cx={10} cy={4.5} rx={7} ry={2.5} />
          <path d="M3 4.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M3 10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
        </g>
      );
    case "cache":
      return (
        <g transform={t} {...common}>
          <path d="M11 1.5 4 11h6l-1 7.5L16 9h-6l1-7.5Z" />
        </g>
      );
    case "queue":
      return (
        <g transform={t} {...common}>
          <rect x={1.5} y={5} width={4.5} height={10} rx={1} />
          <rect x={7.75} y={5} width={4.5} height={10} rx={1} />
          <rect x={14} y={5} width={4.5} height={10} rx={1} />
        </g>
      );
    case "coordinator":
      return (
        <g transform={t} {...common}>
          <path d="M10 1.5 17.5 6v8L10 18.5 2.5 14V6Z" />
          <circle cx={10} cy={10} r={2.5} />
        </g>
      );
  }
}

/** Renders `**bold**` and `` `code` `` inline. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-surface-overlay border border-wire"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SceneWalkthrough({
  scene,
  onFirstStep,
}: {
  scene: SceneSection;
  onFirstStep?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const firstStepFired = useRef(false);

  const state = useMemo(() => resolveSceneStep(scene, stepIndex), [scene, stepIndex]);
  const nodeById = useMemo(() => new Map(scene.nodes.map((n) => [n.id, n])), [scene.nodes]);
  const last = scene.steps.length - 1;
  const stepParam = scene.id;

  // Deep link: ?<sceneId>=<1-based step>
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get(stepParam);
    if (raw === null) return;
    const n = clampStep(scene, Number(raw) - 1);
    setStepIndex(n);
    rootRef.current?.scrollIntoView({ block: "start" });
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback(
    (next: number, opts: { userInitiated?: boolean } = {}) => {
      const n = clampStep(scene, next);
      if (n > 0 && !firstStepFired.current) {
        firstStepFired.current = true;
        onFirstStep?.();
      }
      if (opts.userInitiated) setPlaying(false);
      setStepIndex(n);
      const url = new URL(window.location.href);
      if (n === 0) url.searchParams.delete(stepParam);
      else url.searchParams.set(stepParam, String(n + 1));
      window.history.replaceState(window.history.state, "", url);
    },
    [scene, onFirstStep, stepParam]
  );

  // Restart message animations whenever the step changes or the user replays.
  useEffect(() => {
    svgRef.current?.setCurrentTime?.(0);
  }, [stepIndex, replayKey]);

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= last) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => goTo(stepIndex + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, stepIndex, last, goTo]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest("button") && e.key === " ") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(stepIndex + 1, { userInitiated: true });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(stepIndex - 1, { userInitiated: true });
    } else if (e.key === "r" || e.key === "R") {
      setReplayKey((k) => k + 1);
    } else if (e.key === " ") {
      e.preventDefault();
      setPlaying((p) => !p);
    }
  };

  const widthOf = (id: string) => {
    const n = nodeById.get(id)!;
    return nodeWidth(n.label, state.nodes[id].sublabel);
  };
  /** Endpoints of an edge in its authored from→to direction. */
  const edgeGeom = (edgeId: string) => {
    const e = scene.edges.find((x) => x.id === edgeId)!;
    return edgeEndpoints(
      nodeById.get(e.from)!,
      widthOf(e.from),
      nodeById.get(e.to)!,
      widthOf(e.to)
    );
  };

  const step = state.step;
  const stage = STAGE_STYLE[step.stage];
  const messageEdges = new Set(state.messages.map((m) => m.edge));
  const usedKinds = Array.from(new Set(state.messages.map((m) => m.kind ?? "request")));

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="interactive walkthrough"
      aria-label={`${scene.heading}: ${scene.scenario}`}
      className="scroll-mt-24 bg-surface-raised border border-wire rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {/* Scenario + metrics */}
      <div className="px-5 pt-4 pb-3 border-b border-wire space-y-3">
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Scenario: </span>
          <Inline text={scene.scenario} />
        </p>
        {scene.metrics && scene.metrics.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {scene.metrics.map((m) => {
              const changed = state.changedMetrics.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border px-3 py-2 transition-colors ${
                    changed ? "border-brand bg-emerald-50/60 dark:bg-emerald-950/30" : "border-wire"
                  }`}
                >
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                    {m.label}
                  </dt>
                  <dd className="font-mono text-sm font-semibold text-ink tabular-nums">
                    {state.metrics[m.id]}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>

      {/* Canvas */}
      <div className="relative bg-surface">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Diagram for step ${stepIndex + 1}: ${step.title}`}
        >
          <defs>
            <pattern id={`${scene.id}-grid`} width={20} height={20} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.9} className="fill-[var(--wire-strong)]" opacity={0.6} />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill={`url(#${scene.id}-grid)`} />

          {/* Edges */}
          {scene.edges.map((edge) => {
            const es = state.edges[edge.id];
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to || es.hidden) return null;
            if (state.nodes[edge.from].hidden || state.nodes[edge.to].hidden) return null;
            const [a, b] = edgeGeom(edge.id);
            const mid = lerp(a, b, CHIP_AT);
            const showLabel = es.label && !messageEdges.has(edge.id);
            return (
              <g key={edge.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={1.5}
                  strokeDasharray={edge.dashed ? "5 5" : undefined}
                  className={`transition-colors duration-500 ${EDGE_TONE[es.tone]}`}
                />
                {showLabel && <Chip x={mid.x} y={mid.y} text={es.label!} />}
              </g>
            );
          })}

          {/* Nodes */}
          {scene.nodes.map((node) => {
            const ns = state.nodes[node.id];
            if (ns.hidden) return null;
            const tone = NODE_TONE[ns.tone];
            const w = widthOf(node.id);
            const x = node.x - w / 2;
            const y = node.y - NODE_H / 2;
            return (
              <g
                key={node.id}
                className="transition-opacity duration-500"
                opacity={ns.tone === "muted" ? 0.55 : 1}
              >
                {(ns.tone === "leader" || ns.tone === "active") && !reduceMotion && (
                  <rect
                    x={x - 4}
                    y={y - 4}
                    width={w + 8}
                    height={NODE_H + 8}
                    rx={14}
                    fill="none"
                    strokeWidth={1}
                    className={`${ns.tone === "leader" ? "stroke-emerald-400" : "stroke-sky-400"} animate-pulse`}
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={NODE_H}
                  rx={10}
                  strokeWidth={1.5}
                  strokeDasharray={ns.tone === "muted" ? "4 3" : undefined}
                  className={`transition-colors duration-500 ${tone.box}`}
                />
                <KindIcon kind={node.kind} x={x + 10} y={node.y - 10} />
                <text
                  x={x + 38}
                  y={ns.sublabel ? node.y - 3 : node.y + 4}
                  className={`text-[12px] font-semibold ${tone.label}`}
                  style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
                >
                  {node.label}
                </text>
                {ns.sublabel && (
                  <text
                    x={x + 38}
                    y={node.y + 12}
                    className="text-[10px] fill-[var(--ink-faint)]"
                    style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
                  >
                    {ns.sublabel}
                  </text>
                )}
                {ns.badge && (
                  <g>
                    <rect
                      x={node.x - (ns.badge.length * 6.4 + 14) / 2}
                      y={y - 11}
                      width={ns.badge.length * 6.4 + 14}
                      height={18}
                      rx={9}
                      className={BADGE_TONE[ns.tone]}
                    />
                    <text
                      x={node.x}
                      y={y + 2}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-white tracking-wider"
                      style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
                    >
                      {ns.badge}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Messages */}
          <g key={`${stepIndex}-${replayKey}`}>
            {state.messages.map((m, i) => {
              const edge = scene.edges.find((e) => e.id === m.edge);
              if (!edge) return null;
              const [p0, p1] = edgeGeom(edge.id);
              const [a, b] = m.reverse ? [p1, p0] : [p0, p1];
              const kind = MESSAGE_TONE[m.kind ?? "request"];
              // Chips sit at a fixed point along the authored edge so opposite-direction
              // messages on neighbouring edges don't pile up at the shared endpoint.
              const mid = lerp(p0, p1, CHIP_AT);
              const still = lerp(a, b, 0.7);
              return (
                <g key={i}>
                  {reduceMotion ? (
                    <circle cx={still.x} cy={still.y} r={5} className={kind.dot} />
                  ) : (
                    <circle r={5} cx={0} cy={0} className={kind.dot}>
                      <animateMotion
                        dur="1.8s"
                        begin={`${i * 0.25}s`}
                        repeatCount="indefinite"
                        path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                        keyPoints="0;1;1"
                        keyTimes="0;0.75;1"
                        calcMode="linear"
                      />
                    </circle>
                  )}
                  {m.label && <Chip x={mid.x} y={mid.y} text={m.label} toneClass={kind.chip} />}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend + transport */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-wire bg-surface-raised">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint" aria-label="Legend">
            {(usedKinds.length > 0 ? usedKinds : (["request"] as SceneMessageKind[])).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <svg width={8} height={8} aria-hidden="true">
                  <circle cx={4} cy={4} r={4} className={MESSAGE_TONE[k].dot} />
                </svg>
                {MESSAGE_TONE[k].label}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            <IconButton label="Replay step (R)" onClick={() => setReplayKey((k) => k + 1)}>
              <path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5v2.5h2.5" />
            </IconButton>
            <IconButton
              label={playing ? "Pause autoplay (Space)" : "Autoplay (Space)"}
              pressed={playing}
              onClick={() => {
                if (!playing && stepIndex >= last) goTo(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? <path d="M5.5 3.5v9M10.5 3.5v9" /> : <path d="M5 3l8 5-8 5Z" />}
            </IconButton>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <nav
        aria-label="Walkthrough steps"
        className="px-4 py-3 border-t border-wire overflow-x-auto"
      >
        <ol className="flex items-start min-w-[560px]">
          {scene.steps.map((s, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={s.id} className="relative flex-1 flex justify-center">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute z-0 top-3 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                      done || current ? "bg-brand" : "bg-wire"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goTo(i, { userInitiated: true })}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  className="group relative z-10 flex flex-col items-center gap-1 cursor-pointer focus-visible:outline-none"
                >
                  <span
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-mono font-semibold transition-colors group-focus-visible:ring-2 group-focus-visible:ring-brand ${
                      current
                        ? "bg-brand border-brand text-white"
                        : done
                          ? "border-brand text-brand-text bg-surface-raised"
                          : "border-wire-strong text-ink-faint bg-surface-raised group-hover:border-ink-faint"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[10px] leading-tight text-center whitespace-nowrap ${
                      current ? "text-ink font-medium" : "text-ink-faint"
                    }`}
                  >
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Narrative + objectives */}
      <div className="grid md:grid-cols-[minmax(0,1fr)_220px] border-t border-wire">
        <div className="p-5 space-y-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-ink-faint">
              Step {stepIndex + 1} / {scene.steps.length}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${stage.cls}`}
            >
              {stage.label}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-ink leading-snug">{step.title}</h3>
          <div className="space-y-3 text-sm text-ink-muted leading-relaxed">
            {step.body.map((p, i) => (
              <p key={i}>
                <Inline text={p} />
              </p>
            ))}
          </div>

          {step.keyIdea && (
            <div className="rounded-lg border border-brand/40 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text mb-1">
                Key idea
              </p>
              <p className="text-sm text-ink">
                <Inline text={step.keyIdea} />
              </p>
            </div>
          )}

          {step.changes && step.changes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-2">
                What changed
              </p>
              <ul className="space-y-1.5">
                {step.changes.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-muted">
                    <span
                      aria-hidden="true"
                      className={`font-mono font-bold w-3 shrink-0 ${
                        c.kind === "add"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : c.kind === "remove"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {c.kind === "add" ? "+" : c.kind === "remove" ? "−" : "~"}
                    </span>
                    <span className="sr-only">
                      {c.kind === "add"
                        ? "Added: "
                        : c.kind === "remove"
                          ? "Removed: "
                          : "Changed: "}
                    </span>
                    <span>
                      <Inline text={c.text} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1, { userInitiated: true })}
              disabled={stepIndex === 0}
              className="px-3 py-1.5 rounded-lg border border-wire text-sm text-ink-muted hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              ← Back
            </button>
            <span className="hidden sm:inline text-[11px] text-ink-faint">
              ← → step · R replay · Space play
            </span>
            <button
              type="button"
              onClick={() => goTo(stepIndex === last ? 0 : stepIndex + 1, { userInitiated: true })}
              className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {stepIndex === last ? "↺ Start over" : `Next: ${scene.steps[stepIndex + 1].short} →`}
            </button>
          </div>
        </div>

        {scene.objectives && scene.objectives.length > 0 && (
          <aside className="p-5 border-t md:border-t-0 md:border-l border-wire bg-surface/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-3">
              You&apos;ll learn
            </p>
            <ul className="space-y-2.5">
              {scene.objectives.map((o) => {
                const done = state.completedObjectives.has(o.id);
                return (
                  <li key={o.id} className="flex gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${
                        done ? "bg-brand border-brand text-white" : "border-wire-strong"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span className={done ? "text-ink" : "text-ink-faint"}>
                      <span className="sr-only">{done ? "Covered: " : "Not yet covered: "}</span>
                      {o.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

function Chip({
  x,
  y,
  text,
  toneClass,
}: {
  x: number;
  y: number;
  text: string;
  toneClass?: string;
}) {
  const w = text.length * 6 + 16;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 10}
        width={w}
        height={20}
        rx={6}
        strokeWidth={1}
        className={`fill-[var(--surface-raised)] ${toneClass ?? "stroke-[var(--wire-strong)]"}`}
      />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        className="text-[10px] fill-[var(--ink-muted)]"
        style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
      >
        {text}
      </text>
    </g>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="h-7 w-7 flex items-center justify-center rounded-md border border-wire text-ink-muted hover:bg-surface-overlay hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
