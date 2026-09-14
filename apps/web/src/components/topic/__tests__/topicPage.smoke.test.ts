import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { topicsBySlug, definitionsBySlug } from "@engineering-playbook/content";
import { TopicPage } from "../TopicPage";
import { TopicPageComingSoon } from "../TopicPageComingSoon";
import { LanguageProvider } from "@/hooks/useLanguage";

function renderTopicPage(topic: Parameters<typeof TopicPage>[0]["topic"]): string {
  return renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(TopicPage, { topic }))
  );
}

describe("TopicPage smoke test", () => {
  it("renders every Bloom Filter section id", () => {
    const topic = topicsBySlug["bloom-filter"];
    const html = renderTopicPage(topic);
    for (const section of topic.sections) {
      expect(html, `missing section id="${section.id}"`).toContain(`id="${section.id}"`);
    }
  });

  it("renders every LRU Cache section id, including the interactive lru-visual section", () => {
    const topic = topicsBySlug["lru-cache"];
    const html = renderTopicPage(topic);
    for (const section of topic.sections) {
      expect(html, `missing section id="${section.id}"`).toContain(`id="${section.id}"`);
    }
    const visualSection = topic.sections.find((s) => s.type === "lru-visual");
    expect(visualSection).toBeDefined();
    // LruCacheVisual's sr-only live region — a marker that the interactive component itself mounted.
    expect(html).toContain('role="status"');
  });

  it("renders challenges for an available topic", () => {
    const topic = topicsBySlug["bloom-filter"];
    const html = renderTopicPage(topic);
    expect(html).toContain('id="challenges"');
  });
});

describe("TopicPageComingSoon smoke test", () => {
  it("renders a coming-soon topic without any challenge markup", () => {
    const topic = definitionsBySlug["trie"];
    expect(topic.availability).toBe("coming-soon");
    const html = renderToStaticMarkup(createElement(TopicPageComingSoon, { topic }));
    expect(html).toContain(topic.title);
    expect(html.toLowerCase()).toContain("coming soon");
    expect(html).not.toContain('id="challenges"');
  });
});
