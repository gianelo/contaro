// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "./connection";

describe("databaseUrl", () => {
  it("reads DATABASE_URL from the environment", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://x" })).toBe("postgres://x");
  });

  it("says how to fix an unset DATABASE_URL rather than failing obscurely", () => {
    expect(() => databaseUrl({})).toThrowError(/db:up/);
  });
});

describe("createDatabase", () => {
  it("builds a Drizzle instance without connecting", () => {
    const { db, sql } = createDatabase("postgres://contaro@localhost:1/none");
    expect(db.select).toBeTypeOf("function");
    void sql.end();
  });
});
