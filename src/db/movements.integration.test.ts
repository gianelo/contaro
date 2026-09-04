// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import {
  earned,
  spent,
  UnrecordableMovementError,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import { addCategoryToSpace, catalogueForSpace } from "./categories";
import {
  amendMovementInSpace,
  findMovementInSpace,
  movementsInMonth,
  recordMovementInSpace,
  strikeMovementInSpace,
} from "./movements";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

const TODAY = calendarDate("2026-09-03");

/** The database outlives a run, so every test invents its own Space. */
let next = 0;
const aMember = (name: string) =>
  memberFromGoogle(db, {
    subject: `movements-${process.pid}-${Date.now()}-${next++}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    name,
  });

async function aSpaceWithACategory(name: string, currency = "ARS") {
  const member = await aMember(name);
  const space = await createSpaceForMember(db, member.id, { name, currency });
  const catalogue = await catalogueForSpace(db, space.id);
  const groceries = catalogue
    .flatMap((branch) => branch.children)
    .find(
      (child) =>
        child.label.kind === "catalogue" && child.label.slug === "food.groceries",
    );

  if (!groceries) throw new Error("The shipped catalogue has no groceries.");

  return { member, space, categoryId: groceries.id };
}

const recording = (space: Space, recordedBy: string) => ({
  space,
  recordedBy,
  today: TODAY,
});

it("writes a Movement down and reads back what was recorded", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Escribe");

  const recorded = await recordMovementInSpace(
    db,
    recording(space, member.id),
    {
      spaceId: space.id,
      direction: "expense",
      categoryId,
      amount: 128_400,
      occurredOn: "2026-09-03",
      attributedTo: null,
    },
  );

  const read = await findMovementInSpace(db, space, recorded.id);

  expect(read).toEqual({
    id: recorded.id,
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: money(128_400, "ARS"),
    occurredOn: "2026-09-03",
    recordedBy: member.id,
    attributedTo: member.id,
  });
});

it("denominates what it reads back in the Space's currency", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Dólares", "USD");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 1_999,
    occurredOn: "2026-09-01",
    attributedTo: null,
  });

  expect(recorded.amount).toEqual(money(1_999, "USD"));
});

it("refuses a Category belonging to somebody else's Space", async () => {
  const { member, space } = await aSpaceWithACategory("Ajena");
  const other = await aSpaceWithACategory("Otra");
  const theirs = await addCategoryToSpace(db, {
    spaceId: other.space.id,
    parentId: null,
    name: "Asado",
  });

  await expect(
    recordMovementInSpace(db, recording(space, member.id), {
      spaceId: space.id,
      direction: "expense",
      categoryId: theirs.id,
      amount: 500,
      occurredOn: "2026-09-03",
      attributedTo: null,
    }),
  ).rejects.toThrow(UnrecordableMovementError);
});

it("refuses to attribute a Movement to somebody outside the Space", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Ajeno");
  const stranger = await aMember("Desconocido");

  await expect(
    recordMovementInSpace(db, recording(space, member.id), {
      spaceId: space.id,
      direction: "expense",
      categoryId,
      amount: 500,
      occurredOn: "2026-09-03",
      attributedTo: stranger.id,
    }),
  ).rejects.toThrow(UnrecordableMovementError);
});

it("lists the Movements of one month, most recent first", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Mes");
  // A clock past the whole month, because a Movement is money that already
  // moved and the rule that says so is the domain's, proven in its own tests.
  const later = { space, recordedBy: member.id, today: calendarDate("2026-11-01") };
  const record = (amount: number, occurredOn: string) =>
    recordMovementInSpace(db, later, {
      spaceId: space.id,
      direction: "expense",
      categoryId,
      amount,
      occurredOn,
      attributedTo: null,
    });

  await record(100, "2026-08-31");
  await record(200, "2026-09-01");
  await record(300, "2026-09-30");
  await record(400, "2026-10-01");

  const listed = await movementsInMonth(db, space, month("2026-09"));

  expect(listed.map((movement) => movement.amount.amount)).toEqual([300, 200]);
});

it("never lists a Movement recorded in another Space", async () => {
  const mine = await aSpaceWithACategory("Mía");
  const theirs = await aSpaceWithACategory("Suya");

  await recordMovementInSpace(db, recording(theirs.space, theirs.member.id), {
    spaceId: theirs.space.id,
    direction: "expense",
    categoryId: theirs.categoryId,
    amount: 777,
    occurredOn: "2026-09-02",
    attributedTo: null,
  });

  expect(await movementsInMonth(db, mine.space, month("2026-09"))).toEqual([]);
});

it("corrects a Movement without changing who recorded it", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Corrige");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 1_284_000,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });

  const fixed = await amendMovementInSpace(
    db,
    recording(space, member.id),
    recorded.id,
    { amount: 128_400 },
  );

  expect(fixed?.amount).toEqual(money(128_400, "ARS"));
  expect(fixed?.recordedBy).toBe(member.id);
});

it("refuses to correct a Movement recorded in another Space", async () => {
  const mine = await aSpaceWithACategory("Propia");
  const theirs = await aSpaceWithACategory("Vecina");

  const hidden = await recordMovementInSpace(
    db,
    recording(theirs.space, theirs.member.id),
    {
      spaceId: theirs.space.id,
      direction: "expense",
      categoryId: theirs.categoryId,
      amount: 999,
      occurredOn: "2026-09-02",
      attributedTo: null,
    },
  );

  // Not found rather than forbidden: saying it exists is already saying
  // something about somebody else's money.
  expect(
    await amendMovementInSpace(db, recording(mine.space, mine.member.id), hidden.id, {
      amount: 1,
    }),
  ).toBeNull();
});

it("strikes a Movement out and remembers who struck it", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Borra");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 500,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });

  expect(await strikeMovementInSpace(db, space.id, recorded.id, member.id)).toBe(
    true,
  );

  const [row] = await sql`
    SELECT struck_by, struck_at FROM movements WHERE id = ${recorded.id}
  `;
  expect(row?.struck_by).toBe(member.id);
  expect(row?.struck_at).not.toBeNull();
});

it("hides a struck Movement from every reader", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Oculta");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 500,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });
  await strikeMovementInSpace(db, space.id, recorded.id, member.id);

  expect(await findMovementInSpace(db, space, recorded.id)).toBeNull();
  expect(await movementsInMonth(db, space, month("2026-09"))).toEqual([]);
});

it("strikes a Movement out once, however many times it is asked", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Dos veces");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 500,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });

  await strikeMovementInSpace(db, space.id, recorded.id, member.id);

  // The second thumb on the button finds it already gone rather than
  // overwriting who struck it first.
  expect(await strikeMovementInSpace(db, space.id, recorded.id, member.id)).toBe(
    false,
  );
});

it("refuses to strike out a Movement recorded in another Space", async () => {
  const mine = await aSpaceWithACategory("Ajena mía");
  const theirs = await aSpaceWithACategory("Ajena suya");

  const hidden = await recordMovementInSpace(
    db,
    recording(theirs.space, theirs.member.id),
    {
      spaceId: theirs.space.id,
      direction: "expense",
      categoryId: theirs.categoryId,
      amount: 999,
      occurredOn: "2026-09-02",
      attributedTo: null,
    },
  );

  expect(
    await strikeMovementInSpace(db, mine.space.id, hidden.id, mine.member.id),
  ).toBe(false);
  expect(await findMovementInSpace(db, theirs.space, hidden.id)).not.toBeNull();
});

it("answers no Movement at all for an identifier that is not one", async () => {
  const { space } = await aSpaceWithACategory("Basura");

  // A URL carries any string at all, and Postgres refuses a malformed uuid
  // with an error rather than an empty result.
  expect(await findMovementInSpace(db, space, "no-soy-un-uuid")).toBeNull();
});

it("refuses an amount the database itself would call impossible", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Cero");

  await expect(
    recordMovementInSpace(db, recording(space, member.id), {
      spaceId: space.id,
      direction: "expense",
      categoryId,
      amount: 0,
      occurredOn: "2026-09-03",
      attributedTo: null,
    }),
  ).rejects.toThrow(UnrecordableMovementError);
});

// The floor under the domain. Every test above goes through `recordMovement`;
// these go round it, straight to SQL, which is the path a migration written in
// a hurry or a psql session takes. A rule only the domain knows about is a rule
// that holds until the second caller.

it("refuses, in the database itself, to move a Movement to another recorder", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Inmutable");
  // A real second Member of the Space, so the only rule left that can refuse
  // the update is the one this test is about. #9 brings the invitation that
  // puts them there; until it does, the row is written by hand.
  const other = await aMember("Otro Escribiente");
  await sql`
    INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${other.id})
  `;

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 500,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });

  await expect(
    sql`UPDATE movements SET recorded_by = ${other.id} WHERE id = ${recorded.id}`,
  ).rejects.toThrow(/recorder can never be changed/);
});

it("refuses, in the database itself, a Category belonging to another Space", async () => {
  const mine = await aSpaceWithACategory("Suelo mío");
  const theirs = await aSpaceWithACategory("Suelo ajeno");
  const hidden = await addCategoryToSpace(db, {
    spaceId: theirs.space.id,
    parentId: null,
    name: "Asado",
  });

  await expect(
    sql`
      INSERT INTO movements (space_id, category_id, amount, occurred_on, recorded_by, attributed_to)
      VALUES (${mine.space.id}, ${hidden.id}, 500, '2026-09-03', ${mine.member.id}, ${mine.member.id})
    `,
  ).rejects.toThrow(/belonging to another Space/);
});

it("refuses, in the database itself, an attribution to a non-Member", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Suelo ajeno 2");
  const stranger = await aMember("Fuera del espacio");

  await expect(
    sql`
      INSERT INTO movements (space_id, category_id, amount, occurred_on, recorded_by, attributed_to)
      VALUES (${space.id}, ${categoryId}, 500, '2026-09-03', ${member.id}, ${stranger.id})
    `,
  ).rejects.toThrow(/is attributed to .*, who is not a Member/);
});

it("writes income down and reads it back carrying no Category", async () => {
  const { member, space } = await aSpaceWithACategory("Entra plata");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "income",
    categoryId: null,
    amount: 850_000_00,
    occurredOn: "2026-09-01",
    attributedTo: null,
  });

  expect(recorded.direction).toBe("income");
  expect(recorded.categoryId).toBeNull();
  expect(recorded.amount).toEqual(money(850_000_00, "ARS"));

  const readBack = await findMovementInSpace(db, space, recorded.id);
  expect(readBack).toEqual(recorded);
});

it("reads a month holding both kinds of Movement", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Mes entero");
  const context = recording(space, member.id);

  await recordMovementInSpace(db, context, {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 128_400,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });
  await recordMovementInSpace(db, context, {
    spaceId: space.id,
    direction: "income",
    categoryId: null,
    amount: 850_000_00,
    occurredOn: "2026-09-01",
    attributedTo: null,
  });

  const read = await movementsInMonth(db, space, month("2026-09"));

  expect(read.map((movement) => movement.direction)).toEqual([
    "expense",
    "income",
  ]);
  expect(spent(read, "ARS")).toEqual(money(128_400, "ARS"));
  expect(earned(read, "ARS")).toEqual(money(850_000_00, "ARS"));
});

it("refuses, in the database itself, income filed under a Category", async () => {
  // The domain refuses it in `filing`. This is the floor under that: a salary
  // under "Supermercado" would be a row every Budget figure in #10 onwards
  // silently reads as spending.
  const { member, space, categoryId } = await aSpaceWithACategory("Piso #8");

  await expect(
    sql`
      INSERT INTO movements (space_id, direction, category_id, amount, occurred_on, recorded_by, attributed_to)
      VALUES (${space.id}, 'income', ${categoryId}, 500, '2026-09-03', ${member.id}, ${member.id})
    `,
  ).rejects.toThrow(/movements_expense_is_filed_and_income_is_not/);
});

it("refuses, in the database itself, an expense with no Category", async () => {
  const { member, space } = await aSpaceWithACategory("Sin archivar");

  await expect(
    sql`
      INSERT INTO movements (space_id, direction, category_id, amount, occurred_on, recorded_by, attributed_to)
      VALUES (${space.id}, 'expense', NULL, 500, '2026-09-03', ${member.id}, ${member.id})
    `,
  ).rejects.toThrow(/movements_expense_is_filed_and_income_is_not/);
});

it("refuses, in the database itself, a direction that is neither", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Ni una ni otra");

  await expect(
    sql`
      INSERT INTO movements (space_id, direction, category_id, amount, occurred_on, recorded_by, attributed_to)
      VALUES (${space.id}, 'gasto', ${categoryId}, 500, '2026-09-03', ${member.id}, ${member.id})
    `,
  ).rejects.toThrow(/movements_direction_is_one_of_two/);
});

it("refuses, in the database itself, any attempt to change a direction", async () => {
  // The same rule `movement_recorder_is_immutable` holds for the recorder, and
  // for the same reason: an entry that can change kind is not a record of what
  // happened. `amendMovement` refuses it too; this is what refuses it for
  // every path that never goes through the domain.
  const { member, space, categoryId } = await aSpaceWithACategory("No se da vuelta");

  const recorded = await recordMovementInSpace(db, recording(space, member.id), {
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: 128_400,
    occurredOn: "2026-09-03",
    attributedTo: null,
  });

  await expect(
    sql`UPDATE movements SET direction = 'income' WHERE id = ${recorded.id}`,
  ).rejects.toThrow(/direction can never be changed/);
});
