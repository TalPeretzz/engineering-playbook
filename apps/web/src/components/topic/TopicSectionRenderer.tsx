import React from "react";
import type { Section, RichParagraph } from "@engineering-playbook/content-schema";
import { ComplexityTable } from "./ComplexityTable";
import { TradeoffList } from "./TradeoffList";
import { SectionHeading } from "./SectionHeading";
import { StepVisual } from "./StepVisual";
import { CollapsibleSection } from "./CollapsibleSection";

type Props = {
  section: Section;
  onFirstInteraction?: () => void;
};

export function TopicSectionRenderer({ section, onFirstInteraction }: Props) {
  const inner = renderInner(section, onFirstInteraction);

  if (section.collapsible) {
    return (
      <CollapsibleSection id={section.id} heading={section.heading} defaultOpen={false}>
        {inner}
      </CollapsibleSection>
    );
  }

  return (
    <section id={section.id} className="scroll-mt-20 space-y-4">
      <SectionHeading>{section.heading}</SectionHeading>
      {inner}
    </section>
  );
}

function renderInner(section: Section, onFirstInteraction?: () => void) {
  switch (section.type) {
    case "text":
      return <RichTextRenderer body={section.body} />;

    case "visual":
      return section.steps ? (
        <StepVisual steps={section.steps} onFirstStep={onFirstInteraction} />
      ) : (
        <pre className="bg-surface-overlay border border-zinc-800 rounded-lg p-4 text-zinc-300 text-sm overflow-x-auto leading-relaxed font-mono">
          {section.content}
        </pre>
      );

    case "complexity":
      return <ComplexityTable entries={section.entries} />;

    case "tradeoffs":
      return <TradeoffList tradeoffs={{ pros: section.pros, cons: section.cons }} />;

    case "use-cases":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">When to use</p>
            <ul className="space-y-2">
              {section.whenToUse.map((item, i) => (
                <li key={i} className="flex gap-2 text-zinc-300 text-sm">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">When NOT to use</p>
            <ul className="space-y-2">
              {section.whenNotToUse.map((item, i) => (
                <li key={i} className="flex gap-2 text-zinc-300 text-sm">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "comparison":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-700">
                {section.columns.map((col) => (
                  <th key={col} className="text-left py-2 pr-4 text-zinc-400 font-medium first:text-zinc-300">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-surface-overlay transition-colors">
                  {section.columns.map((col) => (
                    <td key={col} className="py-2.5 pr-4 text-zinc-300 text-sm first:font-medium first:text-zinc-200">
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function RichTextRenderer({ body }: { body: RichParagraph[] }) {
  return (
    <div className="space-y-3">
      {body.map((node, i) => {
        switch (node.type) {
          case "heading":
            return node.level === 2 ? (
              <h2 key={i} className="text-lg font-semibold text-zinc-200 mt-6 first:mt-0">
                {node.text}
              </h2>
            ) : (
              <h3 key={i} className="text-base font-semibold text-zinc-300 mt-4 first:mt-0">
                {node.text}
              </h3>
            );
          case "list":
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {node.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-zinc-300 text-sm leading-relaxed">
                    <span className="text-zinc-600 shrink-0 mt-1">•</span>
                    <InlineBold text={item} />
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre
                key={i}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-300 text-sm overflow-x-auto leading-relaxed font-mono whitespace-pre"
              >
                {node.code}
              </pre>
            );
          case "p":
          default:
            return (
              <p key={i} className="text-zinc-300 text-sm leading-7">
                <InlineBold text={(node as { text: string }).text} />
              </p>
            );
        }
      })}
    </div>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-zinc-100 font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
