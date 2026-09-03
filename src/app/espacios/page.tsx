import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { listSpacesForMember } from "@/db/spaces";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Card } from "@/ui/card";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Account } from "../account";
import { t } from "@/i18n";
import styles from "./page.module.css";

/**
 * Where a Member lands, and where they come back to in order to switch: the
 * Spaces they belong to and nothing else.
 *
 * This screen carries no tab bar. It belongs to no Space, so a "Presupuesto"
 * tab here would have no money to be about; from a row onwards every screen is
 * inside one and navigates within it (see `SpaceNavigation`).
 */
export default async function SpacesPage() {
  // The proxy keeps a signed-out request off every page but /ingresar. This is
  // what happens if that ever stops being true: refused, the way every route
  // inside a Space refuses (see `currentSpace`). Rendering "create your first
  // Space" to nobody in particular would be a screen answering a request that
  // carried no session at all.
  const session = await auth();
  if (!session) notFound();

  const spaces = await listSpacesForMember(database(), session.user.id);

  return (
    <AppShell account={<Account />}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("spaces.title")}</h1>
      </header>

      {spaces.length === 0 ? (
        <div className={styles.empty}>
          <Card>
            <h2 className={styles.emptyTitle}>{t("spaces.empty.title")}</h2>
            <p className={styles.emptyBody}>{t("spaces.empty.body")}</p>
            <ButtonLink href="/espacios/nuevo">{t("spaces.new")}</ButtonLink>
          </Card>
        </div>
      ) : (
        <>
          <GroupedList label={t("spaces.title")} labelHidden>
            {spaces.map(({ space, members }) => (
              <GroupedListItem
                key={space.id}
                href={`/espacios/${space.id}`}
                trailing={space.currency}
              >
                <span className={styles.name}>{space.name}</span>
                {/*
                  Who is in it, so the shared Space and the personal one are
                  told apart without opening either.
                */}
                <span className={styles.members}>
                  {members.map((member) => member.name).join(" · ")}
                </span>
              </GroupedListItem>
            ))}
          </GroupedList>

          <div className={styles.add}>
            <ButtonLink href="/espacios/nuevo" variant="plain">
              {t("spaces.new")}
            </ButtonLink>
          </div>
        </>
      )}
    </AppShell>
  );
}
