import type { CategoryDefinition } from "@engineering-playbook/content-schema";

export const categories: CategoryDefinition[] = [
  {
    id: "practical-data-structures",
    contentAreaId: "backend-systems",
    title: "Practical Data Structures",
    summary:
      "Data structures that come up constantly in real systems — probabilistic filters, caches, tries, and more.",
    order: 1,
  },
  {
    id: "distributed-systems",
    contentAreaId: "backend-systems",
    title: "Distributed Systems",
    summary:
      "Coordination, consistency, and resilience patterns for systems that span multiple nodes.",
    order: 2,
  },
  {
    id: "messaging",
    contentAreaId: "backend-systems",
    title: "Messaging",
    summary:
      "Patterns for reliable, ordered, and scalable communication between services via queues and streams.",
    order: 3,
  },
  {
    id: "caching",
    contentAreaId: "backend-systems",
    title: "Caching",
    summary: "Strategies for keeping hot data close to where it's read, and keeping it correct.",
    order: 4,
  },
  {
    id: "design-patterns",
    contentAreaId: "backend-systems",
    title: "Design Patterns",
    summary: "Classic object-oriented patterns that show up in backend codebases every day.",
    order: 5,
  },
];
