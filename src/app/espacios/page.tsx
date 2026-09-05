import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { invitationsWaitingFor } from "@/db/invitations";
import { findMemberById } from "@/db/members";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Card } from "@/ui/card";
import { Icon } from "@/ui/icon";
import { monthOf } from "@/domain/calendar/month";
import { Account } from "../account";
import { readerOf } from "../reader";
import { t } from "@/i18n";
import { AnswerInvitation } from "./answer";
import { acceptInvitationAction, declineInvitationAction } from "./actions";
import { SpaceCard } from "./card";
import { Greeting } from "./greeting";
import { spacesToChooseFrom } from "./listing";
import styles from "./page.module.css";

/**
 * Where a Member lands, and where they come back to in order to switch: the
 * Spaces they belong to, and any Space waiting for them to say yes.
 *
 * A card per Space and not a row (#38). The row had space for a name and a
 * currency, and story 5 of #1 asks this list to answer "where do I stand"
 * before anything is opened — which is two more figures than a row can hold.
 *
 * This screen carries no tab bar. It belongs to no Space, so a "Presupuesto"
 * tab here would have no money to be about; from a card onwards every screen
 * is inside one and navigates within it (see `SpaceNavigation`). The canvas
 * draws a bar at the foot of this artboard, and that is the one thing on it
 * this screen does not copy: ADR-0027 settled that the four tabs are a Space's
 * and the list is not inside one.
 *
 * It is also where an Invitation is answered, and the only screen in the
 * product that shows somebody a Space they are not in (#9). It is the right
 * place for it because it is where everyone lands: whether they have used
 * contaro for a year or signed in for the first time thirty seconds ago, the
 * Space that is waiting is on the first screen they see.
 */
export default async function SpacesPage() {
  // The proxy keeps a signed-out request off every page but /ingresar. This is
  // what happens if that ever stops being true: refused, the way every route
  // inside a Space refuses (see `currentSpace`). Rendering "create your first
  // Space" to nobody in particular would be a screen answering a request that
  // carried no session at all.
  const session = await auth();
  if (!session) notFound();

  // The month each card is read against, and the separators its figures are
  // written with, are both the Reader's (ADR-0014, ADR-0018): at nine at night
  // on the 30th the server is already in the next month, and every card would
  // show the cost of a month nobody has started spending in.
  const reader = readerOf(await headers());

  const [spaces, waiting, member] = await Promise.all([
    spacesToChooseFrom(session.user.id, monthOf(reader.today), reader),
    invitationsWaitingFor(database(), session.user.id),
    /*
     * Greeted by the name the ledger holds and not by the one in the session,
     * for the reason the Fixed-item recap is (see `[id]/page.tsx`): a Movement
     * is read under the Member's row everywhere else, and a screen that
     * greeted somebody by a stale Google profile would be calling them one
     * thing here and another on every list. Auth.js also allows that name to
     * be absent, and this column cannot be.
     */
    findMemberById(database(), session.user.id),
  ]);

  return (
    <AppShell account={<Account />}>
      <Greeting name={member?.name ?? session.user.name ?? null} />

      {waiting.length > 0 ? (
        <section
          className={styles.invitations}
          aria-label={t("invitations.title")}
        >
          <h2 className={styles.invitationsTitle}>{t("invitations.title")}</h2>

          {waiting.map(({ invitation, invitedByName, space }) => (
            <Card key={invitation.id}>
              <h3 className={styles.invitationName}>{space.name}</h3>
              <p className={styles.invitationFrom}>
                {t("invitations.from", { member: invitedByName })}
              </p>
              {/*
                Two answers and never one. An Invitation nobody can turn down
                is one that sits on this screen forever, and the seat it holds
                is one the other Space can never offer again.
              */}
              <div className={styles.invitationAnswers}>
                <AnswerInvitation
                  invitationId={invitation.id}
                  action={acceptInvitationAction}
                  label={t("invitations.accept")}
                  working={t("invitations.working")}
                />
                <AnswerInvitation
                  invitationId={invitation.id}
                  action={declineInvitationAction}
                  label={t("invitations.decline")}
                  working={t("invitations.working")}
                  variant="plain"
                />
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {spaces.length === 0 ? (
        <Card>
          <h2 className={styles.emptyTitle}>{t("spaces.empty.title")}</h2>
          <p className={styles.emptyBody}>{t("spaces.empty.body")}</p>
          <ButtonLink href="/espacios/nuevo">{t("spaces.new")}</ButtonLink>
        </Card>
      ) : (
        <>
          {/*
            A real list, so that somebody who cannot see the column is told how
            many Spaces are in it before reading any of them -- which the
            grouped list this replaced said for free and a row of loose cards
            does not. Named by the heading above it rather than by a label
            repeating it: two copies of one string are two places to drift.
          */}
          <h2 id="spaces-yours" className={styles.spacesTitle}>
            {t("spaces.yours")}
          </h2>

          <ul className={styles.spaces} aria-labelledby="spaces-yours">
            {spaces.map((space) => (
              <li key={space.id}>
                <SpaceCard space={space} />
              </li>
            ))}
          </ul>

          {/*
            The way to make another one, drawn as the empty slot it stands in
            for rather than as a line of text. A dashed outline the size of a
            card says "another one goes here"; the plain link it replaced said
            only that the words could be tapped.
          */}
          <Link href="/espacios/nuevo" className={styles.slot}>
            {/*
              No label on the icon: the words beside it are the message, and a
              screen reader that heard "plus" first would hear it twice.
            */}
            <Icon name="plus" size={18} weight={2.2} />
            {t("spaces.new")}
          </Link>
        </>
      )}
    </AppShell>
  );
}
