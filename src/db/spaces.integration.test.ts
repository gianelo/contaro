// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import {
  createSpaceForMember,
  findSpaceForMember,
  lastOpenedSpace,
  listSpacesForMember,
  markSpaceOpened,
} from "./spaces";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

/** The database outlives a run, so every test invents its own Member. */
let next = 0;
const aMember = async (name: string) =>
  memberFromGoogle(db, {
    subject: `spaces-${process.pid}-${Date.now()}-${next++}`,
    email: `${name.toLowerCase()}@example.com`,
    name,
  });

it("creates a Space with the name and currency it was given", async () => {
  const ana = await aMember("Ana");

  const space = await createSpaceForMember(db, ana.id, {
    name: "Casa",
    currency: "ARS",
  });

  expect(space).toMatchObject({ name: "Casa", currency: "ARS" });
  expect(space.id).toEqual(expect.any(String));
});

it("puts the creator inside the Space it just made", async () => {
  const beto = await aMember("Beto");

  const space = await createSpaceForMember(db, beto.id, {
    name: "Personal",
    currency: "ARS",
  });

  await expect(findSpaceForMember(db, space.id, beto.id)).resolves.toEqual(
    space,
  );
});

it("does not hand a Space to someone who is not in it", async () => {
  const cami = await aMember("Cami");
  const dani = await aMember("Dani");
  const space = await createSpaceForMember(db, cami.id, {
    name: "Casa",
    currency: "ARS",
  });

  await expect(findSpaceForMember(db, space.id, dani.id)).resolves.toBeNull();
});

it("does not resolve an id no Space has", async () => {
  const eli = await aMember("Eli");

  await expect(
    findSpaceForMember(db, "3f2b0c1e-0000-4000-8000-00000000dead", eli.id),
  ).resolves.toBeNull();
});

it("answers an identifier that is not a uuid at all, rather than failing", async () => {
  const fede = await aMember("Fede");

  await expect(
    findSpaceForMember(db, "nuevo", fede.id),
  ).resolves.toBeNull();
});

it("refuses to create a Space in a currency contaro does not offer", async () => {
  const gaby = await aMember("Gaby");

  await expect(
    createSpaceForMember(db, gaby.id, { name: "Casa", currency: "XYZ" }),
  ).rejects.toThrow();
});

it("writes nothing at all when the Space is refused", async () => {
  const hugo = await aMember("Hugo");

  await createSpaceForMember(db, hugo.id, { name: "Casa", currency: "ARS" });
  await expect(
    createSpaceForMember(db, hugo.id, { name: "  ", currency: "ARS" }),
  ).rejects.toThrow();

  const rows = await sql`
    SELECT count(*)::int AS count FROM space_members WHERE member_id = ${hugo.id}
  `;
  expect(rows[0]?.count).toBe(1);
});

it("guards the currency without freezing the rest of the Space", async () => {
  const ines = await aMember("Ines");
  const space = await createSpaceForMember(db, ines.id, {
    name: "Casa",
    currency: "ARS",
  });

  // A trigger that refused every UPDATE would pass the test below and break
  // the rename #5 needs, so the guard is measured against what it must let by.
  await sql`UPDATE spaces SET name = 'Casa nueva' WHERE id = ${space.id}`;

  await expect(findSpaceForMember(db, space.id, ines.id)).resolves.toMatchObject(
    { name: "Casa nueva" },
  );
});

it("refuses to change a Space's currency, even from outside the domain", async () => {
  const juan = await aMember("Juan");
  const space = await createSpaceForMember(db, juan.id, {
    name: "Casa",
    currency: "ARS",
  });

  await expect(
    sql`UPDATE spaces SET currency = 'USD' WHERE id = ${space.id}`,
  ).rejects.toThrow(/never be changed/i);

  await expect(findSpaceForMember(db, space.id, juan.id)).resolves.toMatchObject(
    { currency: "ARS" },
  );
});

it("lists the Space a Member created, with themselves on it", async () => {
  const kari = await aMember("Kari");
  const space = await createSpaceForMember(db, kari.id, {
    name: "Personal",
    currency: "ARS",
  });

  await expect(listSpacesForMember(db, kari.id)).resolves.toEqual([
    { space, members: [{ id: kari.id, name: "Kari" }] },
  ]);
});

it("lists nothing for a Member who is in no Space", async () => {
  const lea = await aMember("Lea");

  await expect(listSpacesForMember(db, lea.id)).resolves.toEqual([]);
});

it("does not list a Space the Member is not in", async () => {
  const mora = await aMember("Mora");
  const nico = await aMember("Nico");
  const hers = await createSpaceForMember(db, mora.id, {
    name: "Casa de Mora",
    currency: "ARS",
  });
  await createSpaceForMember(db, nico.id, {
    name: "Casa de Nico",
    currency: "USD",
  });

  await expect(listSpacesForMember(db, mora.id)).resolves.toEqual([
    { space: hers, members: [{ id: mora.id, name: "Mora" }] },
  ]);
});

it("names everyone in a Space on its row, not only the Member asking", async () => {
  const olga = await aMember("Olga");
  const pipo = await aMember("Pipo");
  const space = await createSpaceForMember(db, olga.id, {
    name: "Casa",
    currency: "ARS",
  });
  // #9 brings the invitation; the row has to name a second Member before then,
  // or the screen that tells the shared Space from the personal one is untested.
  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${pipo.id})
  `;

  const [row] = await listSpacesForMember(db, olga.id);

  expect(row?.members).toEqual([
    { id: olga.id, name: "Olga" },
    { id: pipo.id, name: "Pipo" },
  ]);
});

it("orders a Member's Spaces by when they joined them", async () => {
  const rita = await aMember("Rita");
  const first = await createSpaceForMember(db, rita.id, {
    name: "Personal",
    currency: "ARS",
  });
  const second = await createSpaceForMember(db, rita.id, {
    name: "Casa",
    currency: "USD",
  });

  const listed = await listSpacesForMember(db, rita.id);

  // Not alphabetical: a list that reshuffles when a Space is renamed moves the
  // row a person's thumb has learned to reach for.
  expect(listed.map((row) => row.space.id)).toEqual([first.id, second.id]);
});

it("keeps two Spaces of the same Member apart, down to the currency", async () => {
  const sofi = await aMember("Sofi");
  const pesos = await createSpaceForMember(db, sofi.id, {
    name: "Casa",
    currency: "ARS",
  });
  const dolares = await createSpaceForMember(db, sofi.id, {
    name: "Viaje",
    currency: "USD",
  });

  const listed = await listSpacesForMember(db, sofi.id);

  expect(listed.map((row) => row.space)).toEqual([
    { id: pesos.id, name: "Casa", currency: "ARS" },
    { id: dolares.id, name: "Viaje", currency: "USD" },
  ]);
});

/*
 * Which Space is the one being used (#38). A moment per membership row rather
 * than a flag, so the only way it can be wrong is by not having been written.
 */

it("has no Space being used until a Member has opened one", async () => {
  const nadia = await aMember("Nadia");
  await createSpaceForMember(db, nadia.id, { name: "Casa", currency: "ARS" });

  // Joining a Space is not opening it: a badge on a Space nobody has ever
  // been inside is a statement nothing supports.
  await expect(lastOpenedSpace(db, nadia.id)).resolves.toBeNull();
});

it("remembers the Space a Member opened last", async () => {
  const omar = await aMember("Omar");
  const casa = await createSpaceForMember(db, omar.id, {
    name: "Casa",
    currency: "ARS",
  });
  const viaje = await createSpaceForMember(db, omar.id, {
    name: "Viaje",
    currency: "USD",
  });

  await markSpaceOpened(db, casa.id, omar.id);
  await markSpaceOpened(db, viaje.id, omar.id);

  await expect(lastOpenedSpace(db, omar.id)).resolves.toBe(viaje.id);
});

it("moves the answer when a Member goes back to an older Space", async () => {
  const pia = await aMember("Pia");
  const casa = await createSpaceForMember(db, pia.id, {
    name: "Casa",
    currency: "ARS",
  });
  const viaje = await createSpaceForMember(db, pia.id, {
    name: "Viaje",
    currency: "USD",
  });

  await markSpaceOpened(db, viaje.id, pia.id);
  await markSpaceOpened(db, casa.id, pia.id);

  await expect(lastOpenedSpace(db, pia.id)).resolves.toBe(casa.id);
});

it("keeps one Member's answer out of another's", async () => {
  const rita = await aMember("Rita");
  const saul = await aMember("Saul");
  const hers = await createSpaceForMember(db, rita.id, {
    name: "Casa de Rita",
    currency: "ARS",
  });
  await createSpaceForMember(db, saul.id, {
    name: "Casa de Saul",
    currency: "ARS",
  });

  await markSpaceOpened(db, hers.id, rita.id);

  // The column is on the membership row for exactly this: two Members of one
  // shared Space each came back at their own moment, and a column on the Space
  // would have one of them telling the other where they had been.
  await expect(lastOpenedSpace(db, rita.id)).resolves.toBe(hers.id);
  await expect(lastOpenedSpace(db, saul.id)).resolves.toBeNull();
});

it("writes nothing for a Member who is not in the Space", async () => {
  const tere = await aMember("Tere");
  const ugo = await aMember("Ugo");
  const hers = await createSpaceForMember(db, tere.id, {
    name: "Casa de Tere",
    currency: "ARS",
  });

  await markSpaceOpened(db, hers.id, ugo.id);

  await expect(lastOpenedSpace(db, ugo.id)).resolves.toBeNull();
});

it("refuses an identifier that is not one, rather than erroring on it", async () => {
  const vera = await aMember("Vera");

  // A path segment is any string at all, and Postgres answers a malformed
  // uuid with an error rather than an empty update.
  await expect(
    markSpaceOpened(db, "not-a-uuid", vera.id),
  ).resolves.toBeUndefined();
});
