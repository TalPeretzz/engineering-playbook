import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";

const LANGUAGES: ProgrammingLanguage[] = ["typescript", "python", "java"];

/**
 * Initialize a per-language draft record from a challenge's starter code.
 * Each language gets its own slot so switching languages never loses prior edits.
 */
export function buildDraftRecord(
  starterCode: Partial<Record<ProgrammingLanguage, string>>
): Record<ProgrammingLanguage, string> {
  const fallback = starterCode.typescript ?? "";
  return Object.fromEntries(
    LANGUAGES.map((lang) => [lang, starterCode[lang] ?? fallback])
  ) as Record<ProgrammingLanguage, string>;
}

/**
 * Returns true when every required challenge in the list appears in completedIds.
 * Optional challenges (required: false) are ignored.
 * Returns false if there are no required challenges (nothing to fulfill).
 */
export function allRequiredCompleted(
  challenges: { id: string; required: boolean }[],
  completedIds: string[]
): boolean {
  const required = challenges.filter((c) => c.required);
  if (required.length === 0) return false;
  return required.every((c) => completedIds.includes(c.id));
}
