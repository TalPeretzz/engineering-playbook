import type { SceneSection } from "@engineering-playbook/content-schema";

/**
 * Animated walkthrough: one nightly billing job, three workers, one ZooKeeper
 * ensemble. Follows the ZooKeeper election recipe (ephemeral sequential
 * znodes, watch-your-predecessor) and closes the zombie-leader gap with a
 * fencing token, matching the lesson's tradeoffs and production sections.
 */
export const walkthrough: SceneSection = {
  type: "scene",
  id: "walkthrough",
  heading: "Walkthrough",
  scenario:
    "Every night at 02:00 a billing job charges each customer **once**. Three identical workers can run it.",
  nodes: [
    { id: "zk", label: "ZooKeeper", kind: "coordinator", x: 320, y: 62, sublabel: "/election" },
    { id: "a", label: "Worker A", kind: "worker", x: 120, y: 190 },
    { id: "b", label: "Worker B", kind: "worker", x: 320, y: 190 },
    { id: "c", label: "Worker C", kind: "worker", x: 520, y: 190 },
    { id: "db", label: "Billing DB", kind: "database", x: 320, y: 312 },
  ],
  edges: [
    { id: "a-zk", from: "a", to: "zk" },
    { id: "b-zk", from: "b", to: "zk" },
    { id: "c-zk", from: "c", to: "zk" },
    { id: "a-db", from: "a", to: "db" },
    { id: "b-db", from: "b", to: "db" },
    { id: "c-db", from: "c", to: "db" },
  ],
  metrics: [
    { id: "leaders", label: "Leaders" },
    { id: "charges", label: "Charges / customer" },
    { id: "woken", label: "Woken on failover" },
    { id: "term", label: "Leader term" },
  ],
  objectives: [
    { id: "exactly-one", text: "Why some work needs exactly one owner" },
    { id: "hardcode", text: "Why a hardcoded leader isn't enough" },
    { id: "lowest", text: "How the lowest sequence number wins" },
    { id: "herd", text: "Why you watch only your predecessor" },
    { id: "session", text: "How a dead leader is detected" },
    { id: "fencing", text: "How fencing tokens stop a zombie leader" },
  ],
  steps: [
    {
      id: "everyone-runs",
      short: "Everyone",
      title: "Three workers, one job",
      stage: "problem",
      body: [
        "You scaled the billing service to three workers for availability. Each one has the same cron entry, so at 02:00 **all three** start the job.",
        "Every customer gets charged three times.",
      ],
      keyIdea:
        "Some work must be done by **exactly one** node at a time. Running more copies doesn't make it safer — it makes it wrong.",
      nodes: {
        zk: { hidden: true },
        a: { tone: "warning" },
        b: { tone: "warning" },
        c: { tone: "warning" },
        db: { tone: "danger" },
      },
      messages: [
        { edge: "a-db", label: "charge $20" },
        { edge: "b-db", label: "charge $20" },
        { edge: "c-db", label: "charge $20" },
      ],
      metrics: { leaders: "3 (all)", charges: "3×" },
      completes: ["exactly-one"],
    },
    {
      id: "hardcoded",
      short: "Hardcode",
      title: "Just pick A in the config?",
      stage: "problem",
      body: [
        "The quick fix: set `BILLING_LEADER=worker-a`. Now only A runs the job, and B and C sit idle.",
        "That works until A is down at 02:00. Nobody else is allowed to take over, so the job silently doesn't run.",
      ],
      keyIdea:
        "A fixed leader removes duplicates but brings back the single point of failure you scaled out to avoid.",
      changes: [
        { kind: "change", text: "A is the leader by configuration" },
        { kind: "remove", text: "A crashes — billing is skipped" },
      ],
      nodes: {
        a: { tone: "danger", badge: "DOWN", sublabel: "leader by config" },
        b: { tone: "muted", sublabel: "not allowed" },
        c: { tone: "muted", sublabel: "not allowed" },
        db: { tone: "neutral" },
      },
      metrics: { leaders: "0", charges: "0× (missed)" },
      completes: ["hardcode"],
    },
    {
      id: "register",
      short: "Register",
      title: "Every worker registers with a coordinator",
      stage: "mechanism",
      body: [
        "Instead of choosing the leader yourself, let the nodes **agree** through a strongly consistent coordination service: ZooKeeper here, but etcd and Consul work the same way.",
        "On startup, each worker creates an **ephemeral sequential** znode under `/election`. ZooKeeper appends a strictly increasing number, so every candidate gets a unique place in line.",
      ],
      keyIdea:
        "Ephemeral means the znode is tied to the worker's session. If the worker dies, its znode disappears by itself.",
      changes: [
        { kind: "add", text: "ZooKeeper ensemble" },
        { kind: "add", text: "One ephemeral sequential znode per worker" },
      ],
      nodes: {
        zk: { hidden: false },
        a: { tone: "neutral", badge: "", sublabel: "n_001" },
        b: { tone: "neutral", sublabel: "n_002" },
        c: { tone: "neutral", sublabel: "n_003" },
      },
      messages: [
        { edge: "a-zk", label: "create n_001" },
        { edge: "b-zk", label: "create n_002" },
        { edge: "c-zk", label: "create n_003" },
      ],
      metrics: { leaders: "?", charges: "—" },
    },
    {
      id: "lowest-wins",
      short: "Elect",
      title: "Lowest number wins",
      stage: "mechanism",
      body: [
        "Each worker lists the children of `/election`. The one holding the **lowest** sequence number is the leader. Here that's A with `n_001`.",
        "No voting between workers is needed: ZooKeeper has already ordered them consistently, so all three reach the same answer.",
      ],
      changes: [{ kind: "add", text: "A becomes leader for term 1" }],
      nodes: {
        a: { tone: "leader", badge: "LEADER", sublabel: "n_001 · lowest" },
      },
      messages: [{ edge: "a-zk", reverse: true, kind: "response", label: "you're lowest" }],
      metrics: { leaders: "1", term: "1" },
      completes: ["lowest"],
    },
    {
      id: "watch",
      short: "Watch",
      title: "Watch only the node in front of you",
      stage: "mechanism",
      body: [
        "B and C aren't leader, so they wait. Each one sets a **watch** on the znode directly ahead of it: B watches `n_001` and C watches `n_002`.",
        "If everyone watched the leader instead, a single crash would wake every waiting node at once and they'd all hit ZooKeeper together: a **thundering herd**.",
      ],
      keyIdea: "Each failure should wake exactly one node: the next in line.",
      changes: [
        { kind: "add", text: "B watches n_001" },
        { kind: "add", text: "C watches n_002 (not the leader)" },
      ],
      nodes: {
        b: { sublabel: "n_002 · watches 001" },
        c: { sublabel: "n_003 · watches 002" },
      },
      messages: [
        { edge: "b-zk", kind: "heartbeat", label: "watch n_001" },
        { edge: "c-zk", kind: "heartbeat", label: "watch n_002" },
      ],
      completes: ["herd"],
    },
    {
      id: "leader-works",
      short: "Run",
      title: "The leader runs the job — once",
      stage: "solution",
      body: [
        "At 02:00 only A runs billing. Every customer is charged once.",
        "In the background, all three workers keep their ZooKeeper **sessions** alive with periodic heartbeats. That session is what keeps each ephemeral znode in place.",
      ],
      changes: [{ kind: "change", text: "Charges per customer: 3× → 1×" }],
      nodes: { db: { tone: "success" } },
      messages: [
        { edge: "a-db", label: "charge · term 1" },
        { edge: "a-zk", kind: "heartbeat", label: "session ok" },
      ],
      metrics: { charges: "1×" },
    },
    {
      id: "crash",
      short: "Crash",
      title: "The leader crashes",
      stage: "failure",
      body: [
        "A's machine loses power. Its heartbeats stop, and once the **session timeout** passes, ZooKeeper expires the session and deletes `n_001`.",
        "Nobody had to write failure-detection code. Detection comes from the coordination layer, and the timeout is the window during which there is no leader.",
      ],
      keyIdea:
        "Session timeout trades failover speed against false alarms. A shorter timeout means faster recovery but more spurious elections.",
      changes: [
        { kind: "remove", text: "A's session expired" },
        { kind: "remove", text: "znode n_001 deleted automatically" },
      ],
      nodes: {
        a: { tone: "danger", badge: "DOWN", sublabel: "session expired" },
        zk: { sublabel: "n_001 deleted" },
        db: { tone: "neutral" },
      },
      edges: { "a-zk": { tone: "danger" } },
      messages: [{ edge: "a-zk", kind: "failure", label: "no heartbeat" }],
      metrics: { leaders: "0" },
      completes: ["session"],
    },
    {
      id: "failover",
      short: "Failover",
      title: "Only B wakes up",
      stage: "solution",
      body: [
        "B's watch on `n_001` fires. B lists `/election` again, sees that `n_002` is now the lowest, and becomes leader for **term 2**.",
        "C was watching `n_002`, which still exists, so C is never woken. Failover touched one node, not the whole cluster.",
      ],
      changes: [
        { kind: "add", text: "B is leader for term 2" },
        { kind: "change", text: "C undisturbed" },
      ],
      nodes: {
        b: { tone: "leader", badge: "LEADER", sublabel: "n_002 · lowest" },
        c: { sublabel: "n_003 · still asleep" },
        zk: { sublabel: "/election" },
      },
      messages: [{ edge: "b-zk", reverse: true, kind: "response", label: "n_001 gone" }],
      metrics: { leaders: "1", woken: "1 of 2", term: "2" },
    },
    {
      id: "zombie",
      short: "Zombie",
      title: "The old leader wasn't dead",
      stage: "failure",
      body: [
        "Plot twist: A hadn't crashed. It was stuck in a 40-second GC pause. Its session expired, but A has no idea yet. It wakes up still believing it's the leader and carries on charging.",
        "For a moment there are **two leaders**. Leader election alone can't prevent this, because A acts before it notices it was replaced.",
      ],
      keyIdea:
        "Election tells the cluster who the leader is. It doesn't stop a stale leader that hasn't heard the news yet.",
      changes: [{ kind: "add", text: "A resumes with a stale belief: term 1" }],
      nodes: {
        a: { tone: "warning", badge: "ZOMBIE", sublabel: "thinks term 1" },
        db: { tone: "danger" },
      },
      edges: { "a-zk": { tone: "neutral" } },
      messages: [
        { edge: "a-db", label: "charge · term 1" },
        { edge: "b-db", label: "charge · term 2" },
      ],
      metrics: { leaders: "2 (!)", charges: "2× risk" },
    },
    {
      id: "fencing",
      short: "Fence",
      title: "Fencing tokens: the resource says no",
      stage: "solution",
      body: [
        "Every write carries the leader's **term**, a monotonically increasing number (for example the znode's `zxid` in ZooKeeper, or the key's revision in etcd). The billing DB remembers the highest term it has seen and rejects anything older.",
        "B's write with term 2 is accepted. A's write with term 1 is refused, A learns it was deposed, and it steps down.",
      ],
      keyIdea:
        "The final safety check belongs at the **resource**, not the leader. A stale leader can't overrule a number it has already lost to.",
      changes: [
        { kind: "add", text: "DB enforces max term = 2" },
        { kind: "remove", text: "A's term-1 write rejected" },
      ],
      nodes: {
        db: { tone: "success", sublabel: "max term = 2" },
        a: { tone: "muted", badge: "", sublabel: "stepping down" },
      },
      edges: { "a-db": { tone: "danger" } },
      messages: [
        { edge: "a-db", reverse: true, kind: "failure", label: "reject 1 < 2" },
        { edge: "b-db", label: "charge · term 2" },
      ],
      metrics: { leaders: "1", charges: "1×" },
      completes: ["fencing"],
    },
    {
      id: "recap",
      short: "Recap",
      title: "What it took to run a job exactly once",
      stage: "recap",
      body: [
        "**Agree, don't assume:** a consistent coordinator orders candidates, and the lowest sequence number leads.",
        "**Detect through sessions:** ephemeral znodes vanish with their owner, so nobody hand-rolls heartbeats.",
        "**Wake one node:** watching your predecessor turns every failover into a single notification.",
        "**Fence at the resource:** terms make a zombie leader harmless. A rejoins as a regular candidate (`n_004`).",
      ],
      nodes: {
        a: { tone: "neutral", sublabel: "n_004 · watches 003" },
        db: { tone: "neutral" },
      },
      edges: { "a-db": { tone: "neutral" } },
      messages: [
        { edge: "a-zk", kind: "request", label: "create n_004" },
        { edge: "b-zk", kind: "heartbeat", label: "session ok" },
      ],
    },
  ],
};
