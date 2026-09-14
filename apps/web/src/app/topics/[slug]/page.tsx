import { notFound } from "next/navigation";
import { topicsBySlug, definitionsBySlug } from "@engineering-playbook/content";
import { TopicPage } from "@/components/topic/TopicPage";
import { TopicPageComingSoon } from "@/components/topic/TopicPageComingSoon";
import type { Metadata } from "next";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  const { allTopicDefinitions } = await import("@engineering-playbook/content");
  return allTopicDefinitions.map((definition) => ({ slug: definition.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const definition = definitionsBySlug[params.slug];
  if (!definition) return {};
  return {
    title: `${definition.title} — Engineering Playbook`,
    description: definition.summary,
  };
}

export default function TopicRoute({ params }: Props) {
  const definition = definitionsBySlug[params.slug];
  if (!definition) notFound();

  if (definition.availability === "coming-soon") {
    return <TopicPageComingSoon topic={definition} />;
  }

  const topic = topicsBySlug[params.slug];
  if (!topic) notFound();
  return <TopicPage topic={topic} />;
}
