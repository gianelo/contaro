import path from "node:path";
import { ESLint, RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import noOutsideImports from "./no-outside-imports.js";

const projectRoot = path.resolve(import.meta.dirname, "..");
const domainDir = path.join(projectRoot, "src/domain");
const inDomain = (relative: string) => path.join(domainDir, relative);

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

// RuleTester registers its own describe/it, so it must not be nested in one.
ruleTester.run("no-outside-imports", noOutsideImports, {
  valid: [
    {
      name: "a sibling module inside the domain",
      filename: inDomain("budget/pace.ts"),
      code: `import { spread } from "./spread";`,
    },
    {
      name: "a parent module still inside the domain",
      filename: inDomain("budget/pace.ts"),
      code: `import { Money } from "../money";`,
    },
    {
      name: "a node: builtin",
      filename: inDomain("money.ts"),
      code: `import assert from "node:assert";`,
    },
    {
      name: "an explicitly allowed package",
      filename: inDomain("money.test.ts"),
      code: `import { it } from "vitest";`,
      options: [{ allow: ["vitest"] }],
    },
    {
      name: "a file outside the domain may import anything",
      filename: path.join(projectRoot, "src/app/page.tsx"),
      code: `import { db } from "@/db/connection";`,
    },
  ],
  invalid: [
    {
      name: "react",
      filename: inDomain("money.ts"),
      code: `import { useState } from "react";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "next",
      filename: inDomain("money.ts"),
      code: `import { redirect } from "next/navigation";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "the database client, by alias",
      filename: inDomain("money.ts"),
      code: `import { db } from "@/db/connection";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a relative path that escapes the domain",
      filename: inDomain("budget/pace.ts"),
      code: `import { db } from "../../db/connection";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a re-export from outside the domain",
      filename: inDomain("index.ts"),
      code: `export { db } from "../db/connection";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a literal dynamic import from outside the domain",
      filename: inDomain("money.ts"),
      code: `const m = await import("drizzle-orm");`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a bare builtin without the node: prefix",
      filename: inDomain("money.ts"),
      code: `import fs from "fs";`,
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a package the allow list does not name",
      filename: inDomain("money.test.ts"),
      code: `import { render } from "@testing-library/react";`,
      options: [{ allow: ["vitest"] }],
      errors: [{ messageId: "outsideImport" }],
    },
    {
      name: "a dynamic import whose specifier cannot be read",
      filename: inDomain("money.ts"),
      code: `const dep = "react"; const m = await import(dep);`,
      errors: [{ messageId: "unresolvable" }],
    },
    {
      name: "createRequire, which would load anything at all",
      filename: inDomain("money.ts"),
      code: `import { createRequire } from "node:module";`,
      errors: [{ messageId: "escapeHatch" }],
    },
    {
      name: "a bare require call",
      filename: inDomain("money.js"),
      code: `const react = require("react");`,
      errors: [{ messageId: "outsideImport" }],
    },
  ],
});

/**
 * The rule is worth nothing unless the project's real config runs it over
 * every file that can end up in the domain. tsconfig.json sets allowJs and
 * includes .mts, so .ts alone is not the boundary.
 */
describe("the project's own lint config", () => {
  const eslint = new ESLint({ cwd: projectRoot });

  const lint = async (filename: string, code: string) => {
    const [result] = await eslint.lintText(code, {
      filePath: inDomain(filename),
    });
    return (result?.messages ?? []).filter(
      (message) => message.ruleId === "domain/no-outside-imports",
    );
  };

  it.each([
    ["__probe__.ts", `import { useState } from "react";`],
    ["__probe__.tsx", `import { useState } from "react";`],
    ["__probe__.js", `import { useState } from "react";`],
    ["__probe__.mjs", `import { useState } from "react";`],
    ["__probe__.mts", `import { useState } from "react";`],
    ["nested/deep/__probe__.ts", `import { db } from "../../../db/connection";`],
    ["__probe__.ts", `const dep = "react"; await import(dep);`],
    [
      "__probe__.ts",
      `import { createRequire } from "node:module";\nexport const r = createRequire(import.meta.url);`,
    ],
  ])("fails on %s: %s", async (filename, code) => {
    expect(await lint(filename, code)).not.toHaveLength(0);
  });

  it("lets a domain file import a node: builtin", async () => {
    expect(await lint("__probe__.ts", `import assert from "node:assert";`))
      .toHaveLength(0);
  });

  it("lets a domain test import its test runner, and nothing more", async () => {
    expect(
      await lint("__probe__.test.ts", `import { it } from "vitest";`),
    ).toHaveLength(0);

    expect(
      await lint("__probe__.test.ts", `import { useState } from "react";`),
    ).not.toHaveLength(0);
  });
});
