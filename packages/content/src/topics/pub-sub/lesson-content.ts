import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "When one service needs to tell others that something happened — an order was placed, a file finished uploading, a price changed — the direct way to do it is to call each interested service synchronously. That means the publisher has to know exactly who's listening, call each of them one by one, wait for each response, and handle it if any of them are slow or down. Adding a new interested service means changing the publisher's code to add another call.",
      },
      {
        type: "p",
        text: "**Publish/Subscribe** (pub/sub) removes that coupling. Publishers send messages to a named **topic** without knowing or caring who — if anyone — is listening. Subscribers independently declare interest in a topic and receive every message published to it. The publisher and subscribers don't call each other directly, don't need to be online at the same time, and don't need to know anything about each other beyond the topic name.",
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      {
        type: "p",
        text: "A message broker sits between publishers and subscribers and does the routing:",
      },
      {
        type: "list",
        items: [
          "A **publisher** sends a message to a **topic** (a named channel — e.g. `order.created`).",
          "One or more **subscribers** have registered interest in that topic.",
          "The broker delivers a copy of the message to **every** current subscriber of that topic — this is the defining trait of pub/sub. Publish one message to a topic with three subscribers, and it's delivered three times, once to each.",
        ],
      },
      {
        type: "p",
        text: "This is different from a plain work queue, where a message is delivered to exactly *one* consumer out of however many are pulling from the queue — useful for splitting work across a pool of workers, but not for notifying multiple independent systems about the same event. (Combining fan-out with worker pools — many subscribers, each backed by a pool of consumers sharing the load — is its own pattern, covered in Consumer Groups and Competing Consumers.)",
      },
      {
        type: "p",
        text: "The publisher is decoupled from subscribers in three ways: it doesn't know their identities (**space** decoupling), it doesn't wait for them to process the message (**time** decoupling in systems with durable topics — the subscriber doesn't have to be online at publish time), and it doesn't share their failure — a slow or crashed subscriber doesn't block the publisher or other subscribers.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `                              ┌──────────────────┐
                        ┌────▶│ Subscriber A     │
                        │     │ (send email)     │
                        │     └──────────────────┘
┌───────────┐    topic  │     ┌──────────────────┐
│ Publisher │──────────▶├────▶│ Subscriber B     │
│           │ "order.   │     │ (update inventory)│
└───────────┘  created" │     └──────────────────┘
                        │     ┌──────────────────┐
                        └────▶│ Subscriber C     │
                              │ (log analytics)  │
                              └──────────────────┘

One publish → delivered once to EACH subscriber (3 deliveries total).
The publisher never references A, B, or C directly — only the topic name.`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Publish",
        time: "O(1)",
        note: "From the publisher's perspective — it doesn't wait per-subscriber",
      },
      {
        operation: "Delivery (broker-side)",
        time: "O(S)",
        note: "S = number of subscribers to that topic; the broker fans out one copy per subscriber",
      },
      {
        operation: "Subscribe / unsubscribe",
        time: "O(1)",
        space: "O(S) total across all subscribers",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Publishers and subscribers are decoupled — add a new subscriber without touching the publisher",
      "Natural fit for fan-out: one event, many independent downstream reactions",
      "Publisher isn't blocked by slow or failed subscribers",
      "Scales subscriber count independently of publisher load",
    ],
    cons: [
      "Harder to trace than a direct call — 'who handles this event, and in what order' isn't visible from the publisher's code",
      "Without a durable/replayable broker, a subscriber that's offline when a message is published simply misses it",
      "No built-in guarantee about delivery order across subscribers, or about when (or whether) a given subscriber has finished processing",
      "Debugging requires distributed tracing or correlation IDs — a single business operation can now involve many independently-executing subscribers",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Broadcasting an event to multiple independent downstream systems (notify billing, inventory, and analytics from one 'order placed' event)",
      "Decoupling a producer from consumers that may be added, removed, or evolve independently over time",
      "Systems where the publisher shouldn't need to know or care whether anyone is currently listening",
    ],
    whenNotToUse: [
      "When you need a direct response to the caller — pub/sub is fire-and-forget, not request/response",
      "Distributing units of work across a pool of workers where each item should be processed exactly once by exactly one worker (that's a work queue, not fan-out)",
      "When strict ordering or exactly-once processing across all subscribers is required without extra guarantees the broker specifically provides for that",
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
          "**Google Cloud Pub/Sub** is a managed pub/sub service built specifically around this model — publishers send to topics, subscribers receive via subscriptions, decoupling producing and processing services.",
          "**AWS SNS** describes its core use case as 'fanout': one message published to a topic is replicated to multiple subscribed endpoints (SQS queues, Lambda functions, HTTP endpoints) for parallel, independent processing — e.g. one order-placed message triggering separate order-fulfillment and analytics pipelines.",
          "**Redis Pub/Sub** offers the same broadcast semantics in-memory, without persistence — messages published while a subscriber is disconnected are simply lost, illustrating the 'no durability without a durable broker' tradeoff directly.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Google Cloud — Pub/Sub overview",
            url: "https://docs.cloud.google.com/pubsub/docs/overview",
            verified: "2026-09-16",
          },
          {
            name: "AWS Docs — What is Amazon SNS?",
            url: "https://docs.aws.amazon.com/sns/latest/dg/welcome.html",
            verified: "2026-09-16",
            note: "The 'Fanout' scenario — one topic, multiple independently-processing subscribers",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type Handler<T> = (message: T) => void;

class PubSub<T = unknown> {
  private subscribers = new Map<string, Set<Handler<T>>>();

  subscribe(topic: string, handler: Handler<T>): () => void {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, new Set());
    this.subscribers.get(topic)!.add(handler);
    return () => this.subscribers.get(topic)?.delete(handler);
  }

  publish(topic: string, message: T): void {
    for (const handler of this.subscribers.get(topic) ?? []) {
      handler(message);
    }
  }
}

// Usage
type OrderCreated = { orderId: string; total: number };
const bus = new PubSub<OrderCreated>();

const unsubscribe = bus.subscribe("order.created", (order) => {
  console.log(\`Send confirmation email for order \${order.orderId}\`);
});
bus.subscribe("order.created", (order) => {
  console.log(\`Update inventory for order \${order.orderId}\`);
});

bus.publish("order.created", { orderId: "abc123", total: 49.99 }); // delivered to both subscribers`,

  python: `from collections import defaultdict
from typing import Callable, TypeVar

T = TypeVar("T")


class PubSub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[Callable[[T], None]]] = defaultdict(set)

    def subscribe(self, topic: str, handler: Callable[[T], None]) -> Callable[[], None]:
        self._subscribers[topic].add(handler)
        return lambda: self._subscribers[topic].discard(handler)

    def publish(self, topic: str, message: T) -> None:
        for handler in list(self._subscribers.get(topic, ())):
            handler(message)


# Usage
bus = PubSub()

unsubscribe = bus.subscribe(
    "order.created", lambda order: print(f"Send confirmation email for order {order['orderId']}")
)
bus.subscribe("order.created", lambda order: print(f"Update inventory for order {order['orderId']}"))

bus.publish("order.created", {"orderId": "abc123", "total": 49.99})  # delivered to both subscribers`,

  java: `import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class PubSub<T> {
    private final Map<String, Set<Consumer<T>>> subscribers = new ConcurrentHashMap<>();

    public Runnable subscribe(String topic, Consumer<T> handler) {
        subscribers.computeIfAbsent(topic, t -> ConcurrentHashMap.newKeySet()).add(handler);
        return () -> subscribers.get(topic).remove(handler);
    }

    public void publish(String topic, T message) {
        for (Consumer<T> handler : subscribers.getOrDefault(topic, Set.of())) {
            handler.accept(message);
        }
    }
}

// Usage
record OrderCreated(String orderId, double total) {}

PubSub<OrderCreated> bus = new PubSub<>();

Runnable unsubscribe = bus.subscribe("order.created",
    order -> System.out.println("Send confirmation email for order " + order.orderId()));
bus.subscribe("order.created",
    order -> System.out.println("Update inventory for order " + order.orderId()));

bus.publish("order.created", new OrderCreated("abc123", 49.99)); // delivered to both subscribers`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "pub-sub-conceptual",
    required: true,
    question:
      "A topic has three active subscribers. A publisher publishes one message to that topic. How many times is the message delivered, and to whom?",
    options: [
      { id: "a", text: "Once, to whichever subscriber the broker picks" },
      { id: "b", text: "Three times — once to each of the three subscribers" },
      { id: "c", text: "Once, split into three parts, one part per subscriber" },
      { id: "d", text: "Zero times, unless all three subscribers are online simultaneously" },
    ],
    correctOptionId: "b",
    explanation:
      "Pub/sub's defining trait is fan-out: every current subscriber to a topic receives its own full copy of every message published to it. This is what distinguishes it from a work queue, where one message goes to exactly one consumer out of however many are pulling from the queue. Option (a) describes queue/competing-consumer semantics, not pub/sub.",
  },
  {
    type: "implementation",
    id: "pub-sub-implementation",
    required: true,
    title: "Implement an In-Memory Pub/Sub Bus",
    description: `Implement a minimal pub/sub bus:

- **subscribe(topic, handler)** — registers \`handler\` to be called on every future publish to \`topic\`. Returns an unsubscribe function.
- **publish(topic, message)** — calls every handler currently subscribed to \`topic\` with \`message\`. If nobody is subscribed, this is a no-op — not an error.`,
    starterCode: {
      typescript: `type Handler<T> = (message: T) => void;

class PubSub<T = unknown> {
  subscribe(topic: string, handler: Handler<T>): () => void {
    // TODO: register handler for topic; return a function that unregisters it
    return () => {};
  }

  publish(topic: string, message: T): void {
    // TODO: call every handler currently subscribed to topic
  }
}`,
      python: `from typing import Callable, TypeVar

T = TypeVar("T")


class PubSub:
    def subscribe(self, topic: str, handler: Callable[[T], None]) -> Callable[[], None]:
        # TODO: register handler for topic; return a function that unregisters it
        return lambda: None

    def publish(self, topic: str, message: T) -> None:
        # TODO: call every handler currently subscribed to topic
        pass`,
      java: `import java.util.function.Consumer;

public class PubSub<T> {
    public Runnable subscribe(String topic, Consumer<T> handler) {
        // TODO: register handler for topic; return a Runnable that unregisters it
        return () -> {};
    }

    public void publish(String topic, T message) {
        // TODO: call every handler currently subscribed to topic
    }
}`,
    },
    hints: [
      "Store subscribers per topic — a Map/dict from topic name to a collection of handlers",
      "subscribe() needs to both add the handler and return a closure that removes that specific handler later",
      "publish() should do nothing (not throw) if the topic has no subscribers yet",
      "Iterate over a copy of the handler collection when publishing, so a handler that unsubscribes itself during publish() doesn't cause issues",
    ],
    solution: {
      typescript: `type Handler<T> = (message: T) => void;

class PubSub<T = unknown> {
  private subscribers = new Map<string, Set<Handler<T>>>();

  subscribe(topic: string, handler: Handler<T>): () => void {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, new Set());
    this.subscribers.get(topic)!.add(handler);
    return () => this.subscribers.get(topic)?.delete(handler);
  }

  publish(topic: string, message: T): void {
    for (const handler of this.subscribers.get(topic) ?? []) {
      handler(message);
    }
  }
}`,
      python: `from collections import defaultdict
from typing import Callable, TypeVar

T = TypeVar("T")


class PubSub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[Callable[[T], None]]] = defaultdict(set)

    def subscribe(self, topic: str, handler: Callable[[T], None]) -> Callable[[], None]:
        self._subscribers[topic].add(handler)
        return lambda: self._subscribers[topic].discard(handler)

    def publish(self, topic: str, message: T) -> None:
        for handler in list(self._subscribers.get(topic, ())):
            handler(message)`,
      java: `import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class PubSub<T> {
    private final Map<String, Set<Consumer<T>>> subscribers = new ConcurrentHashMap<>();

    public Runnable subscribe(String topic, Consumer<T> handler) {
        subscribers.computeIfAbsent(topic, t -> ConcurrentHashMap.newKeySet()).add(handler);
        return () -> subscribers.get(topic).remove(handler);
    }

    public void publish(String topic, T message) {
        for (Consumer<T> handler : subscribers.getOrDefault(topic, Set.of())) {
            handler.accept(message);
        }
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "pub-sub-system-design",
    required: false,
    title: "Decoupling Order Fulfillment from Everything Downstream",
    scenario: `Your e-commerce backend currently handles a new order like this: the checkout service directly calls the inventory service, then the email service, then the analytics service, then the fraud-review service — all synchronously, in the checkout request's own code path.

Checkout latency is now dominated by the slowest of these four calls, and an outage in any one of them (say, the email service) fails the entire checkout, even though a failure to send a confirmation email shouldn't block someone from completing a purchase.

Product also wants to add a fifth system soon: a loyalty-points service that needs to know about every completed order. Redesign this using pub/sub, and think through what changes and what doesn't.`,
    hints: [
      "Which of the four downstream calls actually needs to happen before checkout can respond to the user, and which don't?",
      "What does the checkout service publish, and what does it stop needing to know about once you do?",
      "Does moving to pub/sub change anything about how the loyalty-points service gets added later?",
      "What happens to a subscriber's processing if the checkout service's message broker itself goes down — does pub/sub eliminate every failure mode, or just some of them?",
      "Is there anything about payment/inventory reservation that still needs to happen synchronously, before checkout can even claim success?",
    ],
    discussionPoints: [
      "**Separate the synchronous core from the fan-out:** Payment authorization and inventory reservation likely still need to complete synchronously — checkout shouldn't claim success if the item isn't actually reserved. But email, analytics, and fraud-review don't need to block the response; publish an 'order.created' event after the synchronous core succeeds, and let those three subscribe independently.",
      "**Adding loyalty points becomes a one-line change:** With pub/sub, the loyalty-points service just subscribes to the existing 'order.created' topic — no change to the checkout service's code, unlike the current design where every new downstream system means another call added to checkout's critical path.",
      "**Latency:** Checkout latency now reflects only the synchronous core (payment + inventory) plus one publish, not the slowest of five downstream calls.",
      "**Failure isolation:** An outage in the email service no longer fails checkout — it just means that subscriber's messages queue up (if the broker is durable) or are missed (if not) until it recovers, without affecting order completion.",
      "**What pub/sub doesn't fix by itself:** The broker itself becomes a new dependency — if it's down, no events publish at all. And no individual subscriber failing mid-processing is automatically retried unless the broker/subscriber setup specifically provides that (acknowledgment + redelivery, a dead-letter queue, etc.) — pub/sub decouples the systems, it doesn't make failure handling free.",
    ],
  },
];
