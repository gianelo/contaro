import { database } from "@/db/client";
import { pendingInvitationsInSpace } from "@/db/invitations";
import { membersOfSpace } from "@/db/spaces";
import { hasFreeSeat } from "@/domain/space/invitation";
import { Card } from "@/ui/card";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { SpaceScreen } from "../screen";
import { currentSpace, viewingMember } from "../space";
import { AnswerInvitation } from "../../answer";
import { revokeInvitationAction } from "../../actions";
import { InviteForm } from "./form";
import styles from "./page.module.css";

/**
 * Who shares this Space, and the one seat it has to offer (#9).
 *
 * One screen and not two, because a Space holds two Members: there is at most
 * one seat, so there is at most one thing to do here — offer it, take the
 * offer back, or nothing at all because it is taken. A separate `invitar/`
 * route would be a whole screen for a form of one field.
 */
export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);

  const [members, pending, reader] = await Promise.all([
    membersOfSpace(database(), space.id),
    pendingInvitationsInSpace(database(), space.id),
    viewingMember(),
  ]);

  // Asked of the domain and not counted again here: this is the same rule
  // `inviteToSpace` refuses on (ADR-0017), and a second copy of the sum in a
  // React component is a copy that stops agreeing with it. The screen asks so
  // that the form is simply absent rather than offered and then refused.
  const free = hasFreeSeat(
    members.map((member) => member.id),
    pending.map((entry) => entry.invitation),
  );

  return (
    // The Budget tab, because that is the screen this hangs off and the tab
    // bar names sections rather than screens -- the same reason `nueva/` under
    // Categories lights the Categories tab.
    <SpaceScreen space={space} tab="budget">
      <h2 className={styles.title}>{t("members.title")}</h2>

      <GroupedList label={t("members.title")} labelHidden>
        {members.map((member) => (
          <GroupedListItem
            key={member.id}
            trailing={member.id === reader ? t("members.you") : undefined}
          >
            {member.name}
          </GroupedListItem>
        ))}
      </GroupedList>

      {pending.map(({ invitation, invitedByName }) => (
        <div key={invitation.id} className={styles.pending}>
          <GroupedList label={t("members.pending")}>
            <GroupedListItem>
              <span className={styles.email}>{invitation.email}</span>
              <span className={styles.from}>
                {t("members.pending.from", { member: invitedByName })}
              </span>
            </GroupedListItem>
          </GroupedList>

          {/*
            Without this the seat is held forever by one typo, and the Space
            can never be shared at all — which is the price of a pending
            invitation reserving it in the first place.
          */}
          <AnswerInvitation
            invitationId={invitation.id}
            spaceId={space.id}
            action={revokeInvitationAction}
            label={t("members.pending.cancel")}
            working={t("members.pending.working")}
            variant="destructive"
          />
        </div>
      ))}

      <div className={styles.invite}>
        {free ? (
          <Card>
            <h3 className={styles.inviteTitle}>{t("members.invite.title")}</h3>
            <p className={styles.inviteBody}>{t("members.invite.body")}</p>
            <InviteForm spaceId={space.id} />
          </Card>
        ) : pending.length === 0 ? (
          <p className={styles.full}>{t("members.full")}</p>
        ) : null}
      </div>
    </SpaceScreen>
  );
}
