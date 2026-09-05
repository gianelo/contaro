import { Avatar, readerColour } from "@/ui/avatar";
import { t } from "@/i18n";
import styles from "./greeting.module.css";

/**
 * The name somebody is greeted by, out of the name they signed in with.
 *
 * Google hands back a whole name and nobody is greeted with all of it: "Hola,
 * Gian Solo Barboza" is a form letter. The first word is what a person is
 * called, and where there is only one word it is already the answer.
 */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

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
export function Greeting({ name }: { name: string | null }) {
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
    </header>
  );
}
