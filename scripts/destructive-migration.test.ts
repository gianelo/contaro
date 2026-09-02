// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deliberateLoss, destructiveChanges } from "./destructive-migration.js";

describe("destructiveChanges", () => {
  it("finds nothing in a migration that only adds", () => {
    expect(destructiveChanges(`CREATE TABLE "spaces" ("id" uuid PRIMARY KEY);`)).toEqual([]);
  });

  it("catches a dropped table", () => {
    expect(destructiveChanges(`DROP TABLE "spaces";`)).toEqual(["DROP TABLE"]);
  });

  it("catches a dropped column", () => {
    expect(
      destructiveChanges(`ALTER TABLE "spaces" DROP COLUMN "nickname";`),
    ).toEqual(["DROP COLUMN"]);
  });

  it("catches a required column added with no default", () => {
    expect(
      destructiveChanges(`ALTER TABLE "spaces" ADD COLUMN "slug" text NOT NULL;`),
    ).toEqual(["ADD COLUMN NOT NULL without DEFAULT"]);
  });

  it("lets a required column through when it carries a default", () => {
    expect(
      destructiveChanges(
        `ALTER TABLE "spaces" ADD COLUMN "slug" text NOT NULL DEFAULT '';`,
      ),
    ).toEqual([]);
  });

  it("weighs NOT NULL and DEFAULT per statement, not per file", () => {
    expect(
      destructiveChanges(`
        ALTER TABLE "spaces" ADD COLUMN "slug" text NOT NULL DEFAULT '';
        ALTER TABLE "spaces" ADD COLUMN "kind" text NOT NULL;
      `),
    ).toEqual(["ADD COLUMN NOT NULL without DEFAULT"]);
  });

  it("ignores a destructive change that is only mentioned in a comment", () => {
    expect(
      destructiveChanges(`
        -- DROP TABLE "spaces" is what the old plan said to do.
        /* ALTER TABLE "spaces" DROP COLUMN "nickname"; */
        CREATE TABLE "budgets" ("id" uuid PRIMARY KEY);
      `),
    ).toEqual([]);
  });
});

describe("deliberateLoss", () => {
  it("finds no reason in a migration that gives none", () => {
    expect(deliberateLoss(`DROP TABLE "spaces";`)).toBeNull();
  });

  it("reads back the reason the file gives", () => {
    expect(
      deliberateLoss(`
        -- deliberate-loss: nothing has read spaces.nickname since #31.
        ALTER TABLE "spaces" DROP COLUMN "nickname";
      `),
    ).toBe("nothing has read spaces.nickname since #31.");
  });

  it("refuses a marker with no reason after it", () => {
    expect(deliberateLoss(`-- deliberate-loss:   \nDROP TABLE "spaces";`)).toBeNull();
  });
});
