import type { Metadata } from "next";
import { LearningPathsIndex } from "@/components/learn/LearningPathsIndex";

export const metadata: Metadata = {
  title: "Learning Paths — Engineering Playbook",
  description: "Curated, ordered paths through the Engineering Playbook catalog.",
};

export default function LearnIndexRoute() {
  return <LearningPathsIndex />;
}
