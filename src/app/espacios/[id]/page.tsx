import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { findSpaceForMember } from "@/db/spaces";
import { formatMoney, zero } from "@/domain/money/money";
import { AppShell } from "@/ui/app-shell";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { MainNavigation } from "../../navigation";
import { Account } from "../../account";
import { numberLocale, t } from "@/i18n";
import { currencyLabel } from "@/i18n/currency";
import styles from "./page.module.css";

/**
 * Inside a Space: where creating one lands, and where #7 onwards will put its
 * Movements and its Budget.
 *
 * A Space someone is not in is not found rather than forbidden — saying it
 * exists is already saying something about it. #5 hardens that with the rest of
 * the switching rules.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The proxy keeps a signed-out request off every page but /ingresar. This is
  // what happens if that ever stops being true.
  const session = await auth();
  if (!session) notFound();

  const space = await findSpaceForMember(database(), id, session.user.id);
  if (!space) notFound();

  return (
    <AppShell
      navigation={<MainNavigation activeId="spaces" />}
      account={<Account />}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>{space.name}</h1>
        <p className={styles.currency}>
          {currencyLabel(space.currency)}
        </p>
      </header>

      <GroupedList label={t("space.month")}>
        {/*
          Nothing has been recorded yet, in any Space, until #7 brings Movements.
          The figure is real all the same — nothing spent is nothing — and it is
          here now because what matters is that it is denominated in the Space's
          currency and never in the reader's.
        */}
        <GroupedListItem
          trailing={formatMoney(zero(space.currency), numberLocale)}
        >
          {t("space.month.spent")}
        </GroupedListItem>
      </GroupedList>
    </AppShell>
  );
}
