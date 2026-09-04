"use client";

import { useActionState } from "react";
import { MAX_EMAIL_LENGTH } from "@/domain/space/invitation";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";
import { t } from "@/i18n";
import { inviteAction } from "../../actions";
import { nothingWrongYet } from "../../invitations";
import styles from "./form.module.css";

/**
 * The one seat a Space has to offer, and the address to offer it to.
 *
 * `type="email"` so a phone brings up the keyboard with the @ on it, and
 * because it is what the field is. It is not the check that matters — a
 * browser's idea of an address and this product's are two different rules, and
 * `inviteToSpace` is the one that decides.
 */
export function InviteForm({ spaceId }: { spaceId: string }) {
  const [state, submit, pending] = useActionState(
    inviteAction,
    nothingWrongYet,
  );

  return (
    <form action={submit} className={styles.form}>
      {/*
        The Space is carried in the form because the action needs to know which
        Space this seat belongs to (ADR-0010: the URL names the Space, so there
        is nowhere else to read it from). It is a claim and not a fact, which is
        why `handleInvite` proves membership again before writing.
      */}
      <input type="hidden" name="spaceId" value={spaceId} />

      <TextField
        name="email"
        type="email"
        label={t("members.invite.email")}
        hint={t("members.invite.email.hint")}
        maxLength={MAX_EMAIL_LENGTH}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("members.invite.working") : t("members.invite.submit")}
      </Button>
    </form>
  );
}
