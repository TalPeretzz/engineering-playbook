import type { SystemDesignChallenge } from "@engineering-playbook/content-schema";

export const systemDesignChallenge: SystemDesignChallenge = {
  type: "system-design",
  id: "lru-cache-system-design",
  required: false,
  title: "Design an in-memory cache for a high-traffic API service",
  scenario: `You are designing a caching layer for a user-profile API that serves 50 million daily active users. Each profile is ~4 KB and takes 40 ms to load from PostgreSQL.

At peak load (600 K concurrent users), the database is overwhelmed. Your team has decided to add an in-memory cache in front of the database.

Design the cache layer. Consider:

- How much memory is needed? Should you limit by item count or by bytes?
- How do you handle expiration? (Profiles can be updated at any time.)
- How do you handle concurrent access from many request threads?
- What happens when the cache is cold on startup?
- How do you handle cache stampede when a popular profile expires?
- What metrics do you track to know the cache is healthy?
- How does the system behave during a deployment restart?
- What if a profile is deleted? How does the cache learn about it?
- Should you use a local cache per server or a shared distributed cache?
- How do you handle hot keys — a single celebrity profile getting millions of hits?`,
  hints: [
    "600 K concurrent users × 4 KB per profile ≈ 2.4 GB of hot working set. A single server with 16 GB RAM can hold it; multiple servers each with a local cache could work too.",
    "Profiles can be updated at any time — LRU eviction alone is insufficient. You need TTL (e.g., 5 minutes) plus explicit invalidation on write.",
    "A shared map + doubly linked list is a write-heavy contention point. Every get() mutates the list. Consider sharding by `hash(userId) % numShards`, each shard with its own lock.",
    "On startup, the cache is cold. The first N requests for each key all miss and hit the database simultaneously — the thundering herd. Use request coalescing: first request fetches, the rest wait on a shared future/promise.",
    "For celebrity profiles (hot keys), a single server node cannot absorb all reads even from cache. Consider consistent hashing across cache nodes or dedicated overflow nodes for hot keys.",
  ],
  discussionPoints: [
    "**Local vs. shared cache:** A local LRU per app server is fast (no network hop) but creates inconsistency on profile updates — different servers serve different versions. A shared cache (Redis) solves consistency at the cost of a network round-trip. Hybrid: local cache with short TTL + Redis for authoritative data.",
    "**TTL + LRU together:** Set TTL=5 min on each profile key. Reset TTL on every read (sliding expiration) to keep active users' profiles hot. On profile update, explicitly delete the cache key (write-through invalidation). LRU handles memory pressure; TTL handles staleness.",
    "**Sharding for concurrency:** Partition by `hash(userId) % 64` shards. Each shard has its own lock, map, and LRU list. Contention drops 64×. Write operations (put/evict) lock only one shard.",
    "**Cache stampede prevention:** Use a per-key lock or a promises map: first request acquires a future, subsequent requests wait on the same future. When the first completes and caches the result, all waiters get it. This collapses N database hits to 1.",
    "**Invalidation on write:** When a profile is updated, publish an invalidation event (Redis Pub/Sub, Kafka, or a sidecar). Each app server subscribes and deletes the key from its local cache. This keeps all nodes consistent within milliseconds of a write.",
    "**Metrics to track:** Cache hit rate (target > 90%), miss rate, eviction rate, load latency (p50/p99 for cache-hit vs. cache-miss paths), memory utilization. Alert if hit rate drops below 80% — indicates the working set outgrew cache capacity.",
    "**Cold start / warm-up:** Pre-warm on startup by loading the top-N most active user IDs (from analytics or a pre-built hot list) before the server begins serving traffic. Accept a gradual ramp-up period for less popular profiles.",
    "**Hot key handling:** A single viral profile can saturate a single cache shard. Options: (1) replicate hot keys across multiple shards, (2) use a small in-process local cache as a second layer for ultra-hot keys, (3) return stale cached data while asynchronously refreshing in the background.",
  ],
};
