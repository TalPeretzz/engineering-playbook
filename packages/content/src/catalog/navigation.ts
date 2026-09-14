import type { TopicDefinition } from "@engineering-playbook/content-schema";

/** Next `available` topic id after `currentId` in `order`, skipping coming-soon ones. Never returns `currentId`. */
export function nextAvailableFrom(
  currentId: string,
  order: string[],
  topicsById: Record<string, TopicDefinition>
): string | null {
  const i = order.indexOf(currentId);
  if (i === -1) return null;
  for (let j = i + 1; j < order.length; j++) {
    const candidate = topicsById[order[j]];
    if (candidate?.availability === "available") return candidate.id;
  }
  return null;
}

/** Previous `available` topic id before `currentId` in `order`, skipping coming-soon ones. Never returns `currentId`. */
export function prevAvailableFrom(
  currentId: string,
  order: string[],
  topicsById: Record<string, TopicDefinition>
): string | null {
  const i = order.indexOf(currentId);
  if (i === -1) return null;
  for (let j = i - 1; j >= 0; j--) {
    const candidate = topicsById[order[j]];
    if (candidate?.availability === "available") return candidate.id;
  }
  return null;
}
