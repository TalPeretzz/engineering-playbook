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
  | {
      implementations: Partial<Record<ProgrammingLanguage, string>>;
      code?: never;
      language?: never;
      label?: string;
    }
  | { code: string; language: ProgrammingLanguage; implementations?: never; label?: string };

type CopyStatus = "idle" | "copied" | "failed";

function useCopyToClipboard() {
  const [status, setStatus] = useState<CopyStatus>("idle");

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  return { status, copy };
}

function CopyButton({ status, onCopy }: { status: CopyStatus; onCopy: () => void }) {
  return (
    <>
      <button
        onClick={onCopy}
        className="text-xs text-ink-faint hover:text-ink-muted transition-colors px-2 py-1 rounded hover:bg-surface-overlay cursor-pointer"
      >
        {status === "copied" ? "Copied!" : status === "failed" ? "Copy failed" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "copied"
          ? "Code copied to clipboard"
          : status === "failed"
            ? "Copy failed"
            : ""}
      </span>
    </>
  );
}

export function CodeBlock(props: CodeBlockProps) {
  const { language: globalLang, setLanguage } = useLanguage();
  const { status, copy } = useCopyToClipboard();

  if (props.implementations !== undefined) {
    const impls = props.implementations;
    const available = LANG_ORDER.filter((l) => impls[l]);
    const activeLang = impls[globalLang] ? globalLang : (available[0] ?? "typescript");
    const code = impls[activeLang] ?? "";

    function focusTab(lang: ProgrammingLanguage) {
      document.getElementById(`code-tab-${lang}`)?.focus();
    }

    function handleTabKeyDown(e: React.KeyboardEvent, index: number) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      let nextIndex = index;
      if (e.key === "ArrowLeft") nextIndex = (index - 1 + available.length) % available.length;
      if (e.key === "ArrowRight") nextIndex = (index + 1) % available.length;
      if (e.key === "Home") nextIndex = 0;
      if (e.key === "End") nextIndex = available.length - 1;
      const nextLang = available[nextIndex];
      setLanguage(nextLang);
      focusTab(nextLang);
    }

    return (
      <div className="rounded-lg border border-wire overflow-hidden">
        <div className="flex items-center justify-between px-4 py-0 bg-surface-raised border-b border-wire">
          <div role="tablist" aria-label="Programming language" className="flex items-center">
            {available.map((lang, i) => (
              <button
                key={lang}
                id={`code-tab-${lang}`}
                role="tab"
                aria-selected={activeLang === lang}
                aria-controls={`code-panel-${lang}`}
                tabIndex={activeLang === lang ? 0 : -1}
                onClick={() => setLanguage(lang)}
                onKeyDown={(e) => handleTabKeyDown(e, i)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors cursor-pointer ${
                  activeLang === lang
                    ? "border-brand text-brand-text"
                    : "border-transparent text-ink-faint hover:text-ink-muted"
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
          <CopyButton status={status} onCopy={() => copy(code)} />
        </div>
        <pre
          id={`code-panel-${activeLang}`}
          role="tabpanel"
          aria-labelledby={`code-tab-${activeLang}`}
          className="p-4 overflow-x-auto bg-surface-code text-sm leading-relaxed"
        >
          <code className="text-ink-muted font-mono">{code}</code>
        </pre>
      </div>
    );
  }

  const { code, language, label } = props;
  return (
    <div className="rounded-lg border border-wire overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-wire">
        <span className="text-xs font-medium text-ink-muted">{label ?? LANG_LABELS[language]}</span>
        <CopyButton status={status} onCopy={() => copy(code)} />
      </div>
      <pre className="p-4 overflow-x-auto bg-surface-code text-sm leading-relaxed">
        <code className="text-ink-muted font-mono">{code}</code>
      </pre>
    </div>
  );
}
