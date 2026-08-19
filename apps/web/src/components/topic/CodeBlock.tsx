"use client";

import React, { useState } from "react";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";

type CodeBlockProps = {
  code: string;
  language: ProgrammingLanguage;
  label?: string;
};

const LANG_LABELS: Record<ProgrammingLanguage, string> = {
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
};

export function CodeBlock({ code, language, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">{label ?? LANG_LABELS[language]}</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-[#0d1117] text-sm leading-relaxed">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}
