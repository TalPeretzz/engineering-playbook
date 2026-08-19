import type { Topic } from "@engineering-playbook/content-schema";

export const idempotency: Topic = {
  slug: "idempotency",
  title: "Idempotency",
  description:
    "The property where performing the same operation multiple times produces the same result as performing it once — essential for safe retries in distributed systems.",
  category: "backend-patterns",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  nextTopics: ["outbox-pattern", "saga-pattern", "rate-limiter"],

  content: {
    problemStatement: `
Networks fail. Timeouts happen. Clients retry. In a distributed system, the question is never "will requests be duplicated?" — it's "when they are, what happens?"

Imagine a payment API. A client sends a charge request. The server processes the charge successfully but the response is lost in transit. The client, seeing a timeout, retries. Without idempotency, the customer is charged twice.

**Idempotency** ensures that retrying a safe operation produces the same outcome as executing it once. It's the difference between a system that handles failures gracefully and one that silently corrupts data.
    `.trim(),

    howItWorks: `
**Idempotency Keys:**
The most common pattern. The client generates a unique ID (UUID) for each logical operation and sends it with the request (usually in an HTTP header like \`Idempotency-Key: <uuid>\`).

The server:
1. Checks if it has seen this key before
2. If yes: return the stored response (don't re-execute)
3. If no: execute the operation, store the result keyed by the idempotency key, return the result

**Storage:**
Idempotency key → result mappings are typically stored in Redis with a TTL (e.g., 24 hours). After the TTL, the key expires and a duplicate would be treated as a new request.

**Idempotent HTTP Methods:**
By HTTP spec, GET, PUT, DELETE, and HEAD are idempotent. POST is not. But application-level idempotency with keys applies to any operation — particularly POST (create/charge operations).

**Natural idempotency:**
Some operations are naturally idempotent without keys:
- Setting a value: SET user.name = "Alice" (same result every time)
- Conditional updates: UPDATE ... WHERE version = N (only succeeds once)
- Upserts: INSERT OR REPLACE

**Non-idempotent operations (require keys):**
- Appending to a list
- Creating a record
- Processing a payment
- Sending an email
    `.trim(),

    visualExplanation: `
Client                    Server                    DB
  |                          |                       |
  |--- POST /payments -----→ |                       |
  |    Idempotency-Key: k1   |                       |
  |                          |-- check key k1 ----→  |
  |                          |← not found            |
  |                          |-- charge $50 ------→  |
  |                          |-- store k1: {ok} --→  |
  |← 200 {charged: $50} ---- |                       |

Network failure! Client retries:

  |--- POST /payments -----→ |                       |
  |    Idempotency-Key: k1   |                       |
  |                          |-- check key k1 ----→  |
  |                          |← found: {ok}          |
  |← 200 {charged: $50} ---- |   (no double charge)  |
    `.trim(),

    complexity: [
      { operation: "Key lookup (Redis)", time: "O(1)", space: "O(1) per key" },
      { operation: "Key storage", time: "O(1)", space: "O(1) per key" },
      { operation: "Total storage", time: "-", space: "O(K)", note: "K = unique requests within TTL window" },
    ],

    tradeoffs: {
      pros: [
        "Safe retries — clients can retry on timeout without risk of duplicate processing",
        "Enables at-least-once delivery with exactly-once semantics at the application layer",
        "Simple client contract — just send a UUID with every mutating request",
        "Works across network boundaries, queues, and async processing",
      ],
      cons: [
        "Storage overhead — must store results for the TTL duration",
        "TTL choice is tricky — too short allows duplicates after expiry, too long wastes storage",
        "Concurrent requests with the same key require locking to prevent race conditions",
        "Doesn't help if the client generates a new key on retry (client must reuse the same key)",
        "Adds latency for the key lookup on every mutating request",
      ],
    },

    whenToUse: [
      "Any API endpoint that processes payments, creates orders, or sends communications",
      "Message consumers in async systems where messages may be delivered more than once",
      "Distributed transactions where partial failures can leave state inconsistent",
      "Any mutating operation exposed to clients that will retry on timeout",
      "Webhook delivery systems where the receiver may process the same event twice",
    ],

    whenNotToUse: [
      "Read-only operations — GET requests are naturally idempotent by HTTP spec",
      "Operations that must record every invocation for audit purposes (use deduplication at a higher level)",
      "When the TTL and storage overhead outweigh the risk of duplicates (e.g., low-stakes non-financial operations with monitoring)",
    ],

    realWorldExamples: [
      "**Stripe API** — requires an Idempotency-Key header for payment creation; returns the same response for duplicates for up to 24 hours",
      "**AWS S3 PUT** — naturally idempotent; uploading the same object twice just overwrites with the same content",
      "**Kafka consumer groups** — at-least-once delivery; consumers must idempotently handle duplicate messages",
      "**Twilio** — uses idempotency keys for SMS sending to prevent duplicate messages on retry",
      "**Database UPSERT** — INSERT ... ON CONFLICT DO UPDATE is a natural idempotent write pattern",
      "**HTTP PUT vs POST** — REST API design: prefer PUT (idempotent) over POST for resource creation when the client knows the ID",
    ],
  },

  implementations: {
    typescript: `import crypto from "crypto";

// Simulated storage (use Redis in production with TTL)
const idempotencyStore = new Map<string, { result: unknown; createdAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type PaymentResult = {
  transactionId: string;
  amount: number;
  status: "success" | "failed";
};

async function processPayment(
  idempotencyKey: string,
  amount: number,
  userId: string
): Promise<PaymentResult> {
  // Check if we've already processed this request
  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    const age = Date.now() - existing.createdAt;
    if (age < TTL_MS) {
      console.log("Returning cached result for key:", idempotencyKey);
      return existing.result as PaymentResult;
    }
    // Key expired — treat as new request
    idempotencyStore.delete(idempotencyKey);
  }

  // Process the payment (exactly once)
  const result: PaymentResult = {
    transactionId: crypto.randomUUID(),
    amount,
    status: "success",
  };

  // Store the result before returning
  idempotencyStore.set(idempotencyKey, { result, createdAt: Date.now() });
  return result;
}

// Client usage
const idempotencyKey = crypto.randomUUID(); // Generated once per logical operation

// First request
const result1 = await processPayment(idempotencyKey, 99.99, "user-123");
console.log(result1); // { transactionId: "abc-123", amount: 99.99, status: "success" }

// Retry (simulating network failure on first attempt)
const result2 = await processPayment(idempotencyKey, 99.99, "user-123");
console.log(result2); // Same transactionId — no double charge`,

    python: `import uuid
import time
from typing import Any

# Simulated store (use Redis with TTL in production)
_idempotency_store: dict[str, dict[str, Any]] = {}
TTL_SECONDS = 24 * 3600


def process_payment(
    idempotency_key: str,
    amount: float,
    user_id: str,
) -> dict[str, Any]:
    # Check for existing result
    existing = _idempotency_store.get(idempotency_key)
    if existing:
        if time.time() - existing["created_at"] < TTL_SECONDS:
            print(f"Returning cached result for key: {idempotency_key}")
            return existing["result"]
        del _idempotency_store[idempotency_key]

    # Process exactly once
    result = {
        "transaction_id": str(uuid.uuid4()),
        "amount": amount,
        "status": "success",
    }

    _idempotency_store[idempotency_key] = {
        "result": result,
        "created_at": time.time(),
    }
    return result


# Client usage
key = str(uuid.uuid4())  # Generated once per logical operation

result1 = process_payment(key, 99.99, "user-123")
print(result1)  # {"transaction_id": "abc-123", "amount": 99.99, ...}

# Retry — same result, no double charge
result2 = process_payment(key, 99.99, "user-123")
print(result2["transaction_id"] == result1["transaction_id"])  # True`,

    java: `import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class IdempotentPaymentService {
    private static final long TTL_MS = 24L * 60 * 60 * 1000;
    private final Map<String, StoredResult> store = new ConcurrentHashMap<>();

    public PaymentResult processPayment(String idempotencyKey, double amount, String userId) {
        StoredResult existing = store.get(idempotencyKey);
        if (existing != null) {
            if (System.currentTimeMillis() - existing.createdAt < TTL_MS) {
                System.out.println("Returning cached result for: " + idempotencyKey);
                return existing.result;
            }
            store.remove(idempotencyKey);
        }

        // Process exactly once
        PaymentResult result = new PaymentResult(
            UUID.randomUUID().toString(),
            amount,
            "success"
        );

        store.put(idempotencyKey, new StoredResult(result, System.currentTimeMillis()));
        return result;
    }

    record PaymentResult(String transactionId, double amount, String status) {}

    private record StoredResult(PaymentResult result, long createdAt) {}

    public static void main(String[] args) {
        IdempotentPaymentService service = new IdempotentPaymentService();
        String key = UUID.randomUUID().toString();

        PaymentResult r1 = service.processPayment(key, 99.99, "user-123");
        PaymentResult r2 = service.processPayment(key, 99.99, "user-123"); // retry

        System.out.println(r1.transactionId().equals(r2.transactionId())); // true
    }
}`,
  },

  challenges: [
    {
      type: "multiple-choice",
      id: "idempotency-conceptual",
      question: "Which of the following operations is NOT naturally idempotent?",
      options: [
        { id: "a", text: "HTTP GET /users/123" },
        { id: "b", text: "HTTP PUT /users/123 with {name: 'Alice'}" },
        { id: "c", text: "SQL: UPDATE users SET balance = balance - 50 WHERE id = 123" },
        { id: "d", text: "SQL: UPDATE users SET name = 'Alice' WHERE id = 123" },
      ],
      correctOptionId: "c",
      explanation:
        "UPDATE balance = balance - 50 is not idempotent — running it multiple times deducts 50 each time. The other three are idempotent: GET has no side effects, PUT to a resource with the same data is idempotent, and SET name = 'Alice' always results in the same state regardless of how many times it runs.",
    },
    {
      type: "implementation",
      id: "idempotency-implementation",
      title: "Implement an Idempotency Key Middleware",
      description: `Implement an idempotency layer for a simple payment processor:

- Accept an \`idempotencyKey\` parameter with each request
- If the key was seen before (and not expired), return the stored result
- If the key is new, execute the operation, store the result, and return it
- Support a configurable TTL for key expiry

The goal is to ensure that retrying with the same key always returns the same result without re-executing the operation.`,
      starterCode: {
        typescript: `type Result = { id: string; status: string; amount: number };

class IdempotencyService {
  private store = new Map<string, { result: Result; timestamp: number }>();
  private ttlMs: number;

  constructor(ttlMs: number = 86400000) { // 24h default
    this.ttlMs = ttlMs;
  }

  execute(
    idempotencyKey: string,
    operation: () => Result
  ): Result {
    // TODO: check store, return cached or execute + store
    return operation();
  }
}`,
        python: `import time
from typing import TypedDict, Callable


class Result(TypedDict):
    id: str
    status: str
    amount: float


class IdempotencyService:
    def __init__(self, ttl_seconds: float = 86400):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, dict] = {}

    def execute(
        self,
        idempotency_key: str,
        operation: Callable[[], Result],
    ) -> Result:
        # TODO: check store, return cached or execute + store
        return operation()`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class IdempotencyService {
    record Result(String id, String status, double amount) {}
    private record Entry(Result result, long timestamp) {}

    private final long ttlMs;
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public IdempotencyService(long ttlMs) {
        this.ttlMs = ttlMs;
    }

    public Result execute(String idempotencyKey, Supplier<Result> operation) {
        // TODO: check store, return cached or execute + store
        return operation.get();
    }
}`,
      },
      hints: [
        "Store both the result and the timestamp when you first execute the operation",
        "On each call, check if the key exists AND if the timestamp is within TTL",
        "If expired, remove the old entry and treat it as a new request",
        "Only call operation() when you don't have a valid cached result",
        "In a real system, this store would be Redis — the TTL would be managed by Redis EXPIRE",
      ],
      solution: {
        typescript: `type Result = { id: string; status: string; amount: number };

class IdempotencyService {
  private store = new Map<string, { result: Result; timestamp: number }>();
  private ttlMs: number;

  constructor(ttlMs = 86400000) {
    this.ttlMs = ttlMs;
  }

  execute(idempotencyKey: string, operation: () => Result): Result {
    const existing = this.store.get(idempotencyKey);
    if (existing && Date.now() - existing.timestamp < this.ttlMs) {
      return existing.result;
    }
    const result = operation();
    this.store.set(idempotencyKey, { result, timestamp: Date.now() });
    return result;
  }
}`,
        python: `import time
from typing import TypedDict, Callable

class Result(TypedDict):
    id: str
    status: str
    amount: float

class IdempotencyService:
    def __init__(self, ttl_seconds: float = 86400):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, dict] = {}

    def execute(self, idempotency_key: str, operation: Callable[[], Result]) -> Result:
        existing = self._store.get(idempotency_key)
        if existing and time.time() - existing["ts"] < self.ttl_seconds:
            return existing["result"]
        result = operation()
        self._store[idempotency_key] = {"result": result, "ts": time.time()}
        return result`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class IdempotencyService {
    record Result(String id, String status, double amount) {}
    private record Entry(Result result, long timestamp) {}

    private final long ttlMs;
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public IdempotencyService(long ttlMs) { this.ttlMs = ttlMs; }

    public Result execute(String idempotencyKey, Supplier<Result> operation) {
        Entry existing = store.get(idempotencyKey);
        if (existing != null && System.currentTimeMillis() - existing.timestamp() < ttlMs) {
            return existing.result();
        }
        Result result = operation.get();
        store.put(idempotencyKey, new Entry(result, System.currentTimeMillis()));
        return result;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "idempotency-system-design",
      title: "Idempotent Payment Processing at Scale",
      scenario: `You're building the payments service for an e-commerce platform processing 50,000 orders/day. Each order triggers a payment charge via a third-party payment processor (like Stripe).

**The problem:** Due to network timeouts, your service retries failed charges. You've had incidents where customers were charged twice because:
1. The charge succeeded at Stripe but the response was lost
2. Your service retried, charging again

Additionally, your service runs on 10 instances behind a load balancer. A retry may hit a different instance than the original request.

Design a robust idempotent payment system.`,
      hints: [
        "Each order should generate exactly one idempotency key — derived from the order ID, not random",
        "Using order_id as the idempotency key ensures even a different service instance can detect duplicates",
        "Where do you store the idempotency key → result mapping? It needs to be shared across all instances",
        "What if the payment is in-flight (started but not yet stored)? Two concurrent retries could both see 'key not found'",
        "Consider a 'pending' state: mark the key as in-progress before calling Stripe, then update with the final result",
      ],
      discussionPoints: [
        "**Deterministic key generation:** Use order_id (or hash of order_id + amount) as the idempotency key — not a random UUID. This ensures retries from any service instance use the same key, even without shared session state.",
        "**Shared Redis store:** All 10 instances read/write the same Redis idempotency store. Key = idempotency key, Value = {status: pending|success|failed, result, created_at}. TTL = 24h.",
        "**Pending state (optimistic locking):** Use Redis SET NX (set if not exists) to atomically claim a key. If claim succeeds, proceed with the Stripe call. If NX fails, another instance is handling it — poll until it resolves or return 'processing' to the client.",
        "**Forwarding idempotency to Stripe:** Pass your order-based idempotency key to Stripe's API too. Stripe deduplicates on their end — even if you call them twice with the same key, they charge once and return the same result.",
        "**Failure recovery:** If your service crashes after Stripe charges but before storing the result: on recovery, use Stripe's API to look up the charge by idempotency key and backfill your store.",
        "**Database record:** For audit and reconciliation, always write a payment_attempts record to your database (status: pending → success/failed) independently of the Redis idempotency store. The DB is the source of truth for accounting; Redis is the fast deduplication layer.",
        "**Testing:** Test the 'response lost' scenario explicitly: mock the case where the Stripe call succeeds but your service crashes before storing the result. Verify the retry path recovers correctly.",
      ],
    },
  ],
};
