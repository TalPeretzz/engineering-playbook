import React from "react";

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-ink mb-4 flex items-center gap-3">
      <span className="w-1 h-5 bg-brand rounded-full shrink-0" aria-hidden="true" />
      {children}
    </h2>
  );
}
