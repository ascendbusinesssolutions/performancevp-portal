import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The three packages under packages/ are pure: no IO, no platform, no clock, no randomness
// (PORTAL_BUILD_PLAN.md 1.3, docs/ENGINE_SPEC.md 5.1). The compiler enforces most of this
// through each package's tsconfig (no DOM or Node types). The rules below are the second
// guard, and they also hold the one-direction layering between the packages.

const NODE_BUILTINS = [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
];

const NO_IO = "Pure packages perform no IO and import no Node built-ins.";
const NO_PLATFORM = "Pure packages have no UI, framework or database dependency.";

const nodeBuiltinPaths = NODE_BUILTINS.flatMap((name) => [name, `${name}/promises`]).map(
  (name) => ({ name, message: NO_IO }),
);

const platformPatterns = [
  { group: ["node:*"], message: NO_IO },
  {
    group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
    message: NO_PLATFORM,
  },
  { group: ["@supabase/*", "supabase"], message: NO_PLATFORM },
];

/** Builds the import restriction for one package: Node built-ins, platform packages, and the siblings it may not import. */
function restrictedImports(siblings) {
  return [
    "error",
    {
      paths: [...nodeBuiltinPaths, ...siblings],
      patterns: platformPatterns,
    },
  ];
}

const purityRules = {
  "no-console": "error",
  "import/no-relative-packages": "error",
  "no-restricted-globals": [
    "error",
    ...[
      "process",
      "window",
      "document",
      "navigator",
      "fetch",
      "XMLHttpRequest",
      "localStorage",
      "sessionStorage",
      "setTimeout",
      "setInterval",
      "setImmediate",
      "queueMicrotask",
      "require",
      "Buffer",
      "crypto",
      "performance",
    ].map((name) => ({
      name,
      message: `Pure packages do not touch the host: ${name} is not available.`,
    })),
  ],
  "no-restricted-properties": [
    "error",
    {
      object: "Date",
      property: "now",
      message: "Pure packages take the as-at date as an input; they never read the clock.",
    },
    {
      object: "Math",
      property: "random",
      message: "Pure packages are deterministic; they never draw randomness.",
    },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=0]",
      message: "Pure packages take the as-at date as an input; new Date() reads the clock.",
    },
    {
      selector: "CallExpression[callee.name='Date'][arguments.length=0]",
      message: "Pure packages take the as-at date as an input; Date() reads the clock.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: "apps/portal/",
      },
      // react lives in apps/portal, not at the root, so the plugin cannot detect its version.
      react: {
        version: "19",
      },
    },
  },
  {
    files: ["packages/*/src/**/*.ts"],
    rules: purityRules,
  },
  {
    // The engine depends on nothing.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrictedImports([
        { name: "@performancevp/intake", message: "The engine depends on nothing." },
        { name: "@performancevp/recommendations", message: "The engine depends on nothing." },
      ]),
    },
  },
  {
    // Intake uses the engine's input types only.
    files: ["packages/intake/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrictedImports([
        {
          name: "@performancevp/engine",
          allowTypeImports: true,
          message: "Intake may import the engine's types only (PORTAL_BUILD_PLAN.md 1.3).",
        },
        {
          name: "@performancevp/recommendations",
          message: "Intake does not depend on recommendations.",
        },
      ]),
    },
  },
  {
    // Recommendations depends on the engine only, for projectImpact.
    files: ["packages/recommendations/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrictedImports([
        {
          name: "@performancevp/intake",
          message: "Recommendations depends on the engine only (PORTAL_BUILD_PLAN.md 1.3).",
        },
      ]),
    },
  },
  {
    // Every string the portal shows comes from the copy module, keyed (PORTAL_COPY_SPEC.md
    // Section 1), so the copy lint sees all of it. JSX may carry punctuation and spacing only, and
    // the attributes a reader or a screen reader meets may not hold literal text.
    files: ["apps/portal/app/**/*.tsx", "apps/portal/components/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: [" ", ",", ", ", ":", ": ", ".", "/", "(", ")", "·", "–", "+"],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|aria-description|title|placeholder|alt)$/] > Literal[value!='']",
          message: "Take this text from the copy module (apps/portal/lib/copy).",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "The content security policy allows styles by nonce only, so a style attribute is dropped in production. Use classes.",
        },
      ],
    },
  },
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
