// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "./connection";
import { findMemberById, memberFromGoogle } from "./members";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

/**
 * The database outlives a test run, so every test invents its own Google
 * account rather than sharing one and depending on the order they run in.
 */
let next = 0;
const googleAccount = (name: string) => ({
  subject: `test-${process.pid}-${Date.now()}-${next++}`,
  email: `${name.toLowerCase()}@example.com`,
  name,
});

it("makes a Member the first time a Google account signs in", async () => {
  const ana = googleAccount("Ana");

  const member = await memberFromGoogle(db, ana);

  expect(member).toMatchObject({
    googleSubject: ana.subject,
    email: "ana@example.com",
    name: "Ana",
  });
  expect(member.id).toEqual(expect.any(String));
});

it("resolves the same Google account to the same Member every time", async () => {
  const beto = googleAccount("Beto");

  const first = await memberFromGoogle(db, beto);
  const second = await memberFromGoogle(db, beto);

  expect(second.id).toBe(first.id);
});

it("follows a name changed on the Google account", async () => {
  const cami = googleAccount("Cami");

  const before = await memberFromGoogle(db, cami);
  const after = await memberFromGoogle(db, { ...cami, name: "Camila" });

  expect(after.id).toBe(before.id);
  expect(after.name).toBe("Camila");
});

it("keeps two Google accounts apart", async () => {
  const dani = await memberFromGoogle(db, googleAccount("Dani"));
  const eli = await memberFromGoogle(db, googleAccount("Eli"));

  expect(eli.id).not.toBe(dani.id);
});

it("survives the same Google account signing in twice at once", async () => {
  const fede = googleAccount("Fede");

  const [first, second] = await Promise.all([
    memberFromGoogle(db, fede),
    memberFromGoogle(db, fede),
  ]);

  expect(second.id).toBe(first.id);
});

it("resolves the id a session carries back to the Member it belongs to", async () => {
  const gaby = await memberFromGoogle(db, googleAccount("Gaby"));

  await expect(findMemberById(db, gaby.id)).resolves.toEqual(gaby);
});

it("does not resolve an id no Member has", async () => {
  await expect(
    findMemberById(db, "3f2b0c1e-0000-4000-8000-00000000dead"),
  ).resolves.toBeNull();
});
