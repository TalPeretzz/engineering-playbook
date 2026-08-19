import React from "react";
import type { ComplexityEntry } from "@engineering-playbook/content-schema";

type ComplexityTableProps = {
  entries: ComplexityEntry[];
};

export function ComplexityTable({ entries }: ComplexityTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Operation</th>
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Time</th>
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Space</th>
            <th className="text-left py-2 text-zinc-400 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-surface-overlay transition-colors">
              <td className="py-2.5 pr-4 text-zinc-200 font-mono text-xs">{entry.operation}</td>
              <td className="py-2.5 pr-4">
                <span className="text-emerald-400 font-mono text-xs font-medium">{entry.time}</span>
              </td>
              <td className="py-2.5 pr-4">
                {entry.space && (
                  <span className="text-sky-400 font-mono text-xs font-medium">{entry.space}</span>
                )}
              </td>
              <td className="py-2.5 text-zinc-500 text-xs">{entry.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
