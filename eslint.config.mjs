import path from "node:path";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noOutsideImports from "./eslint-rules/no-outside-imports.js";

// Absolute, so the rule still fires when eslint is run from a subdirectory.
const domainDir = path.join(import.meta.dirname, "src/domain");

// tsconfig.json sets allowJs and includes .mts, so the boundary has to cover
// every extension that can end up in the domain, not just .ts/.tsx.
const domainFiles = "src/domain/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}";
const domainTests = "src/domain/**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ADR-0005. Enforced by lint, not by convention: the seam the whole
    // testing strategy rests on cannot survive on good intentions.
    files: [domainFiles],
    plugins: {
      domain: { rules: { "no-outside-imports": noOutsideImports } },
    },
    rules: {
      "domain/no-outside-imports": ["error", { domainDir }],
    },
  },
  {
    // ADR-0005 rests on "almost all tests drive the domain directly", so a
    // domain test must be able to import its test runner — and nothing else.
    files: [domainTests],
    rules: {
      "domain/no-outside-imports": ["error", { domainDir, allow: ["vitest"] }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
