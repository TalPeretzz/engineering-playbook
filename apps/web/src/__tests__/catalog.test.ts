import { describe, it, expect } from "vitest";
import {
  allTopicDefinitions,
  categories,
  learningPaths,
  curriculum,
  derivedTopicOrder,
} from "@engineering-playbook/content";

const topicIds = new Set(allTopicDefinitions.map((t) => t.id));
const categoryIds = new Set(categories.map((c) => c.id));
const pathIds = new Set(learningPaths.map((p) => p.id));

describe("catalog integrity", () => {
  it("has no duplicate topic ids", () => {
    const ids = allTopicDefinitions.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate topic slugs", () => {
    const slugs = allTopicDefinitions.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every prerequisites[] entry references a real topic id", () => {
    for (const topic of allTopicDefinitions) {
      for (const prereqId of topic.prerequisites) {
        expect(topicIds.has(prereqId), `${topic.id} has unknown prerequisite "${prereqId}"`).toBe(
          true
        );
      }
    }
  });

  it("every relatedTopics[] entry references a real topic id", () => {
    for (const topic of allTopicDefinitions) {
      for (const relatedId of topic.relatedTopics) {
        expect(
          topicIds.has(relatedId),
          `${topic.id} has unknown related topic "${relatedId}"`
        ).toBe(true);
      }
    }
  });

  it("every topic's learningPaths[] entry references a real path id", () => {
    for (const topic of allTopicDefinitions) {
      for (const pathId of topic.learningPaths) {
        expect(pathIds.has(pathId), `${topic.id} references unknown path "${pathId}"`).toBe(true);
      }
    }
  });

  it("every learning path's topicIds[] references real topic ids", () => {
    for (const path of learningPaths) {
      for (const topicId of path.topicIds) {
        expect(
          topicIds.has(topicId),
          `path "${path.id}" references unknown topic "${topicId}"`
        ).toBe(true);
      }
    }
  });

  it("every topic's categories[] values are in the category registry", () => {
    for (const topic of allTopicDefinitions) {
      expect(topic.categories.length).toBeGreaterThan(0);
      for (const categoryId of topic.categories) {
        expect(
          categoryIds.has(categoryId),
          `${topic.id} has unknown category "${categoryId}"`
        ).toBe(true);
      }
    }
  });

  it("every category referenced by curriculum.topicsInCategory is in the registry", () => {
    for (const categoryId of Object.keys(curriculum.topicsInCategory)) {
      expect(categoryIds.has(categoryId)).toBe(true);
    }
  });

  it("derivedTopicOrder is a permutation of all topic ids — no missing, no extras, no duplicates", () => {
    expect(new Set(derivedTopicOrder).size).toBe(derivedTopicOrder.length);
    expect([...derivedTopicOrder].sort()).toEqual([...topicIds].sort());
  });

  it("coming-soon topics have no lesson", () => {
    for (const topic of allTopicDefinitions) {
      if (topic.availability === "coming-soon") {
        expect(topic.lesson, `${topic.id} is coming-soon but has a lesson`).toBeUndefined();
      }
    }
  });

  it("available topics have a lesson", () => {
    for (const topic of allTopicDefinitions) {
      if (topic.availability === "available") {
        expect(topic.lesson, `${topic.id} is available but has no lesson`).toBeDefined();
      }
    }
  });

  it("every available lesson has renderable sections and challenges", () => {
    for (const topic of allTopicDefinitions) {
      if (topic.availability !== "available") continue;

      expect(
        topic.lesson?.sections?.length,
        `${topic.id} must contain at least one rendered section`
      ).toBeGreaterThan(0);
      expect(
        topic.lesson?.challenges?.length,
        `${topic.id} must contain at least one challenge`
      ).toBeGreaterThan(0);
    }
  });

  it("has globally unique challenge ids and valid multiple-choice answers", () => {
    const challengeIds: string[] = [];

    for (const topic of allTopicDefinitions) {
      for (const challenge of topic.lesson?.challenges ?? []) {
        challengeIds.push(challenge.id);
        if (challenge.type === "multiple-choice") {
          expect(
            challenge.options.some((option) => option.id === challenge.correctOptionId),
            `${topic.id}/${challenge.id} has an invalid correct option`
          ).toBe(true);
        }
      }
    }

    expect(new Set(challengeIds).size).toBe(challengeIds.length);
  });

  it("has unique section ids within every lesson", () => {
    for (const topic of allTopicDefinitions) {
      const sectionIds = (topic.lesson?.sections ?? []).map((section) => section.id);
      expect(new Set(sectionIds).size, `${topic.id} contains duplicate section ids`).toBe(
        sectionIds.length
      );
    }
  });
});
