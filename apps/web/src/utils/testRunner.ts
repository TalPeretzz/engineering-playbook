// User code is dynamically executed — typed via interface contract

export type BloomFilterConstructor = new (size: number) => {
  add: (value: string) => void;
  has: (value: string) => boolean;
};

export type LruCacheConstructor = new (capacity: number) => {
  get: (key: number) => number;
  put: (key: number, value: number) => void;
};

// Using `any` intentionally — user-submitted class constructors are dynamically typed
// eslint-disable-next-line
type AnyConstructor = new (...args: any[]) => any;

export type TestCase = {
  name: string;
  run: (cls: AnyConstructor) => boolean;
};

export type TestErrorKind = "compile" | "runtime";

export type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
  errorKind?: TestErrorKind;
};

function stripTypeScript(code: string): string {
  return (
    code
      // Remove access modifiers
      .replace(/\b(private|public|protected|readonly)\s+/g, "")
      // Remove generic type args from new expressions: new Map<K, V>() → new Map()
      .replace(/\bnew\s+(\w+)\s*<[^>]*>\s*\(/g, "new $1(")
      // Remove return type annotations: ): ReturnType {
      .replace(/\)\s*:\s*[^\n({]+\s*\{/g, ") {")
      // Remove parameter type annotations — primitive types
      .replace(
        /\b(\w+)\s*:\s*(boolean\[\]|boolean|number|string|void|never|any|unknown|null|undefined)(\s*[,)])/g,
        "$1$3"
      )
      // Remove parameter type annotations — capitalized custom types (e.g. ListNode, Node)
      .replace(
        /\b(\w+)\s*:\s*[A-Z]\w*(?:<[^>]*>)?(?:\s*\|\s*(?:null|undefined|[A-Z]\w*))*(\s*[,)])/g,
        "$1$2"
      )
      // Remove class field type annotations with initializer: "  field: Type = init"
      .replace(/^(\s+[a-z_$]\w*)\s*:\s*[^=\n;]+?(\s*=)/gm, "$1$2")
      // Remove class field type annotations without initializer: "  field: Type;"
      .replace(/^(\s+[a-z_$]\w*)\s*:\s*[^;\n]+?(\s*;)/gm, "$1$2")
      // Remove null assertions: node! → node
      .replace(/(\w)\!/g, "$1")
      // Remove type assertions: value as Type
      .replace(/\bas\s+[A-Z]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:null|undefined|[A-Z]\w*))*\b/g, "")
  );
}

export function runTests(
  userCode: string,
  tests: TestCase[],
  className = "BloomFilter"
): TestResult[] {
  let Cls: AnyConstructor;

  try {
    const jsCode = stripTypeScript(userCode);
    // new Function is intentional — browser sandbox for user-submitted code
    // eslint-disable-next-line no-new-func
    const factory = new Function(`"use strict"; ${jsCode}; return ${className};`);
    Cls = factory();
    if (typeof Cls !== "function") {
      throw new Error(
        `${className} class not found — make sure your class is named ${className}`
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return tests.map((t) => ({
      name: t.name,
      passed: false,
      error: msg,
      errorKind: "compile" as TestErrorKind,
    }));
  }

  return tests.map((test) => {
    try {
      const passed = test.run(Cls);
      return { name: test.name, passed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { name: test.name, passed: false, error: msg, errorKind: "runtime" as TestErrorKind };
    }
  });
}
