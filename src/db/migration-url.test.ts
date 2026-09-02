// @vitest-environment node
import { describe, expect, it } from "vitest";
import { migrationUrl } from "./migration-url";

const pooled = "postgres://u:p@ep-cool-name-123-pooler.eu-central-1.aws.neon.tech/contaro";
const direct = "postgres://u:p@ep-cool-name-123.eu-central-1.aws.neon.tech/contaro";

describe("migrationUrl", () => {
  it("prefers the direct endpoint when there is one", () => {
    expect(
      migrationUrl({ DATABASE_URL_UNPOOLED: direct, DATABASE_URL: pooled }),
    ).toBe(direct);
  });

  it("falls back to DATABASE_URL, which is what local Postgres has", () => {
    expect(migrationUrl({ DATABASE_URL: "postgres://contaro@localhost:5434/contaro" })).toBe(
      "postgres://contaro@localhost:5434/contaro",
    );
  });

  it("refuses to migrate through Neon's pooled endpoint", () => {
    expect(() => migrationUrl({ DATABASE_URL: pooled })).toThrowError(/pooled/i);
  });

  it("names the variable to set when neither endpoint is there", () => {
    expect(() => migrationUrl({})).toThrowError(/DATABASE_URL_UNPOOLED/);
  });
});
