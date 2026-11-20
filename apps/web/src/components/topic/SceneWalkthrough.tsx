"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SceneMessageKind,
  SceneSection,
  SceneStage,
} from "@engineering-playbook/content-schema";
import { clampStep, resolveSceneStep } from "@/utils/sceneState";
import { FlatCanvas, IsoCanvas, MESSAGE_TONE } from "./SceneCanvas";

type SceneView = "flat" | "iso";
const VIEW_PARAM = "view";
const VIEW_STORAGE_KEY = "ep-scene-view";

const AUTOPLAY_MS = 7000;

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
  const [view, setView] = useState<SceneView>("flat");
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const firstStepFired = useRef(false);

  const state = useMemo(() => resolveSceneStep(scene, stepIndex), [scene, stepIndex]);
  const last = scene.steps.length - 1;
  const stepParam = scene.id;

  // Deep link: ?<sceneId>=<1-based step>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let initialView = params.get(VIEW_PARAM);
    if (initialView !== "iso" && initialView !== "flat") {
      try {
        initialView = window.localStorage.getItem(VIEW_STORAGE_KEY);
      } catch {
        initialView = null;
      }
    }
    if (initialView === "iso" || initialView === "flat") setView(initialView);

    const raw = params.get(stepParam);
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

  const changeView = (next: SceneView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode, embedded contexts) — the toggle still works.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(VIEW_PARAM, next);
    window.history.replaceState(window.history.state, "", url);
  };

  // Restart message animations whenever the step, view or replay changes.
  useEffect(() => {
    svgRef.current?.setCurrentTime?.(0);
  }, [stepIndex, replayKey, view]);

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

  const step = state.step;
  const stage = STAGE_STYLE[step.stage];
  const usedKinds = Array.from(new Set(state.messages.map((m) => m.kind ?? "request")));
  const canvasLabel = `Diagram for step ${stepIndex + 1}: ${step.title}`;

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
        {view === "iso" ? (
          <IsoCanvas
            scene={scene}
            state={state}
            reduceMotion={reduceMotion}
            animKey={`${stepIndex}-${replayKey}`}
            svgRef={svgRef}
            ariaLabel={canvasLabel}
          />
        ) : (
          <FlatCanvas
            scene={scene}
            state={state}
            reduceMotion={reduceMotion}
            animKey={`${stepIndex}-${replayKey}`}
            svgRef={svgRef}
            ariaLabel={canvasLabel}
          />
        )}

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
            <div
              role="radiogroup"
              aria-label="Diagram style"
              className="flex items-center rounded-md border border-wire p-0.5 mr-1"
            >
              {(
                [
                  ["flat", "2D"],
                  ["iso", "Isometric"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => changeView(v)}
                  className={`px-2 h-6 rounded text-[11px] font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    view === v ? "bg-surface-overlay text-ink" : "text-ink-faint hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
