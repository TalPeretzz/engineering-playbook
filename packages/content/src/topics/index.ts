import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { bloomFilter } from "./bloom-filter";
import { lruCache } from "./lru-cache";
import { consistentHashing } from "./consistent-hashing";
import { idempotency } from "./idempotency";
import { rateLimiter } from "./rate-limiter";
import { trie } from "./trie";
import { skipList } from "./skip-list";
import { heapPriorityQueue } from "./heap-priority-queue";
import { bitmapsBitsets } from "./bitmaps-bitsets";
import { hyperloglog } from "./hyperloglog";
import { countMinSketch } from "./count-min-sketch";
import { merkleTree } from "./merkle-tree";
import { leaderElection } from "./leader-election";
import { replication } from "./replication";
import { sharding } from "./sharding";
import { quorum } from "./quorum";
import { gossipProtocol } from "./gossip-protocol";
import { heartbeats } from "./heartbeats";
import { circuitBreaker } from "./circuit-breaker";
import { retryExponentialBackoff } from "./retry-exponential-backoff";
import { distributedLock } from "./distributed-lock";
import { lease } from "./lease";
import { sagaPattern } from "./saga-pattern";
import { outboxPattern } from "./outbox-pattern";
import { cqrs } from "./cqrs";
import { eventSourcing } from "./event-sourcing";
import { pubSub } from "./pub-sub";
import { consumerGroups } from "./consumer-groups";
import { deadLetterQueue } from "./dead-letter-queue";
import { deliverySemantics } from "./delivery-semantics";
import { deduplication } from "./deduplication";
import { ordering } from "./ordering";
import { backpressure } from "./backpressure";
import { competingConsumers } from "./competing-consumers";
import { cacheAside } from "./cache-aside";
import { writeThrough } from "./write-through";
import { writeBehind } from "./write-behind";
import { readThrough } from "./read-through";
import { ttl } from "./ttl";
import { cacheInvalidation } from "./cache-invalidation";
import { cacheStampede } from "./cache-stampede";
import { distributedCache } from "./distributed-cache";
import { strategy } from "./strategy";
import { factory } from "./factory";
import { adapter } from "./adapter";
import { decorator } from "./decorator";
import { observer } from "./observer";
import { command } from "./command";
import { repository } from "./repository";
import { dependencyInjection } from "./dependency-injection";

export const allTopicDefinitions: TopicDefinition[] = [
  bloomFilter,
  lruCache,
  consistentHashing,
  idempotency,
  rateLimiter,
  trie,
  skipList,
  heapPriorityQueue,
  bitmapsBitsets,
  hyperloglog,
  countMinSketch,
  merkleTree,
  leaderElection,
  replication,
  sharding,
  quorum,
  gossipProtocol,
  heartbeats,
  circuitBreaker,
  retryExponentialBackoff,
  distributedLock,
  lease,
  sagaPattern,
  outboxPattern,
  cqrs,
  eventSourcing,
  pubSub,
  consumerGroups,
  deadLetterQueue,
  deliverySemantics,
  deduplication,
  ordering,
  backpressure,
  competingConsumers,
  cacheAside,
  writeThrough,
  writeBehind,
  readThrough,
  ttl,
  cacheInvalidation,
  cacheStampede,
  distributedCache,
  strategy,
  factory,
  adapter,
  decorator,
  observer,
  command,
  repository,
  dependencyInjection,
];
