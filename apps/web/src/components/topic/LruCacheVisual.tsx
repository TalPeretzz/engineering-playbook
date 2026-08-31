"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Entry = { key: string; value: string };

type OpResult =
  | { kind: "insert"; key: string; value: string }
  | { kind: "update"; key: string; value: string }
  | { kind: "evict"; key: string; value: string; evictedKey: string }
  | { kind: "hit"; key: string; returned: string }
  | { kind: "miss"; key: string };

type Snapshot = {
  entries: Entry[]; // MRU first (index 0 = MRU)
  opLabel: string;
  description: string;
  result: OpResult | null;
  capacity: number;
};

// ─── LRU simulation ──────────────────────────────────────────────────────────

function simulateLRU(
  entries: Entry[],
  capacity: number,
  op: { type: "put"; key: string; value: string } | { type: "get"; key: string }
): { next: Entry[]; result: OpResult } {
  const next = [...entries];

  if (op.type === "get") {
    const idx = next.findIndex((e) => e.key === op.key);
    if (idx === -1) return { next, result: { kind: "miss", key: op.key } };
    const [node] = next.splice(idx, 1);
    next.unshift(node);
    return { next, result: { kind: "hit", key: op.key, returned: node.value } };
  }

  // put
  const idx = next.findIndex((e) => e.key === op.key);
  if (idx !== -1) {
    const [node] = next.splice(idx, 1);
    node.value = op.value;
    next.unshift(node);
    return { next, result: { kind: "update", key: op.key, value: op.value } };
  }

  let evictedKey: string | undefined;
  if (next.length >= capacity) {
    evictedKey = next[next.length - 1].key;
    next.pop();
  }
  next.unshift({ key: op.key, value: op.value });

  if (evictedKey !== undefined) {
    return {
      next,
      result: { kind: "evict", key: op.key, value: op.value, evictedKey },
    };
  }
  return { next, result: { kind: "insert", key: op.key, value: op.value } };
}

// ─── Example sequence ─────────────────────────────────────────────────────────

type ExampleOp =
  | { type: "put"; key: string; value: string }
  | { type: "get"; key: string };

const EXAMPLE_CAPACITY = 3;

const EXAMPLE_OPS: ExampleOp[] = [
  { type: "put", key: "A", value: "1" },
  { type: "put", key: "B", value: "2" },
  { type: "put", key: "C", value: "3" },
  { type: "get", key: "A" },
  { type: "put", key: "D", value: "4" },
  { type: "get", key: "B" },
];

function buildSnapshots(ops: ExampleOp[], capacity: number): Snapshot[] {
  const snapshots: Snapshot[] = [
    {
      entries: [],
      opLabel: "Initial state",
      description: `Empty cache. Capacity: ${capacity}. Use Next to step through the example, or enter your own operations below.`,
      result: null,
      capacity,
    },
  ];

  let current: Entry[] = [];
  for (const op of ops) {
    const { next, result } = simulateLRU(current, capacity, op);
    current = next;

    const opLabel =
      op.type === "put" ? `put("${op.key}", ${op.value})` : `get("${op.key}")`;
    let description = "";

    switch (result.kind) {
      case "insert":
        description = `"${result.key}" added with value ${result.value}. Cache: ${current.length}/${capacity}.`;
        break;
      case "update":
        description = `"${result.key}" already cached. Value updated to ${result.value} and promoted to MRU.`;
        break;
      case "evict":
        description = `Cache full. "${result.evictedKey}" (LRU) evicted. "${result.key}" inserted as MRU.`;
        break;
      case "hit":
        description = `Cache hit! "${result.key}" found. Returns ${result.returned}. Promoted to MRU.`;
        break;
      case "miss":
        description = `Cache miss. "${result.key}" is not in the cache. Returns −1.`;
        break;
    }

    snapshots.push({ entries: current, opLabel, description, result, capacity });
  }

  return snapshots;
}

const SNAPSHOTS = buildSnapshots(EXAMPLE_OPS, EXAMPLE_CAPACITY);

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: OpResult }) {
  const config = {
    hit: { label: "HIT", cls: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50" },
    miss: { label: "MISS", cls: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/50" },
    insert: { label: "INSERTED", cls: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700/50" },
    update: { label: "UPDATED", cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50" },
    evict: { label: "EVICTED", cls: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50" },
  };
  const { label, cls } = config[result.kind];
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

function LinkedListNode({
  entry,
  isMru,
  isLru,
  isHighlight,
  isEvicted,
  reduceMotion,
}: {
  entry: Entry;
  isMru: boolean;
  isLru: boolean;
  isHighlight: boolean;
  isEvicted: boolean;
  reduceMotion: boolean;
}) {
  const anim = reduceMotion ? "" : "transition-all duration-300";
  return (
    <div
      className={`flex flex-col items-center ${anim} ${isEvicted ? "opacity-30" : ""}`}
    >
      {isMru && (
        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
          MRU
        </span>
      )}
      {isLru && (
        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
          LRU
        </span>
      )}
      {!isMru && !isLru && <span className="text-[9px] mb-1 opacity-0">·</span>}
      <div
        className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 text-xs font-mono font-bold ${anim} ${
          isHighlight
            ? "border-brand bg-emerald-50 dark:bg-emerald-950/40 text-ink scale-110 shadow-md"
            : isEvicted
            ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
            : "border-wire-strong bg-surface-raised text-ink"
        }`}
        aria-label={`Key ${entry.key}, value ${entry.value}${isMru ? " (most recently used)" : ""}${isLru ? " (least recently used)" : ""}`}
      >
        <span className="text-[10px] text-ink-faint font-normal leading-none mb-0.5">
          key
        </span>
        <span className="text-sm leading-none">{entry.key}</span>
        <span className="text-[10px] text-ink-faint font-normal leading-none mt-0.5">
          val={entry.value}
        </span>
      </div>
    </div>
  );
}

function Arrow({ double = true }: { double?: boolean }) {
  return (
    <div className="flex items-center self-center mt-6 text-ink-faint text-sm select-none" aria-hidden="true">
      {double ? "↔" : "→"}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LruCacheVisual() {
  const [stepIndex, setStepIndex] = useState(0);
  const [liveEntries, setLiveEntries] = useState<Entry[]>([]);
  const [liveCapacity, setLiveCapacity] = useState(EXAMPLE_CAPACITY);
  const [liveResult, setLiveResult] = useState<OpResult | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [mode, setMode] = useState<"example" | "manual">("example");
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [capacityInput, setCapacityInput] = useState(String(EXAMPLE_CAPACITY));

  const keyRef = useRef<HTMLInputElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const snapshot = SNAPSHOTS[stepIndex];

  const entries = mode === "example" ? snapshot.entries : liveEntries;
  const capacity = mode === "example" ? EXAMPLE_CAPACITY : liveCapacity;
  const displayResult = mode === "example" ? snapshot.result : liveResult;
  const displayMessage = mode === "example" ? snapshot.description : liveMessage;
  const displayLabel = mode === "example" ? snapshot.opLabel : "";

  // Determine highlight/evict key from result
  let highlightKey: string | null = null;
  let evictedKey: string | null = null;
  if (displayResult) {
    highlightKey = displayResult.key;
    if (displayResult.kind === "evict") evictedKey = displayResult.evictedKey;
  }

  const handleGet = useCallback(() => {
    const key = keyInput.trim();
    if (!key) { setInputError("Key is required"); return; }
    setInputError("");
    const { next, result } = simulateLRU(liveEntries, liveCapacity, { type: "get", key });
    setLiveEntries(next);
    setLiveResult(result);
    setLiveMessage(
      result.kind === "hit"
        ? `Cache hit! "${key}" found. Returns ${result.returned}. Promoted to MRU.`
        : `Cache miss. "${key}" is not in the cache. Returns −1.`
    );
    setMode("manual");
  }, [keyInput, liveEntries, liveCapacity]);

  const handlePut = useCallback(() => {
    const key = keyInput.trim();
    const value = valueInput.trim() || "?";
    if (!key) { setInputError("Key is required"); return; }
    setInputError("");
    const { next, result } = simulateLRU(liveEntries, liveCapacity, {
      type: "put",
      key,
      value,
    });
    setLiveEntries(next);
    setLiveResult(result);
    setLiveMessage(
      result.kind === "update"
        ? `"${key}" already cached. Value updated to ${value} and promoted to MRU.`
        : result.kind === "evict"
        ? `Cache full. "${result.evictedKey}" (LRU) evicted. "${key}" inserted as MRU.`
        : `"${key}" added with value ${value}. Cache: ${next.length}/${liveCapacity}.`
    );
    setMode("manual");
    setKeyInput("");
    setValueInput("");
    keyRef.current?.focus();
  }, [keyInput, valueInput, liveEntries, liveCapacity]);

  const [capacityError, setCapacityError] = useState("");

  const commitCapacity = useCallback(() => {
    const raw = capacityInput.trim();
    const n = Number(raw);
    if (raw === "" || !Number.isInteger(n) || n <= 0) {
      const msg = "Capacity must be a positive integer.";
      setCapacityError(msg);
      setLiveMessage(`${msg} Cache unchanged (still ${liveCapacity}).`);
      setMode("manual");
      return;
    }
    setCapacityError("");
    if (n === liveCapacity) return;
    setLiveCapacity(n);
    setLiveEntries([]);
    setLiveResult(null);
    setLiveMessage(`Capacity set to ${n}. Cache cleared.`);
    setMode("manual");
  }, [capacityInput, liveCapacity]);

  const handleReset = useCallback(() => {
    setLiveEntries([]);
    setLiveResult(null);
    setLiveMessage(`Cache cleared. Capacity: ${liveCapacity}.`);
    setMode("manual");
    setKeyInput("");
    setValueInput("");
    setInputError("");
    setCapacityInput(String(liveCapacity));
    setCapacityError("");
  }, [liveCapacity]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handlePut();
    },
    [handlePut]
  );

  const handleCapacityKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitCapacity();
      }
    },
    [commitCapacity]
  );

  return (
    <div className="rounded-xl border border-wire bg-surface-raised overflow-hidden">
      {/* Screen-reader live region for operation announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {displayMessage}
      </div>

      {/* Operation log */}
      <div className="px-4 py-3 border-b border-wire bg-surface-overlay min-h-[72px] flex flex-col justify-center gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          {displayLabel && (
            <code className="text-xs font-mono font-semibold text-brand-text bg-surface-code px-2 py-0.5 rounded border border-wire">
              {displayLabel}
            </code>
          )}
          {displayResult && <ResultBadge result={displayResult} />}
          {displayResult?.kind === "hit" && (
            <span className="text-xs text-ink-muted font-mono">
              → returns <strong className="text-ink">{displayResult.returned}</strong>
            </span>
          )}
          {displayResult?.kind === "miss" && (
            <span className="text-xs text-ink-muted font-mono">
              → returns <strong className="text-red-600 dark:text-red-400">−1</strong>
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">{displayMessage || "Step through the example or enter your own operations."}</p>
      </div>

      {/* Visualization */}
      <div className="p-4 sm:p-6">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Hash map */}
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-3">
              Hash Map
            </p>
            <div className="rounded-lg border border-wire overflow-hidden">
              {entries.length === 0 ? (
                <div className="px-3 py-3 text-xs text-ink-faint text-center italic">
                  empty
                </div>
              ) : (
                <table className="w-full text-xs font-mono" aria-label="Hash map contents">
                  <thead>
                    <tr className="border-b border-wire bg-surface-overlay">
                      <th className="text-left px-3 py-1.5 text-ink-faint font-medium">key</th>
                      <th className="text-left px-3 py-1.5 text-ink-faint font-medium">→ node</th>
                      <th className="text-left px-3 py-1.5 text-ink-faint font-medium">value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr
                        key={e.key}
                        className={`border-b border-wire/50 transition-colors ${
                          e.key === highlightKey
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : e.key === evictedKey
                            ? "bg-red-50 dark:bg-red-950/20 opacity-50"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 font-bold text-ink">{e.key}</td>
                        <td className="px-3 py-1.5 text-ink-faint">
                          node_{e.key}
                        </td>
                        <td className="px-3 py-1.5 text-ink-muted">{e.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Linked list */}
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-3">
              Linked List (MRU → LRU)
            </p>
            {entries.length === 0 ? (
              <div className="flex items-center justify-center h-20 rounded-lg border border-wire text-xs text-ink-faint italic">
                empty
              </div>
            ) : (
              <div
                className="flex items-start gap-1 flex-wrap overflow-x-auto pb-1"
                role="list"
                aria-label="Linked list from MRU to LRU"
              >
                {entries.map((e, i) => (
                  <React.Fragment key={e.key}>
                    <LinkedListNode
                      entry={e}
                      isMru={i === 0}
                      isLru={i === entries.length - 1}
                      isHighlight={e.key === highlightKey && displayResult?.kind !== "miss"}
                      isEvicted={e.key === evictedKey}
                      reduceMotion={reduceMotion}
                    />
                    {i < entries.length - 1 && <Arrow />}
                  </React.Fragment>
                ))}
              </div>
            )}
            <p className="text-[10px] text-ink-faint mt-2">
              {entries.length}/{capacity} entries
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-wire px-4 py-4 bg-surface space-y-3">
        {/* Manual operations */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="lru-key" className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">
              Key
            </label>
            <input
              id="lru-key"
              ref={keyRef}
              type="text"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); if (inputError) setInputError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. A"
              maxLength={8}
              className="w-20 bg-surface-overlay border border-wire rounded px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-brand"
              aria-label="Cache key"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lru-value" className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">
              Value
            </label>
            <input
              id="lru-value"
              type="text"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 42"
              maxLength={8}
              className="w-20 bg-surface-overlay border border-wire rounded px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-brand"
              aria-label="Cache value"
            />
          </div>
          <button
            onClick={handleGet}
            disabled={!keyInput.trim()}
            className="text-xs px-3 py-1.5 rounded border border-wire bg-surface-overlay text-ink hover:border-wire-strong hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Get
          </button>
          <button
            onClick={handlePut}
            disabled={!keyInput.trim()}
            className="text-xs px-3 py-1.5 rounded bg-brand text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-medium"
          >
            Put
          </button>

          <div className="flex items-end gap-2 ml-auto">
            <div className="flex flex-col gap-1">
              <label htmlFor="lru-cap" className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">
                Capacity
              </label>
              <input
                id="lru-cap"
                type="number"
                inputMode="numeric"
                min={1}
                max={8}
                step={1}
                value={capacityInput}
                onChange={(e) => { setCapacityInput(e.target.value); if (capacityError) setCapacityError(""); }}
                onBlur={commitCapacity}
                onKeyDown={handleCapacityKeyDown}
                aria-invalid={capacityError ? true : undefined}
                aria-describedby={capacityError ? "lru-cap-error" : undefined}
                className={`w-16 bg-surface-overlay border rounded px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-brand ${
                  capacityError ? "border-red-500 dark:border-red-600" : "border-wire"
                }`}
                aria-label="Cache capacity (positive integer)"
              />
            </div>
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Reset
            </button>
          </div>
        </div>

        {(inputError || capacityError) && (
          <div className="space-y-1">
            {inputError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {inputError}
              </p>
            )}
            {capacityError && (
              <p id="lru-cap-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
                {capacityError} <span className="text-ink-faint">Value shown was not applied.</span>
              </p>
            )}
          </div>
        )}

        {/* Example navigation */}
        <div className="flex items-center gap-2 border-t border-wire pt-3">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest mr-1">
            Example
          </span>
          <button
            onClick={() => { setStepIndex((s) => Math.max(0, s - 1)); setMode("example"); }}
            disabled={stepIndex === 0}
            className="text-xs px-2.5 py-1 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Previous example step"
          >
            ← Prev
          </button>
          <span className="text-xs text-ink-muted tabular-nums">
            {stepIndex + 1} / {SNAPSHOTS.length}
          </span>
          <button
            onClick={() => { setStepIndex((s) => Math.min(SNAPSHOTS.length - 1, s + 1)); setMode("example"); }}
            disabled={stepIndex === SNAPSHOTS.length - 1}
            className="text-xs px-2.5 py-1 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Next example step"
          >
            Next →
          </button>
          {mode === "manual" && (
            <button
              onClick={() => { setStepIndex(0); setMode("example"); }}
              className="text-xs px-2.5 py-1 rounded border border-wire text-ink-faint hover:text-ink-muted hover:border-wire-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ml-1"
            >
              Back to example
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
