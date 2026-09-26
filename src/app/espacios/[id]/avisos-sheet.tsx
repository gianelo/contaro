"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import { t } from "@/i18n";
import type { WaitingInvitation } from "@/domain/space/invitation";
import type { AnnouncedClose } from "./waiting";
import { AnswerInvitation } from "../answer";
import { acceptInvitationAction, declineInvitationAction } from "../actions";
import { CloseNotice } from "./close-notice";
import styles from "./avisos-sheet.module.css";

export type AvisosSheetProps = {
  spaceId: string;
  spaceName: string;
  invitations: readonly WaitingInvitation[];
  /** Caller must pass passive, authorized close metadata with announces false. */
  waiting: AnnouncedClose | null;
  unpaidFixedCount: number;
  fixedMonth: string;
  fixedMonthName: string;
};

/** No reads or opening writes: the route supplies authorized serialized notices. */
export function AvisosSheet({ spaceId, spaceName, invitations, waiting, unpaidFixedCount, fixedMonth, fixedMonthName }: AvisosSheetProps) {
  const [open, setOpen] = useState(false);
  const [requestClose, setRequestClose] = useState(false);
  const actionable = waiting?.waitingOn === null;
  const hasNotices = invitations.length > 0 || waiting !== null || unpaidFixedCount > 0;

  return (
    <>
      <button type="button" className={styles.trigger} aria-label={t("avisos.title")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="bell" size={22} />
      </button>
      <BottomSheet open={open} title={t("avisos.title")} onClose={() => setOpen(false)} actions={<Button variant="plain" onClick={() => setOpen(false)}>{t("action.done")}</Button>}>
        <p className={styles.subtitle}>{t("avisos.subtitle", { space: spaceName })}</p>
        {hasNotices ? <ul className={styles.list}>
          {invitations.map(({ invitation, invitedByName, space }) => <li key={invitation.id} className={styles.row}>
            <span className={styles.inviteMark} aria-hidden="true"><Icon name="users" size={17} /></span>
            <div className={styles.content}>
              <strong>{t("avisos.invitation", { member: invitedByName })}</strong>
              <span className={styles.detail}>{t("avisos.invitation.space", { space: space.name })}</span>
              <div className={styles.answers}>
                <AnswerInvitation invitationId={invitation.id} action={acceptInvitationAction} label={t("avisos.accept")} working={t("invitations.working")} />
                <AnswerInvitation invitationId={invitation.id} action={declineInvitationAction} label={t("invitations.decline")} working={t("invitations.working")} variant="plain" />
              </div>
            </div>
          </li>)}
          {waiting ? <li className={styles.row}>
            <span className={styles.closeMark} aria-hidden="true"><Icon name="calendar-day" size={17} /></span>
            <div className={styles.content}>
              <strong>{t("close.waiting.act", { month: waiting.name })}</strong>
              <span className={styles.detail}>{actionable ? t("avisos.waiting") : t("close.waiting.theirs", { month: waiting.name, member: waiting.waitingOn ?? "" })}</span>
              {actionable ? <button type="button" className={styles.closeAction} onClick={() => { setOpen(false); setRequestClose(true); }}>{t("avisos.close")}</button> : null}
            </div>
          </li> : null}
          {unpaidFixedCount > 0 ? <li>
            <Link className={styles.row} href={`/espacios/${encodeURIComponent(spaceId)}/presupuesto?mes=${encodeURIComponent(fixedMonth)}`} onClick={() => setOpen(false)}>
              <span className={styles.fixedMark} aria-hidden="true"><Icon name="hourglass" size={17} /></span>
              <span className={styles.content}><strong>{t("avisos.fixed")}</strong><span className={styles.detail}>{t(unpaidFixedCount === 1 ? "avisos.fixed.one" : "avisos.fixed.many", { count: unpaidFixedCount, month: fixedMonthName })}</span></span>
              <Icon name="chevron-right" size={17} />
            </Link>
          </li> : null}
        </ul> : <p className={styles.empty}>{t("avisos.empty")}</p>}
      </BottomSheet>
      {waiting && actionable ? <CloseNotice spaceId={spaceId} waiting={{ ...waiting, announces: false }} showRow={false} requestClose={requestClose} onRequestHandled={() => setRequestClose(false)} /> : null}
    </>
  );
}
