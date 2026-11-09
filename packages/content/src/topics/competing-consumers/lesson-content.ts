import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A single consumer processing messages from a queue has a hard ceiling: it can only work as fast as one instance can go. If messages arrive faster than that, the queue backs up indefinitely, no matter how long the system runs.",
      },
      {
        type: "p",
        text: '**Competing Consumers** is the classic, general-purpose fix: run multiple consumer instances against the same queue. They "compete" for messages — the messaging system hands each incoming message to whichever consumer is available to take it, and each message is processed by exactly one of them. This is an Enterprise Integration Pattern described by Gregor Hohpe and Bobby Woolf: when a messaging client can\'t process messages as fast as they arrive, launch multiple consumers against the same point-to-point channel so they can process concurrently.',
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      {
        type: "list",
        items: [
          "Multiple consumer instances all read from the **same queue** — there's no partitioning, grouping, or key-based routing involved.",
          "When a message arrives, the messaging system delivers it to exactly one available consumer. The others simply don't see it.",
          "A consumer that takes a message typically holds an implicit or explicit lock on it (e.g. a **visibility timeout**) while processing. If it crashes or takes too long, the message becomes available again for another consumer to pick up.",
          "Adding more consumers increases total throughput, up to the point where the queue itself or the downstream work becomes the bottleneck instead of consumer count.",
        ],
      },
      {
        type: "p",
        text: "This pattern predates, and is simpler than, Kafka-style consumer groups: there's no concept of partitions, no rebalancing protocol, and no per-key ordering guarantee — any consumer can pick up any message, in whatever order the queue happens to deliver them. That simplicity is also the limitation: competing consumers alone can't guarantee that all messages for the same logical entity (e.g. the same user, the same order) are processed in order, because two different consumers could pick up two messages for the same entity at the same time.",
      },
      {
        type: "p",
        text: "Amazon SQS's visibility timeout is a concrete, widely-used implementation of the 'hold a lock while processing' part of this pattern: a message delivered to one consumer becomes invisible to others for a configured period. If the consumer deletes the message before that period expires, it's done. If it doesn't — because of a crash, an error, or simply running long — the message becomes visible again and any consumer, including a different one, can pick it up.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `          Queue: [msg1, msg2, msg3, msg4, msg5, ...]
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     Consumer A    Consumer B    Consumer C
     (takes msg1)  (takes msg2)  (takes msg3)

Each message goes to exactly ONE consumer — whichever is free to take it next.
No partitions, no key-based routing: any consumer can take any message.

If Consumer B crashes mid-processing on msg2:
  msg2's visibility timeout expires ──▶ msg2 becomes available again
  ──▶ Consumer A or C (or a restarted B) picks it up and retries`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Message dispatch",
        time: "O(1)",
        note: "The queue hands a message to whichever consumer is free",
      },
      {
        operation: "Throughput scaling",
        time: "Roughly linear with consumer count",
        note: "Until the queue or downstream resources become the bottleneck instead",
      },
      {
        operation: "Failure recovery",
        time: "Bounded by the visibility timeout",
        note: "A crashed consumer's in-flight message reappears after the timeout, not instantly",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Simple mental model — no partitions, no rebalancing protocol, no group coordination to reason about",
      "Scales throughput by adding consumers, with no upper bound tied to a partition count set in advance",
      "A crashed or slow consumer's message automatically becomes available to other consumers after the visibility timeout — built-in failure recovery",
      "Works with the most basic queue semantics available in virtually every messaging system",
    ],
    cons: [
      "No ordering guarantee across messages — two messages for the same logical entity can be picked up by different consumers and processed out of order or concurrently",
      "No built-in way to scale beyond the queue's own throughput ceiling, unlike partition-based systems that can add partitions for more parallelism",
      "A consumer that doesn't crash but silently hangs can hold a message until the visibility timeout expires, delaying that message's processing without any other consumer finding out earlier",
      "Choosing the visibility timeout is a real tuning problem: too short risks duplicate processing (another consumer picks up a still-in-progress message); too long delays recovery from a genuine failure",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Independent units of work where processing order between messages doesn't matter",
      "Simple horizontal scaling of queue processing without needing partition planning or a consumer-group protocol",
      "Systems already using basic queue primitives (SQS, RabbitMQ, a database-backed job queue) that don't need Kafka-style partitioned consumption",
    ],
    whenNotToUse: [
      "Ordering must be preserved for messages relating to the same entity — competing consumers alone can't guarantee this; partition-based systems with per-key routing (see Consumer Groups) are built for that case",
      "Processing must happen exactly once with strong guarantees — at-least-once delivery combined with a visibility timeout still permits duplicate processing in edge cases, so idempotent processing is required regardless",
    ],
  },
  {
    type: "text",
    id: "real-world",
    heading: "Real-world usage",
    body: [
      {
        type: "list",
        items: [
          "**Competing Consumers** is documented as a core Enterprise Integration Pattern by Gregor Hohpe and Bobby Woolf — the canonical reference describes exactly this problem (a client can't keep up with message arrival rate) and this solution (multiple consumers on one point-to-point channel).",
          "**Amazon SQS**'s visibility timeout implements the 'exactly one consumer processes a message at a time' guarantee this pattern needs: a received message becomes invisible to other consumers for a configurable period, and reappears for any consumer to retry if it isn't deleted in time.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "EnterpriseIntegrationPatterns.com — Competing Consumers",
            url: "https://www.enterpriseintegrationpatterns.com/patterns/messaging/CompetingConsumers.html",
            verified: "2026-11-04",
            note: "The original Hohpe & Woolf pattern description",
          },
          {
            name: "AWS Docs — Amazon SQS visibility timeout",
            url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html",
            verified: "2026-11-04",
            note: "How SQS prevents concurrent processing of the same message and recovers from a consumer that fails to delete it in time",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type Message<T> = { id: string; payload: T };

class CompetingConsumerQueue<T> {
  private queue: Message<T>[] = [];
  private inFlight = new Map<string, Message<T>>(); // id -> message, while being processed

  enqueue(payload: T): string {
    const id = crypto.randomUUID();
    this.queue.push({ id, payload });
    return id;
  }

  // Any consumer calls this — whichever calls first gets the next message.
  receive(): Message<T> | null {
    const message = this.queue.shift();
    if (!message) return null;
    this.inFlight.set(message.id, message);
    return message;
  }

  complete(id: string): void {
    this.inFlight.delete(id);
  }

  // Simulates a visibility timeout expiring — an unacknowledged message goes back to the queue.
  requeueIfTimedOut(id: string): void {
    const message = this.inFlight.get(id);
    if (message) {
      this.inFlight.delete(id);
      this.queue.unshift(message);
    }
  }
}

// Usage — multiple independent "consumer" loops pulling from one queue.
const queue = new CompetingConsumerQueue<string>();
queue.enqueue("process order 1");
queue.enqueue("process order 2");

const msg = queue.receive(); // consumer A takes the next available message
if (msg) {
  // ... do work ...
  queue.complete(msg.id); // done — won't be redelivered
}`,

  python: `import uuid
from typing import Generic, TypeVar

T = TypeVar("T")


class Message(Generic[T]):
    def __init__(self, id: str, payload: T) -> None:
        self.id = id
        self.payload = payload


class CompetingConsumerQueue(Generic[T]):
    def __init__(self) -> None:
        self.queue: list[Message[T]] = []
        self.in_flight: dict[str, Message[T]] = {}

    def enqueue(self, payload: T) -> str:
        message_id = str(uuid.uuid4())
        self.queue.append(Message(message_id, payload))
        return message_id

    # Any consumer calls this — whichever calls first gets the next message.
    def receive(self) -> Message[T] | None:
        if not self.queue:
            return None
        message = self.queue.pop(0)
        self.in_flight[message.id] = message
        return message

    def complete(self, message_id: str) -> None:
        self.in_flight.pop(message_id, None)

    # Simulates a visibility timeout expiring — an unacknowledged message goes back to the queue.
    def requeue_if_timed_out(self, message_id: str) -> None:
        message = self.in_flight.pop(message_id, None)
        if message is not None:
            self.queue.insert(0, message)


# Usage — multiple independent "consumer" loops pulling from one queue.
queue: CompetingConsumerQueue[str] = CompetingConsumerQueue()
queue.enqueue("process order 1")
queue.enqueue("process order 2")

msg = queue.receive()  # consumer A takes the next available message
if msg is not None:
    # ... do work ...
    queue.complete(msg.id)  # done — won't be redelivered`,

  java: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

public class CompetingConsumerQueue<T> {
    public record Message<T>(String id, T payload) {}

    private final Deque<Message<T>> queue = new ArrayDeque<>();
    private final Map<String, Message<T>> inFlight = new ConcurrentHashMap<>();

    public synchronized String enqueue(T payload) {
        String id = UUID.randomUUID().toString();
        queue.addLast(new Message<>(id, payload));
        return id;
    }

    // Any consumer calls this — whichever calls first gets the next message.
    public synchronized Message<T> receive() {
        Message<T> message = queue.pollFirst();
        if (message == null) return null;
        inFlight.put(message.id(), message);
        return message;
    }

    public void complete(String id) {
        inFlight.remove(id);
    }

    // Simulates a visibility timeout expiring — an unacknowledged message goes back to the queue.
    public synchronized void requeueIfTimedOut(String id) {
        Message<T> message = inFlight.remove(id);
        if (message != null) queue.addFirst(message);
    }
}

// Usage — multiple independent "consumer" loops pulling from one queue.
CompetingConsumerQueue<String> queue = new CompetingConsumerQueue<>();
queue.enqueue("process order 1");
queue.enqueue("process order 2");

CompetingConsumerQueue.Message<String> msg = queue.receive(); // consumer A takes the next message
if (msg != null) {
    // ... do work ...
    queue.complete(msg.id()); // done — won't be redelivered
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "competing-consumers-conceptual",
    required: true,
    question:
      "Two messages for the same user (update their email, then update their phone number) are published to a queue with 3 competing consumers. What ordering guarantee does the competing consumers pattern provide between these two messages?",
    options: [
      {
        id: "a",
        text: "None — the two messages could be picked up by different consumers and processed concurrently or out of order",
      },
      { id: "b", text: "They're guaranteed to be processed in the order they were published" },
      { id: "c", text: "They're guaranteed to be processed by the same consumer" },
      { id: "d", text: "The queue blocks the second message until the first is fully processed" },
    ],
    correctOptionId: "a",
    explanation:
      "Competing consumers has no partitioning or key-based routing — any available consumer can take any message, with no guarantee about which consumer gets which message or in what order they're processed relative to each other. Two messages for the same user could be picked up by two different consumers at the same time, with no ordering guarantee between them. If per-entity ordering is required, that needs a mechanism like Kafka's partition-per-key consumer groups, not plain competing consumers.",
  },
  {
    type: "implementation",
    id: "competing-consumers-implementation",
    required: true,
    title: "Implement a Competing Consumer Queue",
    description: `Implement a simple queue that supports the competing consumers pattern:

- **enqueue(payload)** — adds a message to the queue and returns its generated id.
- **receive()** — returns the next available message and marks it as in-flight (not visible to other receive() calls), or null if the queue is empty.
- **complete(id)** — marks an in-flight message as done, removing it permanently.
- **requeueIfTimedOut(id)** — simulates a visibility timeout expiring: moves an in-flight message back to the front of the queue so it can be received again.`,
    starterCode: {
      typescript: `type Message<T> = { id: string; payload: T };

class CompetingConsumerQueue<T> {
  private queue: Message<T>[] = [];
  private inFlight = new Map<string, Message<T>>();

  enqueue(payload: T): string {
    // TODO: generate an id, add to the queue, return the id
    return "";
  }

  receive(): Message<T> | null {
    // TODO: take the next message off the queue, mark it in-flight, return it (or null if empty)
    return null;
  }

  complete(id: string): void {
    // TODO: remove the message from in-flight permanently
  }

  requeueIfTimedOut(id: string): void {
    // TODO: move the in-flight message back to the front of the queue
  }
}`,
      python: `import uuid
from typing import Generic, TypeVar

T = TypeVar("T")


class Message(Generic[T]):
    def __init__(self, id: str, payload: T) -> None:
        self.id = id
        self.payload = payload


class CompetingConsumerQueue(Generic[T]):
    def __init__(self) -> None:
        self.queue: list[Message[T]] = []
        self.in_flight: dict[str, Message[T]] = {}

    def enqueue(self, payload: T) -> str:
        # TODO: generate an id, add to the queue, return the id
        return ""

    def receive(self) -> Message[T] | None:
        # TODO: take the next message off the queue, mark it in-flight, return it (or None if empty)
        return None

    def complete(self, message_id: str) -> None:
        # TODO: remove the message from in-flight permanently
        pass

    def requeue_if_timed_out(self, message_id: str) -> None:
        # TODO: move the in-flight message back to the front of the queue
        pass`,
      java: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.HashMap;

public class CompetingConsumerQueue<T> {
    public record Message<T>(String id, T payload) {}

    private final Deque<Message<T>> queue = new ArrayDeque<>();
    private final Map<String, Message<T>> inFlight = new HashMap<>();

    public String enqueue(T payload) {
        // TODO: generate an id, add to the queue, return the id
        return "";
    }

    public Message<T> receive() {
        // TODO: take the next message off the queue, mark it in-flight, return it (or null if empty)
        return null;
    }

    public void complete(String id) {
        // TODO: remove the message from in-flight permanently
    }

    public void requeueIfTimedOut(String id) {
        // TODO: move the in-flight message back to the front of the queue
    }
}`,
    },
    hints: [
      "enqueue: use a UUID (or any unique string generator available in your language) as the id",
      "receive: pop from the front of the queue, store it in the in-flight map keyed by id, then return it",
      "complete: a simple removal from the in-flight map — the message never goes back to the queue",
      "requeueIfTimedOut: remove from in-flight, then push it back onto the FRONT of the queue (not the back) so it's the next message handed out",
    ],
    solution: {
      typescript: `type Message<T> = { id: string; payload: T };

class CompetingConsumerQueue<T> {
  private queue: Message<T>[] = [];
  private inFlight = new Map<string, Message<T>>();

  enqueue(payload: T): string {
    const id = crypto.randomUUID();
    this.queue.push({ id, payload });
    return id;
  }

  receive(): Message<T> | null {
    const message = this.queue.shift();
    if (!message) return null;
    this.inFlight.set(message.id, message);
    return message;
  }

  complete(id: string): void {
    this.inFlight.delete(id);
  }

  requeueIfTimedOut(id: string): void {
    const message = this.inFlight.get(id);
    if (message) {
      this.inFlight.delete(id);
      this.queue.unshift(message);
    }
  }
}`,
      python: `import uuid
from typing import Generic, TypeVar

T = TypeVar("T")


class Message(Generic[T]):
    def __init__(self, id: str, payload: T) -> None:
        self.id = id
        self.payload = payload


class CompetingConsumerQueue(Generic[T]):
    def __init__(self) -> None:
        self.queue: list[Message[T]] = []
        self.in_flight: dict[str, Message[T]] = {}

    def enqueue(self, payload: T) -> str:
        message_id = str(uuid.uuid4())
        self.queue.append(Message(message_id, payload))
        return message_id

    def receive(self) -> Message[T] | None:
        if not self.queue:
            return None
        message = self.queue.pop(0)
        self.in_flight[message.id] = message
        return message

    def complete(self, message_id: str) -> None:
        self.in_flight.pop(message_id, None)

    def requeue_if_timed_out(self, message_id: str) -> None:
        message = self.in_flight.pop(message_id, None)
        if message is not None:
            self.queue.insert(0, message)`,
      java: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

public class CompetingConsumerQueue<T> {
    public record Message<T>(String id, T payload) {}

    private final Deque<Message<T>> queue = new ArrayDeque<>();
    private final Map<String, Message<T>> inFlight = new HashMap<>();

    public String enqueue(T payload) {
        String id = UUID.randomUUID().toString();
        queue.addLast(new Message<>(id, payload));
        return id;
    }

    public Message<T> receive() {
        Message<T> message = queue.pollFirst();
        if (message == null) return null;
        inFlight.put(message.id(), message);
        return message;
    }

    public void complete(String id) {
        inFlight.remove(id);
    }

    public void requeueIfTimedOut(String id) {
        Message<T> message = inFlight.remove(id);
        if (message != null) queue.addFirst(message);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "competing-consumers-system-design",
    required: false,
    title: "Choosing Between Competing Consumers and Consumer Groups for Image Processing",
    scenario: `You're building a service that resizes user-uploaded images into multiple sizes (thumbnail, medium, full). Uploads arrive on a queue; a pool of worker instances processes them. Processing one image takes 2-5 seconds depending on size.

The product team is now asking for a new feature: guarantee that if a user uploads two images in quick succession, they're processed in the order uploaded, so the UI can show them in upload order without extra client-side sorting logic.

Currently you use a plain queue with competing consumers. Evaluate whether that still works for the new requirement, and if not, what changes.`,
    hints: [
      "Does the current setup (plain queue, competing consumers) make any promise about processing order between two messages?",
      "The new requirement is about order *per user*, not a strict global order across all uploads from all users — does that distinction matter for the solution?",
      "What would it take to guarantee that two uploads from the same user are never processed by two different workers at the same time?",
      "If you don't need strict global ordering, is a full migration to a partition-based system like Kafka necessary, or is there a smaller change that solves the per-user case?",
    ],
    discussionPoints: [
      "**Plain competing consumers can't provide this guarantee:** As established in this lesson, any available worker can take any message — two uploads from the same user could land on two different workers at the same time, with no ordering between them. The current design is incompatible with the new requirement as-is.",
      "**The requirement is per-user, not global:** This matters a lot — a full switch to a system with global total ordering would be overkill and would eliminate the parallelism benefit entirely (only one consumer could ever be active). The actual need is 'order preserved within one user's uploads,' which is a much narrower problem.",
      "**Per-key ordering is exactly what partition-based consumer groups solve:** Routing messages by a key (e.g. user ID) so that all of one user's messages land in the same partition — and therefore get processed by the same consumer, in order — directly satisfies the requirement while still allowing full parallelism across different users' uploads. This is the natural point to bring in Consumer Groups rather than staying with plain competing consumers.",
      "**A smaller alternative, without migrating messaging systems:** If adopting a partitioned broker is too large a change right now, a narrower fix is possible even with plain competing consumers: have each worker check for an existing in-progress or queued job for the same user before starting a new one, and defer/requeue if one exists — a form of per-key locking layered on top of the existing queue, trading some implementation complexity for not needing new infrastructure.",
      "**Tradeoff to surface either way:** Routing by user ID (via partitioning or per-key locking) means a single very active user's uploads can only be processed as fast as one worker can go, even if other workers are idle — a classic hot-key problem that per-key ordering guarantees always introduce, worth flagging to the product team as a known limitation of satisfying this request.",
    ],
  },
];
