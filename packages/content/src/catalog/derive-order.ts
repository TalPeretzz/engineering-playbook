import type { Curriculum } from "@engineering-playbook/content-schema";

/**
 * Walks areaOrder -> categoriesInArea -> topicsInCategory and returns the global
 * reading order. Multi-category topics are deduped to their first (primary)
 * occurrence, encountered in area/category order.
 */
export function deriveTopicOrder(curriculum: Curriculum): string[] {
  if (curriculum.topicOrderOverride) return curriculum.topicOrderOverride;

  const order: string[] = [];
  const seen = new Set<string>();

  for (const areaId of curriculum.areaOrder) {
    const categoryIds = curriculum.categoriesInArea[areaId] ?? [];
    for (const categoryId of categoryIds) {
      const topicIds = curriculum.topicsInCategory[categoryId] ?? [];
      for (const topicId of topicIds) {
        if (seen.has(topicId)) continue;
        seen.add(topicId);
        order.push(topicId);
      }
    }
  }

  return order;
}
