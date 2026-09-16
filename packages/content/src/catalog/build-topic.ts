import type { Topic, TopicDefinition } from "@engineering-playbook/content-schema";

/** Builds the legacy `Topic` view model consumed by existing components from a `TopicDefinition`. */
export function buildTopic(definition: TopicDefinition): Topic {
  const lesson = definition.lesson;

  return {
    id: definition.id,
    slug: definition.slug,
    title: definition.title,
    description: definition.summary,
    categories: definition.categories,
    difficulty: definition.difficulty,
    estimatedMinutes: definition.estimatedMinutes,
    prerequisites: definition.prerequisites,
    implementations: lesson?.implementations ?? {},
    sections: lesson?.sections ?? [],
    challenges: lesson?.challenges ?? [],
  };
}
