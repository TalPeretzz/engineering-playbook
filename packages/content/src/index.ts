import type { Topic } from "@engineering-playbook/content-schema";
import { bloomFilter } from "./bloom-filter";
import { lruCache } from "./lru-cache";
import { consistentHashing } from "./consistent-hashing";
import { rateLimiter } from "./rate-limiter";
import { idempotency } from "./idempotency";

export { bloomFilter, lruCache, consistentHashing, rateLimiter, idempotency };

export const allTopics: Topic[] = [
  bloomFilter,
  lruCache,
  consistentHashing,
  rateLimiter,
  idempotency,
];

export const topicsBySlug: Record<string, Topic> = Object.fromEntries(
  allTopics.map((t) => [t.slug, t])
);
