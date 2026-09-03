"use client";

import { useActionState } from "react";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/category/category";
import { Button } from "@/ui/button";
import { SelectField, TextField } from "@/ui/field";
import { t } from "@/i18n";
import { addCategoryAction } from "./actions";
import { nothingWrongYet } from "../add";
import styles from "./form.module.css";

export type Heading = { id: string; name: string };

/**
 * Only headings are offered as a parent: a subcategory cannot hold
 * subcategories (#6). The domain refuses it and the database refuses it too —
 * this just keeps a person from being offered something they will be told off
 * for choosing.
 */
export function NewCategoryForm({
  spaceId,
  headings,
}: {
  spaceId: string;
  headings: readonly Heading[];
}) {
  const [state, submit, pending] = useActionState(
    addCategoryAction,
    nothingWrongYet,
  );

  const choices = [
    { value: "", label: t("categories.new.parent.none") },
    ...headings.map((heading) => ({
      value: heading.id,
      label: heading.name,
    })),
  ];

  return (
    <form action={submit} className={styles.form}>
      {/*
        The Space is carried in the form because the action needs to know which
        catalogue this is (ADR-0010: the URL names the Space, so there is
        nowhere else to read it from). It is a claim and not a fact, which is
        why `handleAddCategory` proves membership again before writing.
      */}
      <input type="hidden" name="spaceId" value={spaceId} />

      <TextField
        name="name"
        label={t("categories.new.name")}
        hint={t("categories.new.name.hint")}
        maxLength={MAX_CATEGORY_NAME_LENGTH}
        autoComplete="off"
        required
      />

      <SelectField
        name="parentId"
        label={t("categories.new.parent")}
        hint={t("categories.new.parent.hint")}
        choices={choices}
        defaultValue=""
      />

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("categories.new.working") : t("categories.new.submit")}
      </Button>
    </form>
  );
}
