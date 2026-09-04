"use client";

import { useState } from "react";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { BottomSheet } from "@/ui/bottom-sheet";
import { SelectField, TextField } from "@/ui/field";
import { Notice } from "@/ui/notice";
import { Icon, iconNames } from "@/ui/icon";
import { Meter } from "@/ui/meter";
import { memberColour } from "@/ui/member-colour";
import { cx } from "@/ui/cx";
import { t } from "@/i18n";
import { currencyLabel } from "@/i18n/currency";
import styles from "./gallery.module.css";

/** The three states a meter is ever in, named so each can be told apart. */
const GALLERY_METERS = [
  { label: "52%", filled: 0.52, over: false },
  { label: "100%", filled: 1, over: false },
  { label: "140%, over", filled: 1.4, over: true },
] as const;

/** Two Members of one Space, invented here so the pair can be seen. */
const GALLERY_MEMBERS = [
  { id: "11111111-1111-4111-8111-111111111111", initial: "G" },
  { id: "22222222-2222-4222-8222-222222222222", initial: "A" },
] as const;

const GALLERY_MEMBER_IDS = GALLERY_MEMBERS.map((member) => member.id);

/**
 * Every base component on one screen. It exists so the 44px touch target is
 * measured in a real browser on the real components, not only asserted as a
 * class name in jsdom — see e2e/hit-targets.spec.ts.
 */
export function Gallery() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className={styles.gallery}>
      <h1 className={styles.title}>{t("gallery.title")}</h1>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.buttons")}</h2>
        <Button>{t("action.save")}</Button>
        <Button variant="destructive">{t("gallery.destructive")}</Button>
        <Button variant="plain">{t("gallery.plain")}</Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.list")}</h2>
        <GroupedList label={t("gallery.list")}>
          <GroupedListItem onClick={() => {}} trailing="$1.000">
            {t("gallery.item.actionable")}
          </GroupedListItem>
          <GroupedListItem trailing="$2.000">
            {t("gallery.item.plain")}
          </GroupedListItem>
        </GroupedList>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.fields")}</h2>
        <TextField
          name="gallery-name"
          label={t("space.new.name")}
          hint={t("space.new.name.hint")}
        />
        <SelectField
          name="gallery-currency"
          label={t("space.new.currency")}
          choices={[
            { value: "ARS", label: currencyLabel("ARS") },
            { value: "USD", label: currencyLabel("USD") },
          ]}
        />
        <Notice variant="warning">{t("space.new.currency.forever")}</Notice>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.meters")}</h2>
        {/* The three states a meter is ever in: partway, exactly full, and
            past the length it measures. The last two are the same width on
            purpose — over is said in the colour and in the words beside it,
            never by a bar growing out of its row.

            Labelled here because this is the one place a meter stands with
            no figure beside it, and a meter says nothing on its own. */}
        <ul className={styles.meters}>
          {GALLERY_METERS.map((meter) => (
            <li key={meter.label}>
              <span className={styles.meterLabel}>{meter.label}</span>
              <Meter filled={meter.filled} over={meter.over} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.icons")}</h2>
        {/* Grey, because the row they sit in is: an icon that shows up in any
            other colour here has stopped taking it from the text around it. */}
        <ul className={styles.icons}>
          {iconNames.map((name) => (
            <li key={name} className={styles.icon}>
              <Icon name={name} size={24} />
              <span className={styles.iconName}>{name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.members")}</h2>
        <div className={styles.avatars}>
          {GALLERY_MEMBERS.map((member) => (
            <span
              key={member.id}
              className={cx(
                styles.avatar,
                memberColour(member.id, GALLERY_MEMBER_IDS),
              )}
            >
              {member.initial}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("gallery.sheet")}</h2>
        <Button onClick={() => setSheetOpen(true)}>
          {t("gallery.sheet.open")}
        </Button>
      </section>

      <BottomSheet
        open={sheetOpen}
        title={t("gallery.sheet.title")}
        onClose={() => setSheetOpen(false)}
        actions={
          <>
            <Button variant="destructive" onClick={() => setSheetOpen(false)}>
              {t("gallery.destructive")}
            </Button>
            <Button variant="plain" onClick={() => setSheetOpen(false)}>
              {t("gallery.plain")}
            </Button>
          </>
        }
      >
        <p>{t("gallery.sheet.body")}</p>
      </BottomSheet>
    </div>
  );
}
