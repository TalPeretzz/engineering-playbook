import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A piece of code often needs to do the same conceptual thing — calculate a price, sort a list, validate an input — in several different ways depending on context. The straightforward way to write this is one big function or method with an `if`/`else` or `switch` chain: if payment method is credit card, do X; if it's PayPal, do Y; if it's a gift card, do Z.",
      },
      {
        type: "p",
        text: "This works until the number of variants grows. Every new variant means editing that same function again — a function that keeps getting longer, riskier to touch (a change for gift cards can accidentally break the credit-card branch), and harder to test in isolation (testing the PayPal path means exercising the whole function, conditionals and all). The class or function violates the **open/closed principle**: it should be open to extension (new variants) but closed to modification (you shouldn't have to edit it every time).",
      },
      {
        type: "p",
        text: "The **Strategy pattern** fixes this by extracting each variant into its own class implementing a shared interface, and having the calling code hold a reference to whichever one it's currently using. Adding a new variant means adding a new class — the code that uses the strategy doesn't change at all.",
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
          "Define a **Strategy interface** with one method representing the behavior that varies (e.g. `pay(amount)`, `compare(a, b)`, `calculateDiscount(cart)`).",
          "Implement one **concrete strategy class** per variant, each providing its own implementation of that method.",
          "A **Context** class (the code that needs the behavior) holds a reference to a Strategy object — typically injected through its constructor or a setter — and calls the strategy's method instead of implementing the logic itself.",
          "The calling code decides which concrete strategy to hand the Context. The Context never needs to know which one it got, or how many exist.",
        ],
      },
      {
        type: "p",
        text: "The key structural point: the Context depends on the Strategy *interface*, never on any concrete strategy class. That's what makes strategies swappable and independently addable — the Context's code is completely insulated from how many strategies exist or what they do internally.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Context (Checkout)
    │
    │ holds a reference to
    ▼
«interface» PaymentStrategy
    + pay(amount)
    △
    │ implemented by:
    │
    ├── CreditCardStrategy   (+ pay(amount))
    ├── PayPalStrategy       (+ pay(amount))
    └── GiftCardStrategy     (+ pay(amount))

Context calls strategy.pay(amount) — never "which kind of strategy is this?"
Adding ApplePayStrategy later means adding one new line here.
Context and the existing strategies don't change.`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Selecting/swapping the active strategy",
        time: "O(1)",
        note: "A reference assignment",
      },
      {
        operation: "Adding a new strategy",
        time: "—",
        note: "One new class; zero changes to the Context or existing strategies",
      },
      {
        operation: "Memory",
        time: "—",
        space: "O(1) per Context instance",
        note: "Just a reference to the current strategy, not a copy of every variant",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "New variants are added without touching existing, already-tested code (open/closed principle)",
      "Each strategy is independently unit-testable in isolation, without exercising a large conditional function",
      "Eliminates duplicated conditional logic scattered across multiple places that all need to pick a variant the same way",
      "The active strategy can be swapped at runtime, not just chosen once at compile time",
    ],
    cons: [
      "More classes/files for the same behavior — overkill if there are only two variants that will never change",
      "The calling code (or some factory/registry) still has to decide which concrete strategy to construct — Strategy alone doesn't solve that selection problem",
      "Strategies that need to share state or helper logic can end up duplicating it, or pushed into a shared base class that reintroduces some of the coupling Strategy was meant to avoid",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "A method has a large conditional purely to select between several algorithms/behaviors that accomplish the same goal",
      "New variants of a behavior are added regularly, and you want adding one to not risk breaking the others",
      "The same variant-selection logic is duplicated in multiple places in the codebase",
      "You want to unit test each variant of a behavior independently",
    ],
    whenNotToUse: [
      "There are only one or two variants, and there's no real expectation of more — a simple conditional is more direct and has less indirection to follow",
      "The 'variants' don't actually share a meaningful common interface — forcing them into one just to use the pattern adds structure without benefit",
      "The behavior never changes at runtime and there's no need for runtime selection — a compile-time choice (generics, or just picking the right function) may be simpler",
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
          "**Java's `Comparator` interface** is a textbook Strategy: `Collections.sort(list, comparator)` and `Arrays.sort()` accept any `Comparator` implementation, letting callers plug in different orderings (by length, case-insensitively, by a custom field) without `Collections.sort` itself knowing anything about them.",
          "Payment processing, shipping-cost calculation, and compression/encoding libraries are common real-world homes for Strategy — anywhere a system needs to support several interchangeable algorithms for the same conceptual operation and expects that set of algorithms to grow.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Refactoring.Guru — Strategy",
            url: "https://refactoring.guru/design-patterns/strategy",
            verified: "2026-09-16",
          },
          {
            name: "Oracle Java SE 8 Docs — Comparator<T> interface",
            url: "https://docs.oracle.com/javase/8/docs/api/java/util/Comparator.html",
            verified: "2026-09-16",
            note: "A widely-used real-world Strategy interface in the standard library",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface PaymentStrategy {
  pay(amountCents: number): string;
}

class CreditCardStrategy implements PaymentStrategy {
  constructor(private cardNumber: string) {}

  pay(amountCents: number): string {
    const last4 = this.cardNumber.slice(-4);
    return \`Charged $\${(amountCents / 100).toFixed(2)} to card ending in \${last4}\`;
  }
}

class PayPalStrategy implements PaymentStrategy {
  constructor(private email: string) {}

  pay(amountCents: number): string {
    return \`Charged $\${(amountCents / 100).toFixed(2)} via PayPal account \${this.email}\`;
  }
}

class Checkout {
  constructor(private strategy: PaymentStrategy) {}

  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }

  completePurchase(amountCents: number): string {
    return this.strategy.pay(amountCents);
  }
}

// Usage
const checkout = new Checkout(new CreditCardStrategy("4111111111111234"));
console.log(checkout.completePurchase(2500)); // Charged $25.00 to card ending in 1234

checkout.setStrategy(new PayPalStrategy("alice@example.com"));
console.log(checkout.completePurchase(1000)); // Charged $10.00 via PayPal account alice@example.com`,

  python: `from abc import ABC, abstractmethod


class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount_cents: int) -> str: ...


class CreditCardStrategy(PaymentStrategy):
    def __init__(self, card_number: str) -> None:
        self.card_number = card_number

    def pay(self, amount_cents: int) -> str:
        last4 = self.card_number[-4:]
        return f"Charged \${amount_cents / 100:.2f} to card ending in {last4}"


class PayPalStrategy(PaymentStrategy):
    def __init__(self, email: str) -> None:
        self.email = email

    def pay(self, amount_cents: int) -> str:
        return f"Charged \${amount_cents / 100:.2f} via PayPal account {self.email}"


class Checkout:
    def __init__(self, strategy: PaymentStrategy) -> None:
        self.strategy = strategy

    def set_strategy(self, strategy: PaymentStrategy) -> None:
        self.strategy = strategy

    def complete_purchase(self, amount_cents: int) -> str:
        return self.strategy.pay(amount_cents)


# Usage
checkout = Checkout(CreditCardStrategy("4111111111111234"))
print(checkout.complete_purchase(2500))  # Charged $25.00 to card ending in 1234

checkout.set_strategy(PayPalStrategy("alice@example.com"))
print(checkout.complete_purchase(1000))  # Charged $10.00 via PayPal account alice@example.com`,

  java: `public interface PaymentStrategy {
    String pay(int amountCents);
}

public class CreditCardStrategy implements PaymentStrategy {
    private final String cardNumber;

    public CreditCardStrategy(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    @Override
    public String pay(int amountCents) {
        String last4 = cardNumber.substring(cardNumber.length() - 4);
        return String.format("Charged $%.2f to card ending in %s", amountCents / 100.0, last4);
    }
}

public class PayPalStrategy implements PaymentStrategy {
    private final String email;

    public PayPalStrategy(String email) {
        this.email = email;
    }

    @Override
    public String pay(int amountCents) {
        return String.format("Charged $%.2f via PayPal account %s", amountCents / 100.0, email);
    }
}

public class Checkout {
    private PaymentStrategy strategy;

    public Checkout(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    public String completePurchase(int amountCents) {
        return strategy.pay(amountCents);
    }
}

// Usage
Checkout checkout = new Checkout(new CreditCardStrategy("4111111111111234"));
System.out.println(checkout.completePurchase(2500)); // Charged $25.00 to card ending in 1234

checkout.setStrategy(new PayPalStrategy("alice@example.com"));
System.out.println(checkout.completePurchase(1000)); // Charged $10.00 via PayPal account alice@example.com`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "strategy-conceptual",
    required: true,
    question:
      "A codebase uses the Strategy pattern for payment processing (CreditCardStrategy, PayPalStrategy, both implementing PaymentStrategy). You need to add support for Apple Pay. What do you need to change in the existing Checkout (Context) class or the existing strategy classes?",
    options: [
      {
        id: "a",
        text: "Add a new `case` to a switch statement inside Checkout for the new payment type",
      },
      { id: "b", text: "Nothing — add a new ApplePayStrategy class implementing PaymentStrategy" },
      { id: "c", text: "Modify PaymentStrategy's interface to include Apple-Pay-specific fields" },
      {
        id: "d",
        text: "Update both CreditCardStrategy and PayPalStrategy to be aware of the new option",
      },
    ],
    correctOptionId: "b",
    explanation:
      "This is the entire point of the pattern: Checkout depends only on the PaymentStrategy interface, not on any concrete strategy, so it has no code that needs to change when a new variant is added. You create one new class implementing the existing interface — Checkout, CreditCardStrategy, and PayPalStrategy are all untouched. Needing to edit a switch statement (a) or touch existing strategies (c, d) would defeat the purpose of the pattern.",
  },
  {
    type: "implementation",
    id: "strategy-implementation",
    required: true,
    title: "Implement Payment Processing with the Strategy Pattern",
    description: `Implement a Strategy-based payment system:

- **PaymentStrategy** — an interface/protocol with a \`pay(amountCents)\` method returning a confirmation string.
- **CreditCardStrategy** and **PayPalStrategy** — two concrete implementations.
- **Checkout** — holds a strategy, exposes \`setStrategy(strategy)\` to swap it, and \`completePurchase(amountCents)\` which delegates to the current strategy.`,
    starterCode: {
      typescript: `interface PaymentStrategy {
  pay(amountCents: number): string;
}

class CreditCardStrategy implements PaymentStrategy {
  constructor(private cardNumber: string) {}
  pay(amountCents: number): string {
    // TODO: return a confirmation string using the last 4 digits of cardNumber
    return "";
  }
}

class PayPalStrategy implements PaymentStrategy {
  constructor(private email: string) {}
  pay(amountCents: number): string {
    // TODO: return a confirmation string mentioning the PayPal email
    return "";
  }
}

class Checkout {
  constructor(private strategy: PaymentStrategy) {}

  setStrategy(strategy: PaymentStrategy): void {
    // TODO: swap the active strategy
  }

  completePurchase(amountCents: number): string {
    // TODO: delegate to the current strategy
    return "";
  }
}`,
      python: `from abc import ABC, abstractmethod


class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount_cents: int) -> str: ...


class CreditCardStrategy(PaymentStrategy):
    def __init__(self, card_number: str) -> None:
        self.card_number = card_number

    def pay(self, amount_cents: int) -> str:
        # TODO: return a confirmation string using the last 4 digits of card_number
        return ""


class PayPalStrategy(PaymentStrategy):
    def __init__(self, email: str) -> None:
        self.email = email

    def pay(self, amount_cents: int) -> str:
        # TODO: return a confirmation string mentioning the PayPal email
        return ""


class Checkout:
    def __init__(self, strategy: PaymentStrategy) -> None:
        self.strategy = strategy

    def set_strategy(self, strategy: PaymentStrategy) -> None:
        # TODO: swap the active strategy
        pass

    def complete_purchase(self, amount_cents: int) -> str:
        # TODO: delegate to the current strategy
        return ""`,
      java: `public interface PaymentStrategy {
    String pay(int amountCents);
}

class CreditCardStrategy implements PaymentStrategy {
    private final String cardNumber;

    public CreditCardStrategy(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    @Override
    public String pay(int amountCents) {
        // TODO: return a confirmation string using the last 4 digits of cardNumber
        return "";
    }
}

class PayPalStrategy implements PaymentStrategy {
    private final String email;

    public PayPalStrategy(String email) {
        this.email = email;
    }

    @Override
    public String pay(int amountCents) {
        // TODO: return a confirmation string mentioning the PayPal email
        return "";
    }
}

public class Checkout {
    private PaymentStrategy strategy;

    public Checkout(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(PaymentStrategy strategy) {
        // TODO: swap the active strategy
    }

    public String completePurchase(int amountCents) {
        // TODO: delegate to the current strategy
        return "";
    }
}`,
    },
    hints: [
      "CreditCardStrategy and PayPalStrategy each just need to format and return a string — no shared state between them is required",
      "Checkout.setStrategy should simply reassign the stored strategy reference",
      "completePurchase should call this.strategy.pay(amountCents) (or the equivalent in your language) and return its result directly",
      "Checkout should never need an if/switch on 'what kind of strategy is this' — if you find yourself writing one, the delegation isn't set up correctly",
    ],
    solution: {
      typescript: `interface PaymentStrategy {
  pay(amountCents: number): string;
}

class CreditCardStrategy implements PaymentStrategy {
  constructor(private cardNumber: string) {}
  pay(amountCents: number): string {
    const last4 = this.cardNumber.slice(-4);
    return \`Charged $\${(amountCents / 100).toFixed(2)} to card ending in \${last4}\`;
  }
}

class PayPalStrategy implements PaymentStrategy {
  constructor(private email: string) {}
  pay(amountCents: number): string {
    return \`Charged $\${(amountCents / 100).toFixed(2)} via PayPal account \${this.email}\`;
  }
}

class Checkout {
  constructor(private strategy: PaymentStrategy) {}

  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }

  completePurchase(amountCents: number): string {
    return this.strategy.pay(amountCents);
  }
}`,
      python: `from abc import ABC, abstractmethod


class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount_cents: int) -> str: ...


class CreditCardStrategy(PaymentStrategy):
    def __init__(self, card_number: str) -> None:
        self.card_number = card_number

    def pay(self, amount_cents: int) -> str:
        last4 = self.card_number[-4:]
        return f"Charged \${amount_cents / 100:.2f} to card ending in {last4}"


class PayPalStrategy(PaymentStrategy):
    def __init__(self, email: str) -> None:
        self.email = email

    def pay(self, amount_cents: int) -> str:
        return f"Charged \${amount_cents / 100:.2f} via PayPal account {self.email}"


class Checkout:
    def __init__(self, strategy: PaymentStrategy) -> None:
        self.strategy = strategy

    def set_strategy(self, strategy: PaymentStrategy) -> None:
        self.strategy = strategy

    def complete_purchase(self, amount_cents: int) -> str:
        return self.strategy.pay(amount_cents)`,
      java: `class CreditCardStrategy implements PaymentStrategy {
    private final String cardNumber;

    public CreditCardStrategy(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    @Override
    public String pay(int amountCents) {
        String last4 = cardNumber.substring(cardNumber.length() - 4);
        return String.format("Charged $%.2f to card ending in %s", amountCents / 100.0, last4);
    }
}

class PayPalStrategy implements PaymentStrategy {
    private final String email;

    public PayPalStrategy(String email) {
        this.email = email;
    }

    @Override
    public String pay(int amountCents) {
        return String.format("Charged $%.2f via PayPal account %s", amountCents / 100.0, email);
    }
}

public class Checkout {
    private PaymentStrategy strategy;

    public Checkout(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    public String completePurchase(int amountCents) {
        return strategy.pay(amountCents);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "strategy-system-design",
    required: false,
    title: "Untangling a Pricing Engine",
    scenario: `Your e-commerce platform calculates order discounts in a single 400-line function called \`calculateDiscount(order)\`. It's a long chain of \`if\`/\`else if\` branches: first-time-customer discount, seasonal-sale discount, loyalty-tier discount, bulk-order discount, referral-code discount, and a few combinations of these that stack.

Every time marketing wants a new promotion type, someone adds another branch. Two incidents in the past quarter were caused by a change to one discount type accidentally affecting another, because they share local variables in the same function. The QA team says testing this function is one of their least favorite tasks — reaching one specific branch means constructing exactly the right order state to trigger it, often through several other branches first.

Redesign this using the Strategy pattern. What does the new structure look like, and what specifically gets easier?`,
    hints: [
      "What's the shared interface across all these discount types — what does every one of them fundamentally compute, given an order?",
      "The 400-line function currently decides which discount(s) apply *and* computes each one. Does Strategy split those two responsibilities, or just the computation part?",
      "The scenario mentions discounts that stack/combine — does a single 'pick one strategy' Context model handle that, or does it need something more?",
      "How does this redesign specifically address the QA team's complaint about needing to construct precise order states to reach one branch?",
      "Marketing adds new promotion types regularly — where does a new discount type's code live now, and who needs to review changes to it?",
    ],
    discussionPoints: [
      "**Shared interface:** Something like `DiscountStrategy { calculate(order): Money }` — every discount type takes an order and returns a discount amount, regardless of the rule behind it.",
      "**Selection is a separate concern from computation:** Strategy handles 'given a chosen discount type, compute it' — it doesn't by itself decide *which* discount types apply to a given order. That eligibility logic (is this customer first-time? are they in the loyalty program?) still needs to live somewhere, ideally as a small, focused predicate per strategy or a simple rules table, not folded back into one big function.",
      "**Stacking discounts:** Since multiple discounts can combine, the Context isn't 'hold one strategy' but 'hold a list of applicable strategies and sum (or otherwise combine) their results' — a variant sometimes called Composite Strategy. Each strategy is still independently simple; the combination logic is now its own small, testable piece instead of being tangled into all 400 lines.",
      "**Testability:** Each discount type becomes its own class with its own unit tests, constructing only the order state relevant to that one discount — no need to route through unrelated branches to reach it. This directly addresses the QA complaint.",
      "**Change isolation:** A change to the loyalty-tier discount is now a change to one class most naturally owned/reviewed by whoever works on loyalty features, instead of a diff inside a 400-line function that any change to any discount type touches.",
      "**What doesn't automatically get better:** Strategy alone doesn't validate that stacked discounts interact sensibly (e.g. that combined discounts don't exceed 100% off) — that cross-cutting business rule still needs its own explicit logic in whatever combines the strategies' results.",
    ],
  },
];
