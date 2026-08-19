import { notFound } from "next/navigation";
import { topicsBySlug } from "@engineering-playbook/content";
import { TopicPage } from "@/components/topic/TopicPage";
import type { Metadata } from "next";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  const { allTopics } = await import("@engineering-playbook/content");
  return allTopics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = topicsBySlug[params.slug];
  if (!topic) return {};
  return {
    title: `${topic.title} — Engineering Playbook`,
    description: topic.description,
  };
}

export default function TopicRoute({ params }: Props) {
  const topic = topicsBySlug[params.slug];
  if (!topic) notFound();
  return <TopicPage topic={topic} />;
}
