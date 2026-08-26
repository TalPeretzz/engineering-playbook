import type { Topic } from "@engineering-playbook/content-schema";
import { bloomFilter } from "./topics/bloom-filter";
import { lruCache } from "./topics/lru-cache";
import { consistentHashing } from "./topics/consistent-hashing";
import { rateLimiter } from "./topics/rate-limiter";
import { idempotency } from "./topics/idempotency";

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
