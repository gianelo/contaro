// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import { addCategoryToSpace, catalogueForSpace } from "./categories";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

/** The database outlives a run, so every test invents its own Space. */
let next = 0;
const aSpace = async (name: string) => {
  const member = await memberFromGoogle(db, {
    subject: `categories-${process.pid}-${Date.now()}-${next++}`,
    email: `${name.toLowerCase()}@example.com`,
    name,
  });
  return createSpaceForMember(db, member.id, { name, currency: "ARS" });
};

const slugs = (branches: Awaited<ReturnType<typeof catalogueForSpace>>) =>
  branches.map((branch) => branch.category.label);

it("hands a brand new Space the whole global catalogue", async () => {
  const space = await aSpace("Nueva");

  const branches = await catalogueForSpace(db, space.id);

  expect(slugs(branches)).toContainEqual({ kind: "catalogue", slug: "food" });
  expect(slugs(branches)).toContainEqual({ kind: "catalogue", slug: "other" });
});

it("ships the catalogue with subcategories under their headings", async () => {
  const space = await aSpace("Sub");

  const branches = await catalogueForSpace(db, space.id);
  const food = branches.find(
    (branch) => branch.category.label.kind === "catalogue" &&
      branch.category.label.slug === "food",
  );

  expect(food?.children.map((child) => child.label)).toContainEqual({
    kind: "catalogue",
    slug: "food.groceries",
  });
});

it("never puts a shipped subcategory at the top of the catalogue", async () => {
  const space = await aSpace("Plana");

  const branches = await catalogueForSpace(db, space.id);

  expect(slugs(branches)).not.toContainEqual({
    kind: "catalogue",
    slug: "food.groceries",
  });
});

it("adds a Category a Member asked for to their Space", async () => {
  const space = await aSpace("Propia");

  const added = await addCategoryToSpace(db, {
    spaceId: space.id,
    parentId: null,
    name: "Mate",
  });

  expect(added).toMatchObject({
    spaceId: space.id,
    parentId: null,
    label: { kind: "own", name: "Mate" },
  });
  expect(await catalogueForSpace(db, space.id)).toContainEqual({
    category: added,
    children: [],
  });
});

it("keeps a Category added in one Space out of another", async () => {
  const hers = await aSpace("De Ana");
  const his = await aSpace("De Beto");
  const mate = await addCategoryToSpace(db, {
    spaceId: hers.id,
    parentId: null,
    name: "Mate",
  });

  const theirs = await catalogueForSpace(db, his.id);

  // Nowhere in his catalogue: not as a heading, and not hung under a shipped
  // one either.
  const everything = theirs.flatMap((branch) => [branch.category, ...branch.children]);
  expect(everything.map((category) => category.id)).not.toContain(mate.id);
  expect(everything.every((category) => category.spaceId === null)).toBe(true);
});

it("hangs a Member's own Category under a shipped one", async () => {
  const space = await aSpace("Panadería");
  const [food] = await sql`SELECT id FROM categories WHERE slug = 'food'`;

  const bakery = await addCategoryToSpace(db, {
    spaceId: space.id,
    parentId: food!.id,
    name: "Panadería",
  });

  const branches = await catalogueForSpace(db, space.id);
  const under = branches.find((branch) => branch.category.id === food!.id);

  expect(under?.children).toContainEqual(bakery);
});

it("refuses a Category under a heading belonging to another Space", async () => {
  const hers = await aSpace("Ana raíz");
  const his = await aSpace("Beto raíz");
  const mate = await addCategoryToSpace(db, {
    spaceId: hers.id,
    parentId: null,
    name: "Mate",
  });

  await expect(
    addCategoryToSpace(db, {
      spaceId: his.id,
      parentId: mate.id,
      name: "Yerba",
    }),
  ).rejects.toThrow();
});

it("refuses a Category under a subcategory, even from outside the domain", async () => {
  const space = await aSpace("Profunda");
  const [groceries] =
    await sql`SELECT id FROM categories WHERE slug = 'food.groceries'`;

  await expect(
    sql`
      INSERT INTO categories (space_id, parent_id, name)
      VALUES (${space.id}, ${groceries!.id}, 'Verdulería')
    `,
  ).rejects.toThrow(/subcategory cannot hold subcategories/i);
});

it("refuses a Category under another Space's, even from outside the domain", async () => {
  const hers = await aSpace("Ana trigger");
  const his = await aSpace("Beto trigger");
  const mate = await addCategoryToSpace(db, {
    spaceId: hers.id,
    parentId: null,
    name: "Mate",
  });

  await expect(
    sql`
      INSERT INTO categories (space_id, parent_id, name)
      VALUES (${his.id}, ${mate.id}, 'Yerba')
    `,
  ).rejects.toThrow(/another Space/i);
});

it("refuses a shipped Category that names no slug, and a Space's that names one", async () => {
  const space = await aSpace("Excluyente");

  await expect(
    sql`INSERT INTO categories (space_id, name) VALUES (NULL, 'Global a mano')`,
  ).rejects.toThrow();

  await expect(
    sql`INSERT INTO categories (space_id, slug, name) VALUES (${space.id}, 'mine', 'Mía')`,
  ).rejects.toThrow();
});

it("takes a Space's Categories with it when the Space is deleted", async () => {
  const space = await aSpace("Efímera");
  const mate = await addCategoryToSpace(db, {
    spaceId: space.id,
    parentId: null,
    name: "Mate",
  });

  await sql`DELETE FROM spaces WHERE id = ${space.id}`;

  const rows = await sql`SELECT id FROM categories WHERE id = ${mate.id}`;
  expect(rows).toEqual([]);
});

it("keeps a Member's own Category when the shipped heading it sat under is retired", async () => {
  // The one thing this table must never do. A heading is ours to retire in a
  // migration; what a Member hung off it is theirs, and once #7 lands their
  // Movements hang off that in turn.
  const space = await aSpace("Retirada");
  const [heading] =
    await sql`INSERT INTO categories (slug) VALUES ('probe.heading') RETURNING id`;
  const bakery = await addCategoryToSpace(db, {
    spaceId: space.id,
    parentId: heading!.id,
    name: "Panadería",
  });

  await sql`DELETE FROM categories WHERE id = ${heading!.id}`;

  // Still there, and standing on its own rather than under a Category that
  // no longer exists.
  const branches = await catalogueForSpace(db, space.id);
  expect(branches).toContainEqual({
    category: { ...bakery, parentId: null },
    children: [],
  });
});

it("leaves the global catalogue standing when a Space is deleted", async () => {
  const space = await aSpace("Inocua");

  await sql`DELETE FROM spaces WHERE id = ${space.id}`;

  const rows = await sql`SELECT id FROM categories WHERE slug = 'food'`;
  expect(rows).toHaveLength(1);
});

it("refuses a Category a Member cannot name", async () => {
  const space = await aSpace("Sin nombre");

  await expect(
    addCategoryToSpace(db, { spaceId: space.id, parentId: null, name: "  " }),
  ).rejects.toThrow();
});
