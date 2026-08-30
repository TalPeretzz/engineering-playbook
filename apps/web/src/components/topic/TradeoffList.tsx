import React from "react";

type TradeoffListProps = {
  tradeoffs: { pros: string[]; cons: string[] };
};

export function TradeoffList({ tradeoffs }: TradeoffListProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-4">
        <p className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">Advantages</p>
        <ul className="space-y-2">
          {tradeoffs.pros.map((pro, i) => (
            <li key={i} className="flex gap-2 text-ink-muted text-sm">
              <span className="text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" aria-hidden="true">+</span>
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">Disadvantages</p>
        <ul className="space-y-2">
          {tradeoffs.cons.map((con, i) => (
            <li key={i} className="flex gap-2 text-ink-muted text-sm">
              <span className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" aria-hidden="true">−</span>
              <span>{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
