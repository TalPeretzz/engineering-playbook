import React from "react";

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-3">
      <span className="w-1 h-5 bg-emerald-500 rounded-full shrink-0" />
      {children}
    </h2>
  );
}
