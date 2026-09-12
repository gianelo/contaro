import { auth } from "@/auth";
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
      <SpaceMenu member={name ?? null} space={space} signOut={signOutAction} />
    </header>
  );
}
