"use client";

import { useActionState, useId, useState, type FormEvent } from "react";
import { MAX_SPACE_NAME_LENGTH } from "@/domain/space/space";
import { cx } from "@/ui/cx";
import { EntryHead } from "@/ui/entry-head";
import { SelectField, TextField, type Choice } from "@/ui/field";
import { hitTarget } from "@/ui/hit-target";
import { trailingControl } from "@/ui/trailing-control";
import { Notice } from "@/ui/notice";
import { t } from "@/i18n";
import { createSpaceAction } from "./actions";
import { nothingWrongYet } from "./create";
import styles from "./form.module.css";

/**
 * Creating a Space: the head this screen wears and the form under it.
 *
 * The head is rendered here rather than by the screen above, which is where
 * the other four entry screens render theirs. The reason is the one control
 * in it: `Crear` is this form's submit and not a second way in beside it, and
 * whether it can be pressed yet is client state a server component has no way
 * to hand down -- the same argument that moved `BudgetItemCorrectionHead`'s
 * own control into a client head (#105, #142).
 *
 * The currencies still arrive from the screen rather than being read here,
 * because their order depends on where the request came from and only the
 * server sees that (see `currencyChoicesFor`).
 */
export function NewSpaceForm({ choices }: { choices: readonly Choice[] }) {
  const [state, submit, pending] = useActionState(
    createSpaceAction,
    nothingWrongYet,
  );

  /*
   * The fields sit in the form and `Crear` sits in the head above it, so the
   * two are tied by the `form` attribute rather than by nesting. Wrapping the
   * head in the form instead would put a heading and the way out inside the
   * thing being submitted, which is not what either of them is.
   */
  const formId = useId();

  /**
   * Whether the form can be submitted at all, which is what `Crear` is drawn
   * against: the canvas greys it on an empty form, and `disabled={pending}`
   * never was that -- it is refused *while* submitting and offered before
   * anything is typed. Both questions this screen asks are `required`, so the
   * browser already knows the answer and this only reads it back.
   *
   * Read off the form on every change rather than mirrored field by field:
   * a second copy of "what makes this answerable" is the copy that goes out
   * of step when a third question is added.
   */
  const [answerable, setAnswerable] = useState(false);
  const readWhetherItCanBeSent = (event: FormEvent<HTMLFormElement>) =>
    setAnswerable(event.currentTarget.checkValidity());

  return (
    <>
      <EntryHead
        back="/espacios"
        cancel={t("action.cancel")}
        title={t("space.new.title")}
        trailing={
          <button
            type="submit"
            form={formId}
            disabled={!answerable || pending}
            className={cx(hitTarget, trailingControl, styles.create)}
          >
            {pending ? t("space.new.working") : t("space.new.submit")}
          </button>
        }
      />

      <form
        id={formId}
        action={submit}
        onChange={readWhetherItCanBeSent}
        className={styles.form}
      >
        <TextField
          name="name"
          label={t("space.new.name")}
          hint={t("space.new.name.hint")}
          maxLength={MAX_SPACE_NAME_LENGTH}
          autoComplete="off"
          required
        />

        {/*
          No currency is offered until one is chosen. A default would answer, for
          whoever does not look, a question that can never be asked again
          (ADR-0001), and the browser refuses a submission that names none. That
          holds wherever the request came from: geolocation sorts this list and
          never fills it in (ADR-0013).
        */}
        <SelectField
          name="currency"
          label={t("space.new.currency")}
          choices={choices}
          placeholder={t("space.new.currency.none")}
          required
        />

        {/* ADR-0001, said before the choice is made rather than after. */}
        <Notice variant="warning">{t("space.new.currency.forever")}</Notice>

        {state.error ? (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        ) : null}
      </form>
    </>
  );
}
