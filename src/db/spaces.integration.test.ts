// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
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
    { id: pesos.id, name: "Casa", currency: "ARS", createdBy: sofi.id },
    { id: dolares.id, name: "Viaje", currency: "USD", createdBy: sofi.id },
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

/*
 * Who created it (#116, ADR-0051).
 *
 * The database owns this rather than the domain alone, for the reason 0002
 * owns the currency: two acts rest on the answer, and a rule only `createSpace`
 * knows about is a rule that survives until the second writer.
 */

it("remembers the Member who created it", async () => {
  const sara = await aMember("Sara");

  const space = await createSpaceForMember(db, sara.id, {
    name: "Casa",
    currency: "ARS",
  });

  expect(space.createdBy).toBe(sara.id);
});

it("gives both Members the same answer about who created it", async () => {
  const tino = await aMember("Tino");
  const uma = await aMember("Uma");
  const space = await createSpaceForMember(db, tino.id, {
    name: "Casa",
    currency: "ARS",
  });

  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${uma.id})
  `;

  // Read by the invited Member, so the trigger that fills an empty column
  // cannot be promoting whoever asks last.
  await expect(findSpaceForMember(db, space.id, uma.id)).resolves.toMatchObject(
    { createdBy: tino.id },
  );
});

it("recovers the creator of a Space written without one", async () => {
  const vero = await aMember("Vero");

  // The window ADR-0008 opens: migrations run from CI while Vercel deploys in
  // parallel, so for a few minutes the code inserting here has never heard of
  // the column. The first Member seated is the answer, and 0015's trigger is
  // what writes it down.
  const [written] = await sql<{ id: string }[]>`
    INSERT INTO spaces (name, currency) VALUES ('Casa', 'ARS') RETURNING id
  `;
  const spaceId = written!.id;
  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${spaceId}, ${vero.id})
  `;

  await expect(findSpaceForMember(db, spaceId, vero.id)).resolves.toMatchObject(
    { createdBy: vero.id },
  );
});

it("does not hand the creation over to the Member seated second", async () => {
  const walt = await aMember("Walt");
  const xime = await aMember("Xime");
  const space = await createSpaceForMember(db, walt.id, {
    name: "Casa",
    currency: "ARS",
  });

  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${xime.id})
  `;

  await expect(
    findSpaceForMember(db, space.id, walt.id),
  ).resolves.toMatchObject({ createdBy: walt.id });
});

it("refuses to change who created a Space, even from outside the domain", async () => {
  const yani = await aMember("Yani");
  const zoe = await aMember("Zoe");
  const space = await createSpaceForMember(db, yani.id, {
    name: "Casa",
    currency: "ARS",
  });

  await expect(
    sql`UPDATE spaces SET created_by = ${zoe.id} WHERE id = ${space.id}`,
  ).rejects.toThrow(/never be changed/i);

  await expect(
    findSpaceForMember(db, space.id, yani.id),
  ).resolves.toMatchObject({ createdBy: yani.id });
});

it("guards the creator without freezing the rest of the Space", async () => {
  const abel = await aMember("Abel");
  const space = await createSpaceForMember(db, abel.id, {
    name: "Casa",
    currency: "ARS",
  });

  // The same measurement the currency guard gets: a trigger that refused every
  // UPDATE would pass the test above and break the rename #5 needs.
  await sql`UPDATE spaces SET name = 'Casa nueva' WHERE id = ${space.id}`;

  await expect(
    findSpaceForMember(db, space.id, abel.id),
  ).resolves.toMatchObject({ name: "Casa nueva", createdBy: abel.id });
});

/**
 * The two signals compared, run as the migration ships it.
 *
 * The block is read out of `0015` rather than retyped here, because a copy of
 * the query is a copy that goes on passing after the shipped one stops being
 * right. It only reads and raises, so running it a second time changes
 * nothing.
 */
const disagreementCheck = () => {
  const sql = readFileSync(
    path.join(
      import.meta.dirname,
      "migrations",
      "0015_a_space_remembers_who_created_it.sql",
    ),
    "utf8",
  );
  const block = /DO \$\$\s*\n\s*DECLARE\s*\n\s*disagreeing[\s\S]*?END \$\$;/.exec(sql);
  if (!block) throw new Error("Migration 0015 no longer holds the check this tests.");
  return block[0];
};

const warningsFrom = async (statement: string): Promise<string> => {
  const heard: string[] = [];
  const listening = createDatabase(databaseUrl(), {
    max: 1,
    onnotice: (notice) => heard.push(notice.message ?? ""),
  });

  try {
    await listening.sql.unsafe(statement);
  } finally {
    await listening.sql.end();
  }

  return heard.join("\n");
};

it("names the Spaces whose two signals disagree about who created them", async () => {
  const nadia = await aMember("Nadia");
  const omar = await aMember("Omar");
  const space = await createSpaceForMember(db, nadia.id, {
    name: "Casa",
    currency: "ARS",
  });

  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${omar.id})
  `;
  // The Invitation says Omar did the inviting, and the membership rows say
  // Nadia was seated first. Two honest signals that cannot both be right, which
  // is the case #116 asked to have surfaced rather than resolved in silence.
  await sql`
    INSERT INTO space_invitations (space_id, email, invited_by, status, resolved_at)
    VALUES (${space.id}, 'omar-invited@example.com', ${omar.id}, 'accepted', now())
  `;

  await expect(warningsFrom(disagreementCheck())).resolves.toContain(space.id);
});

it("says nothing about a Space whose two signals agree", async () => {
  const pablo = await aMember("Pablo");
  const quena = await aMember("Quena");
  const space = await createSpaceForMember(db, pablo.id, {
    name: "Casa",
    currency: "ARS",
  });

  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${quena.id})
  `;
  await sql`
    INSERT INTO space_invitations (space_id, email, invited_by, status, resolved_at)
    VALUES (${space.id}, 'quena-invited@example.com', ${pablo.id}, 'accepted', now())
  `;

  // Measured against what the check must let by, the way the currency guard is:
  // one that named every Space would pass the test above and say nothing.
  await expect(warningsFrom(disagreementCheck())).resolves.not.toContain(
    space.id,
  );
});
