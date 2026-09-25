"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, type ButtonVariant } from "@/ui/button";
import { nothingWrongYet, type InvitationFormState } from "./invitations";
import styles from "./answer.module.css";

/**
 * One answer to an invitation: a button, the identifier it is about, and
 * whatever the server says if it refuses.
 *
 * A form and not an `onClick`, because every one of these writes something:
 * taking a seat, turning one down, withdrawing an offer. A form carries the
 * identifier as a field the action reads, works before any JavaScript has
 * loaded, and cannot fire twice while the first one is still in the air.
 *
 * Three buttons and one component, because they differ only in what they say
 * and where they post. Three copies would be three places for one of them to
 * stop showing the refusal.
 *
 * Every answer carries the screen it was sent from, and only turning a seat
 * down reads it: saying no puts you back where you were (#152, ADR-0066). It
 * is read here rather than passed in, because a layout drawing this control
 * does not know which of its screens is open. The query is part of the
 * screen: the Space's screens keep their month in `?mes=`.
 */
export function AnswerInvitation({
  invitationId,
  spaceId,
  action,
  label,
  working,
  variant = "primary",
}: {
  invitationId: string;
  /**
   * The Space, for the answers a Space gives: withdrawing an offer is checked
   * against the Space it belongs to. Absent when the person answering is not
   * in it yet, which is every acceptance there has ever been.
   */
  spaceId?: string;
  action: (
    previous: InvitationFormState,
    form: FormData,
  ) => Promise<InvitationFormState>;
  label: string;
  working: string;
  variant?: ButtonVariant;
}) {
  const [state, send, pending] = useActionState(action, nothingWrongYet);
  const path = usePathname();
  const query = useSearchParams().toString();
  const from = query ? `${path}?${query}` : path;

  return (
    <form action={send} className={styles.answer}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="from" value={from} />
      {spaceId ? (
        <input type="hidden" name="spaceId" value={spaceId} />
      ) : null}

      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? working : label}
      </Button>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
