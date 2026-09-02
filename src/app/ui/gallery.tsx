"use client";

import { useState } from "react";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { BottomSheet } from "@/ui/bottom-sheet";
import { t } from "@/i18n";
import styles from "./gallery.module.css";

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
