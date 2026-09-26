import { auth } from "@/auth";
import { headers } from "next/headers";
import { database } from "@/db/client";
import { findMemberById } from "@/db/members";
import { findSpaceForMember } from "@/db/spaces";
import { readerOf } from "./reader";
import { monthOf } from "@/domain/calendar/month";
import { monthName } from "@/i18n/day";
import { readAvisos } from "./espacios/[id]/avisos";
import { tallyOf } from "./espacios/[id]/waiting";
import { AvisosSheet } from "./espacios/[id]/avisos-sheet";
import { Avatar, readerColour } from "@/ui/avatar";
import { firstNameOf } from "./name";
import { signOutAction } from "./sign-out";
import { SpaceMenu, type MenuSpace } from "./space-menu";
import styles from "./header.module.css";

/**
 * The header of the product (#65, ADR-0059): who is signed in, and the
 * hamburger that opens the Space menu.
 *
 * It replaces the account row nothing on the canvas ever drew -- a name and a
 * green `Salir` one thumb-width from the title -- and it costs the screens that
 * carry it exactly what that row already cost them. This is not new weight: it
 * is the weight the shipped app was already carrying, given a shape worth
 * carrying.
 *
 * The bell #133 will add goes between the name and the hamburger. It is not
 * drawn here yet on purpose: a bell that renders and answers nothing is a
 * control teaching a Member that this one is broken, and #133 is where the
 * pending invitations, the unclosed month and the unpaid Fixed items behind it
 * are worked out.
 *
 * The avatar wears the app's accent and never a Member seat, for the reason
 * the greeting's does: which of a Space's two seats a Member holds depends on
 * how two ids sort (ADR-0020), and this header is on screens that draw that
 * same person again below.
 */
export async function AppHeader({ space }: { space: MenuSpace }) {
  const session = await auth();
  if (!session) return null;

  const db = database();
  const verified = await findSpaceForMember(db, space.id, session.user.id);
  if (!verified) return null;
  const requestHeaders = await headers();
  const reader = readerOf(requestHeaders);
  const avisos = await readAvisos(db, session.user.id, verified, reader, requestHeaders);
  if (!avisos) return null;
  const creator = avisos.waitingMonth && verified.createdBy !== session.user.id
    ? await findMemberById(db, verified.createdBy)
    : null;
  if (avisos.waitingMonth && verified.createdBy !== session.user.id && !creator) {
    throw new Error(`Creator missing for Space ${verified.id}`);
  }
  const waiting = avisos.waitingMonth ? {
    month: avisos.waitingMonth,
    name: monthName(avisos.waitingMonth, monthOf(reader.today)),
    nextName: monthName(monthOf(reader.today), monthOf(reader.today)),
    waitingOn: verified.createdBy === session.user.id ? null : creator?.name ?? "",
    announces: false,
    tally: verified.createdBy === session.user.id ? await tallyOf(verified, avisos.waitingMonth) : null,
  } : null;
  const name = session.user.name;
  const called = name ? firstNameOf(name) : null;

  return (
    <header className={styles.header}>
      {/*
        Nobody drawn where nobody can be named -- Auth.js allows a session to
        carry no name, and a circle with no letter beside no word is the header
        claiming to know who this is and then not saying it (see `Greeting`).
      */}
      {name && called ? (
        <span className={styles.who}>
          <Avatar name={name} colour={readerColour} size="sm" />
          <span className={styles.name}>{called}</span>
        </span>
      ) : (
        <span className={styles.who} />
      )}

      {/*
        Handed the name whole. What the sheet titles itself with, and what it
        does with a session that names nobody, are its own (see `SpaceMenu`).
      */}
      <AvisosSheet spaceId={verified.id} spaceName={verified.name} invitations={avisos.invitations} waiting={waiting} unpaidFixedCount={avisos.unpaidFixedCount} fixedMonth={monthOf(reader.today)} fixedMonthName={monthName(monthOf(reader.today), monthOf(reader.today))} />
      <SpaceMenu member={name ?? null} space={space} signOut={signOutAction} />
    </header>
  );
}
