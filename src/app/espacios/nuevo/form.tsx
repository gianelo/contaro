"use client";

import { useActionState } from "react";
import { MAX_SPACE_NAME_LENGTH } from "@/domain/space/space";
import { Button } from "@/ui/button";
import { SelectField, TextField, type Choice } from "@/ui/field";
import { Notice } from "@/ui/notice";
import { t } from "@/i18n";
import { createSpaceAction } from "./actions";
import { nothingWrongYet } from "./create";
import styles from "./form.module.css";

/**
 * The currencies arrive from the screen rather than being read here, because
 * their order depends on where the request came from and only the server sees
 * that (see `currencyChoicesFor`).
 */
export function NewSpaceForm({ choices }: { choices: readonly Choice[] }) {
  const [state, submit, pending] = useActionState(
    createSpaceAction,
    nothingWrongYet,
  );

  return (
    <form action={submit} className={styles.form}>
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

      <Button type="submit" disabled={pending}>
        {pending ? t("space.new.working") : t("space.new.submit")}
      </Button>
    </form>
  );
}
