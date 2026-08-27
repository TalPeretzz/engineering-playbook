"use client";

import React, { useState } from "react";

type Props = {
  id: string;
  heading: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ id, heading, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `${id}-content`;
  const toggleId = `${id}-toggle`;

  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-zinc-200">
        <button
          id={toggleId}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 group text-left py-0.5"
        >
          <span className="group-hover:text-zinc-100 transition-colors">{heading}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
              open ? "" : "-rotate-90"
            }`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h2>
      <div
        id={contentId}
        role="region"
        aria-labelledby={toggleId}
        className={open ? "mt-4 space-y-4" : "hidden"}
      >
        {children}
      </div>
    </section>
  );
}
