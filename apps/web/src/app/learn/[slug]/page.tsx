import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { learningPaths, topicsById } from "@engineering-playbook/content";
import { LearningPathPage } from "@/components/learn/LearningPathPage";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return learningPaths.map((path) => ({ slug: path.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = learningPaths.find((p) => p.slug === params.slug);
  if (!path) return {};
  return {
    title: `${path.title} — Engineering Playbook`,
    description: path.summary,
  };
}

export default function LearningPathRoute({ params }: Props) {
  const path = learningPaths.find((p) => p.slug === params.slug);
  if (!path) notFound();

  const topics = path.topicIds
    .map((id) => topicsById[id])
    .filter((t): t is TopicDefinition => Boolean(t));

  return <LearningPathPage path={path} topics={topics} />;
}
