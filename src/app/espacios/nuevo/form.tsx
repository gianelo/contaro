"use client";

import { useActionState } from "react";
import { currencyCodes } from "@/domain/money/currency";
import { MAX_SPACE_NAME_LENGTH } from "@/domain/space/space";
import { Button } from "@/ui/button";
import { SelectField, TextField } from "@/ui/field";
import { Notice } from "@/ui/notice";
import { t } from "@/i18n";
import { currencyLabel } from "@/i18n/currency";
import { createSpaceAction } from "./actions";
import { nothingWrongYet } from "./create";
import styles from "./form.module.css";

const choices = currencyCodes.map((code) => ({
  value: code,
  label: currencyLabel(code),
}));

export function NewSpaceForm() {
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

      <SelectField
        name="currency"
        label={t("space.new.currency")}
        choices={choices}
        defaultValue="ARS"
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
