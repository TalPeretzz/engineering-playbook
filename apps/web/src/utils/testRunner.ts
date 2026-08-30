// User code is dynamically executed — typed via interface contract

export type BloomFilterConstructor = new (size: number) => {
  add: (value: string) => void;
  has: (value: string) => boolean;
};

export type TestCase = {
  name: string;
  run: (BloomFilter: BloomFilterConstructor) => boolean;
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
      // Remove method return type annotations: ): ReturnType {
      .replace(
        /\)\s*:\s*(void|boolean\[\]|boolean|number|string|never|any|unknown|null|undefined)\s*\{/g,
        ") {"
      )
      // Remove class field type annotations: fieldName: Type;
      .replace(
        /^(\s+\w+)\s*:\s*(boolean\[\]|boolean|number|string|never|any|unknown|null|undefined)\s*;/gm,
        "$1;"
      )
      // Remove parameter type annotations: param: Type (before , or ))
      .replace(
        /\b(\w+)\s*:\s*(boolean\[\]|boolean|number|string|never|any|unknown|null|undefined)(\s*[,)])/g,
        "$1$3"
      )
  );
}

export function runTests(userCode: string, tests: TestCase[]): TestResult[] {
  let BloomFilter: BloomFilterConstructor;

  try {
    const jsCode = stripTypeScript(userCode);
    // new Function is intentional — browser sandbox for user-submitted code
    // eslint-disable-next-line no-new-func
    const factory = new Function(`"use strict"; ${jsCode}; return BloomFilter;`);
    BloomFilter = factory() as BloomFilterConstructor;
    if (typeof BloomFilter !== "function") {
      throw new Error("BloomFilter class not found — make sure your class is named BloomFilter");
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
      const passed = test.run(BloomFilter);
      return { name: test.name, passed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { name: test.name, passed: false, error: msg, errorKind: "runtime" as TestErrorKind };
    }
  });
}
