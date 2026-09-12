import type { ReactNode } from "react";
import { Avatar, readerColour } from "@/ui/avatar";
import { t } from "@/i18n";
import { firstNameOf } from "../name";
import styles from "./greeting.module.css";

/**
 * What the Space list opens with (#38): the person, not the screen.
 *
 * It used to say "Espacios" at 32px, which named the screen to somebody who
 * had just landed on it and could see that for themselves. Their own name and
 * their own face is the half of it they cannot — and the line under it is what
 * the screen actually wants from them, which the old heading never said.
 *
 * The avatar wears the app's accent and never a Member seat. This screen draws
 * the Reader twice -- here, and again inside every Space they share -- and
 * which seat they hold in a Space depends on how two ids sort (ADR-0020), so a
 * seat colour here would show one person in two colours on one screen. It
 * carries the whole name for anybody not reading the letter, while the
 * greeting uses the name they are called by.
 *
 * Where there is no name to greet — a session naming a Member the database
 * does not have — the screen falls back to naming itself. That is worse than a
 * greeting and much better than "Hola, " over an empty circle, which is the
 * screen claiming to know who arrived and then failing to say it.
 */
export function Greeting({
  name,
  beside,
}: {
  name: string | null;
  /**
   * What shares the greeting's row at its trailing end: the hamburger, on the
   * one screen that carries it without a header around it (ADR-0059). Held and
   * never named, the way `SpaceHead` holds a month pill.
   */
  beside?: ReactNode;
}) {
  const greeted = name ? firstNameOf(name) : "";

  return (
    <header className={styles.greeting}>
      {/*
        Nobody drawn where nobody can be named. An empty circle beside "Hola, "
        is the screen saying it knows who this is and then not saying it.
      */}
      {name && greeted ? <Avatar name={name} colour={readerColour} /> : null}

      <div className={styles.words}>
        <h1 className={styles.hello}>
          {greeted
            ? t("spaces.greeting", { member: greeted })
            : t("spaces.title")}
        </h1>
        <p className={styles.lead}>{t("spaces.greeting.lead")}</p>
      </div>

      {beside}
    </header>
  );
}
