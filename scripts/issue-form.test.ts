// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const formPath = fileURLToPath(new URL("../.github/ISSUE_TEMPLATE/feature-request.yml", import.meta.url));

// Source-text contract only; YAML syntax is checked separately with Ruby.
describe("feature request Issue Form", () => {
  it("declares the general form and only the enhancement default label", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toMatch(/^name: Feature request$/m);
    expect(source).toMatch(/^description: .+$/m);
    expect(source.match(/^labels:.*$/gm)).toEqual(["labels: [enhancement]"]);
    expect(source).not.toMatch(/status:approved|size:exception|ready-for-agent/);
  });

  it("declares unique controls in the expected order, with required answers", () => {
    const source = readFileSync(formPath, "utf8");
    expect([...source.matchAll(/^  - type: (.+)$/gm)].map((match) => match[1])).toEqual(
      Array(5).fill("textarea"),
    );
    expect([...source.matchAll(/^    id: (.+)$/gm)].map((match) => match[1])).toEqual([
      "problem", "expected-behavior", "acceptance-criteria", "context-references", "verification",
    ]);
    expect([...source.matchAll(/^      label: (.+)$/gm)].map((match) => match[1])).toEqual([
      "Problem", "Expected behavior", "Acceptance criteria", "Context/references", "Verification",
    ]);
    expect([...source.matchAll(/^      required: (.+)$/gm)].map((match) => match[1])).toEqual([
      "true", "true", "true", "false", "false",
    ]);
  });
});
