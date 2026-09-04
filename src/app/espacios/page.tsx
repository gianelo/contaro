import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { invitationsWaitingFor } from "@/db/invitations";
import { listSpacesForMember } from "@/db/spaces";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Card } from "@/ui/card";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Account } from "../account";
import { t } from "@/i18n";
import { AnswerInvitation } from "./answer";
import { acceptInvitationAction, declineInvitationAction } from "./actions";
import styles from "./page.module.css";

/**
 * Where a Member lands, and where they come back to in order to switch: the
 * Spaces they belong to, and any Space waiting for them to say yes.
 *
 * This screen carries no tab bar. It belongs to no Space, so a "Presupuesto"
 * tab here would have no money to be about; from a row onwards every screen is
 * inside one and navigates within it (see `SpaceNavigation`).
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

  const [spaces, waiting] = await Promise.all([
    listSpacesForMember(database(), session.user.id),
    invitationsWaitingFor(database(), session.user.id),
  ]);

  return (
    <AppShell account={<Account />}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("spaces.title")}</h1>
      </header>

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
        <div className={styles.empty}>
          <Card>
            <h2 className={styles.emptyTitle}>{t("spaces.empty.title")}</h2>
            <p className={styles.emptyBody}>{t("spaces.empty.body")}</p>
            <ButtonLink href="/espacios/nuevo">{t("spaces.new")}</ButtonLink>
          </Card>
        </div>
      ) : (
        <>
          <GroupedList label={t("spaces.title")} labelHidden>
            {spaces.map(({ space, members }) => (
              <GroupedListItem
                key={space.id}
                href={`/espacios/${space.id}`}
                trailing={space.currency}
              >
                <span className={styles.name}>{space.name}</span>
                {/*
                  Who is in it, so the shared Space and the personal one are
                  told apart without opening either.
                */}
                <span className={styles.members}>
                  {members.map((member) => member.name).join(" · ")}
                </span>
              </GroupedListItem>
            ))}
          </GroupedList>

          <div className={styles.add}>
            <ButtonLink href="/espacios/nuevo" variant="plain">
              {t("spaces.new")}
            </ButtonLink>
          </div>
        </>
      )}
    </AppShell>
  );
}
