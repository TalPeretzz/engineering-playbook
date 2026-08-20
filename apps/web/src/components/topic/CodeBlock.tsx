"use client";

import React, { useState } from "react";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import { useLanguage } from "@/hooks/useLanguage";

const LANG_LABELS: Record<ProgrammingLanguage, string> = {
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
};

const LANG_ORDER: ProgrammingLanguage[] = ["typescript", "python", "java"];

type CodeBlockProps =
  | { implementations: Partial<Record<ProgrammingLanguage, string>>; code?: never; language?: never; label?: string }
  | { code: string; language: ProgrammingLanguage; implementations?: never; label?: string };

export function CodeBlock(props: CodeBlockProps) {
  const { language: globalLang, setLanguage } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (props.implementations !== undefined) {
    const impls = props.implementations;
    const available = LANG_ORDER.filter((l) => impls[l]);
    const activeLang = impls[globalLang] ? globalLang : (available[0] ?? "typescript");
    const code = impls[activeLang] ?? "";

    return (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-0 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center">
            {available.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors ${
                  activeLang === lang
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleCopy(code)}
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

  const { code, language, label } = props;
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400">{label ?? LANG_LABELS[language]}</span>
        <button
          onClick={() => handleCopy(code)}
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
