"use client";

import React from "react";
import type {
  SceneMessageKind,
  SceneNode,
  SceneNodeKind,
  SceneSection,
  SceneTone,
} from "@engineering-playbook/content-schema";
import type { ResolvedScene } from "@/utils/sceneState";

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

export const MESSAGE_TONE: Record<SceneMessageKind, { dot: string; chip: string; label: string }> =
  {
    request: { dot: "fill-sky-500", chip: "stroke-sky-500", label: "Request" },
    response: { dot: "fill-emerald-500", chip: "stroke-emerald-500", label: "Response" },
    heartbeat: { dot: "fill-violet-500", chip: "stroke-violet-500", label: "Heartbeat / watch" },
    failure: { dot: "fill-red-500", chip: "stroke-red-500", label: "Failure" },
  };

export function KindIcon({ kind, x, y }: { kind: SceneNodeKind; x: number; y: number }) {
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

export function Chip({
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

// ---------------------------------------------------------------------------
// Shared canvas props + helpers
// ---------------------------------------------------------------------------

export type SceneCanvasProps = {
  scene: SceneSection;
  state: ResolvedScene;
  reduceMotion: boolean;
  /** Changes whenever message animations should restart (step change / replay). */
  animKey: string;
  svgRef: React.RefObject<SVGSVGElement>;
  ariaLabel: string;
};

const MESSAGE_DUR = 1.8;
const ARRIVE_AT = 0.75;
const DEPTH = 5;

/** Moving dot along a straight path; arrives at ARRIVE_AT of the cycle and waits. */
function TravellingDot({
  a,
  b,
  begin,
  className,
}: {
  a: Point;
  b: Point;
  begin: number;
  className: string;
}) {
  return (
    <circle r={5} cx={0} cy={0} className={className}>
      <animateMotion
        dur={`${MESSAGE_DUR}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
        keyPoints="0;1;1"
        keyTimes={`0;${ARRIVE_AT};1`}
        calcMode="linear"
      />
    </circle>
  );
}

/** Expanding ring at the destination, synchronised with the dot's arrival. */
function ArrivalPulse({ at, begin, className }: { at: Point; begin: number; className: string }) {
  const k = `0;${ARRIVE_AT - 0.01};${ARRIVE_AT + 0.01};1`;
  return (
    <circle cx={at.x} cy={at.y} r={0} className={className} opacity={0}>
      <animate
        attributeName="r"
        values="0;0;5;20"
        keyTimes={k}
        dur={`${MESSAGE_DUR}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0;0;0.45;0"
        keyTimes={k}
        dur={`${MESSAGE_DUR}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

// ---------------------------------------------------------------------------
// Flat (2D with depth)
// ---------------------------------------------------------------------------

export function FlatCanvas({
  scene,
  state,
  reduceMotion,
  animKey,
  svgRef,
  ariaLabel,
}: SceneCanvasProps) {
  const nodeById = new Map(scene.nodes.map((n) => [n.id, n]));
  const widthOf = (id: string) => nodeWidth(nodeById.get(id)!.label, state.nodes[id].sublabel);
  const edgeGeom = (edgeId: string) => {
    const e = scene.edges.find((x) => x.id === edgeId)!;
    return edgeEndpoints(
      nodeById.get(e.from)!,
      widthOf(e.from),
      nodeById.get(e.to)!,
      widthOf(e.to)
    );
  };
  const messageEdges = new Set(state.messages.map((m) => m.edge));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="w-full h-auto block select-none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <filter id={`${scene.id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={4} />
        </filter>
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
            {/* Depth: soft contact shadow + extruded base */}
            <ellipse
              cx={node.x}
              cy={y + NODE_H + 7}
              rx={w * 0.42}
              ry={6}
              className="fill-black dark:fill-black"
              opacity={0.12}
              filter={`url(#${scene.id}-soft)`}
            />
            <rect
              x={x}
              y={y + DEPTH}
              width={w}
              height={NODE_H}
              rx={10}
              strokeWidth={1.5}
              className={`transition-colors duration-500 ${tone.box}`}
            />
            <rect
              x={x}
              y={y + DEPTH}
              width={w}
              height={NODE_H}
              rx={10}
              className="fill-black"
              opacity={0.12}
            />
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
      <g key={animKey}>
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
                <TravellingDot a={a} b={b} begin={i * 0.25} className={kind.dot} />
              )}
              {!reduceMotion && <ArrivalPulse at={b} begin={i * 0.25} className={kind.dot} />}
              {m.label && <Chip x={mid.x} y={mid.y} text={m.label} toneClass={kind.chip} />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Isometric (2.5D)
//
// Node positions keep the authored 640×360 layout (so the diagram reads the
// same as the 2D view), but every node is drawn as an extruded isometric block
// on an isometric ground grid. Labels stay horizontal so they remain readable.
// ---------------------------------------------------------------------------

const ISO_COS = Math.cos(Math.PI / 6); // ≈ 0.866
const ISO_SIN = 0.5;
const ISO_SCALE = 0.78;
const ISO_H = 20; // block height in screen px
const ISO_ROW_STRETCH = 1.25;

function iso(p: Point): Point {
  const x = p.x * ISO_SCALE;
  const y = p.y * ISO_SCALE;
  return { x: (x - y) * ISO_COS, y: (x + y) * ISO_SIN };
}

/** Footprint side (ground units) sized so the label fits across the top face. */
function isoSide(label: string): number {
  return Math.max(54, Math.ceil((label.length * 6.6 + 18) / (2 * ISO_COS * 0.78)));
}

function pts(list: Point[]): string {
  return list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Footprint corners around a projected ground centre: top, right, bottom, left. */
function rhombus(c: Point, side: number, lift = 0): [Point, Point, Point, Point] {
  const hw = side * ISO_COS;
  const hh = side * ISO_SIN;
  return [
    { x: c.x, y: c.y - hh - lift },
    { x: c.x + hw, y: c.y - lift },
    { x: c.x, y: c.y + hh - lift },
    { x: c.x - hw, y: c.y - lift },
  ];
}

export function IsoCanvas({
  scene,
  state,
  reduceMotion,
  animKey,
  svgRef,
  ariaLabel,
}: SceneCanvasProps) {
  const visible = scene.nodes.filter((n) => !state.nodes[n.id].hidden);
  const geo = new Map(
    scene.nodes.map((n) => {
      const side = isoSide(n.label);
      // Blocks are taller than flat cards, so stretch rows apart a little.
      return [
        n.id,
        { g: { x: n.x, y: CANVAS_H / 2 + (n.y - CANVAS_H / 2) * ISO_ROW_STRETCH }, side },
      ];
    })
  );

  // Fit the viewBox to every node (hidden ones too, so the camera never jumps between steps).
  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of scene.nodes) {
    const { g, side } = geo.get(n.id)!;
    xs.push(g.x - side * ISO_COS, g.x + side * ISO_COS);
    ys.push(g.y - side * ISO_SIN - ISO_H - 26, g.y + side * ISO_SIN + 30);
  }
  const pad = 28;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const vbW = Math.max(...xs) + pad - minX;
  const vbH = Math.max(...ys) + pad - minY;

  /** Edge endpoints on the ground plane, trimmed to the block footprints. */
  const edgeGeom = (edgeId: string): [Point, Point] => {
    const e = scene.edges.find((x) => x.id === edgeId)!;
    const A = geo.get(e.from)!;
    const B = geo.get(e.to)!;
    const dx = B.g.x - A.g.x;
    const dy = B.g.y - A.g.y;
    const len = Math.hypot(dx, dy) || 1;
    const ta = Math.min(0.45, (A.side * 0.62) / len);
    const tb = Math.max(0.55, 1 - (B.side * 0.62) / len);
    return [lerp(A.g, B.g, ta), lerp(A.g, B.g, tb)];
  };
  const messageEdges = new Set(state.messages.map((m) => m.edge));

  // Ground grid lines in both iso directions.
  const grid: [Point, Point][] = [];
  for (let k = -400; k <= 1000; k += 40) {
    grid.push([iso({ x: k, y: -400 }), iso({ x: k, y: 800 })]);
    grid.push([iso({ x: -400, y: k }), iso({ x: 1000, y: k })]);
  }

  const order = [...visible].sort((p, q) => geo.get(p.id)!.g.y - geo.get(q.id)!.g.y);

  return (
    <svg
      ref={svgRef}
      viewBox={`${minX.toFixed(1)} ${minY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      className="w-full h-auto block select-none"
      style={{ aspectRatio: `${vbW} / ${vbH}`, maxHeight: 460 }}
      role="img"
      aria-label={ariaLabel}
    >
      <g className="stroke-[var(--wire)]" strokeWidth={0.8} opacity={0.9}>
        {grid.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>

      {/* Edges (on the ground plane, under the blocks) */}
      {scene.edges.map((edge) => {
        const es = state.edges[edge.id];
        if (es.hidden || state.nodes[edge.from].hidden || state.nodes[edge.to].hidden) return null;
        const [a, b] = edgeGeom(edge.id);
        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth={1.8}
            strokeDasharray={edge.dashed ? "5 5" : undefined}
            className={`transition-colors duration-500 ${EDGE_TONE[es.tone]}`}
          />
        );
      })}

      {/* Blocks, back to front */}
      {order.map((node) => {
        const ns = state.nodes[node.id];
        const { g, side } = geo.get(node.id)!;
        const tone = NODE_TONE[ns.tone];
        const [bt, br, bb, bl] = rhombus(g, side);
        const [tt, tr, tb, tl] = rhombus(g, side, ISO_H);
        const top = { x: g.x, y: g.y - ISO_H };
        return (
          <g
            key={node.id}
            className="transition-opacity duration-500"
            opacity={ns.tone === "muted" ? 0.55 : 1}
          >
            {/* contact shadow */}
            <polygon
              points={pts(rhombus({ x: g.x + 6, y: g.y + 4 }, side * 1.08))}
              className="fill-black"
              opacity={0.1}
            />
            {(ns.tone === "leader" || ns.tone === "active") && !reduceMotion && (
              <polygon
                points={pts(rhombus(g, side * 1.32))}
                fill="none"
                strokeWidth={1.2}
                className={`${ns.tone === "leader" ? "stroke-emerald-400" : "stroke-sky-400"} animate-pulse`}
              />
            )}
            {/* left + right faces */}
            <polygon
              points={pts([tl, tb, bb, bl])}
              strokeWidth={1.2}
              strokeLinejoin="round"
              className={tone.box}
            />
            <polygon points={pts([tl, tb, bb, bl])} className="fill-black" opacity={0.08} />
            <polygon
              points={pts([tb, tr, br, bb])}
              strokeWidth={1.2}
              strokeLinejoin="round"
              className={tone.box}
            />
            <polygon points={pts([tb, tr, br, bb])} className="fill-black" opacity={0.18} />
            {/* top face */}
            <polygon
              points={pts([tt, tr, tb, tl])}
              strokeWidth={1.4}
              strokeLinejoin="round"
              strokeDasharray={ns.tone === "muted" ? "4 3" : undefined}
              className={`transition-colors duration-500 ${tone.box}`}
            />
            <KindIcon kind={node.kind} x={top.x - 10} y={top.y - 19} />
            <text
              x={top.x}
              y={top.y + 11}
              textAnchor="middle"
              className={`text-[11px] font-semibold ${tone.label}`}
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {node.label}
            </text>
            {ns.sublabel && <Chip x={g.x} y={bb.y + 16} text={ns.sublabel} />}
          </g>
        );
      })}

      {/* Labels above the blocks, below the moving dots */}
      {scene.edges.map((edge) => {
        const es = state.edges[edge.id];
        if (es.hidden || state.nodes[edge.from].hidden || state.nodes[edge.to].hidden) return null;
        const msg = state.messages.find((m) => m.edge === edge.id && m.label);
        const text = msg?.label ?? (messageEdges.has(edge.id) ? undefined : es.label);
        if (!text) return null;
        const [a, b] = edgeGeom(edge.id);
        const mid = lerp(a, b, 0.5);
        return (
          <Chip
            key={edge.id}
            x={mid.x}
            y={mid.y}
            text={text}
            toneClass={msg ? MESSAGE_TONE[msg.kind ?? "request"].chip : undefined}
          />
        );
      })}
      {/* Messages */}
      <g key={animKey}>
        {state.messages.map((m, i) => {
          if (!scene.edges.some((e) => e.id === m.edge)) return null;
          const [p0, p1] = edgeGeom(m.edge);
          const [a, b] = m.reverse ? [p1, p0] : [p0, p1];
          const kind = MESSAGE_TONE[m.kind ?? "request"];
          const still = lerp(a, b, 0.7);
          return (
            <g key={i}>
              {reduceMotion ? (
                <circle cx={still.x} cy={still.y} r={5} className={kind.dot} />
              ) : (
                <>
                  <TravellingDot a={a} b={b} begin={i * 0.25} className={kind.dot} />
                  <ArrivalPulse at={b} begin={i * 0.25} className={kind.dot} />
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* Badges on top of everything */}
      {order.map((node) => {
        const ns = state.nodes[node.id];
        if (!ns.badge) return null;
        const { g, side } = geo.get(node.id)!;
        const [tt] = rhombus(g, side, ISO_H);
        const top = { x: g.x, y: g.y - ISO_H };
        return (
          <g key={node.id}>
            <g>
              <rect
                x={top.x - (ns.badge.length * 6.4 + 14) / 2}
                y={tt.y - 24}
                width={ns.badge.length * 6.4 + 14}
                height={18}
                rx={9}
                className={BADGE_TONE[ns.tone]}
              />
              <text
                x={top.x}
                y={tt.y - 11.5}
                textAnchor="middle"
                className="text-[10px] font-bold fill-white tracking-wider"
                style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
              >
                {ns.badge}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
