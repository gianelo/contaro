/**
 * The theme a Member chose, which is not the same thing as the theme they are
 * looking at.
 *
 * tokens.css already ships both palettes: every colour is declared once with
 * light-dark() under `color-scheme: light dark`, so the app has turned dark
 * with the phone since #34. What was missing was the choice (#41) -- a person
 * whose phone is light and who wants dark had no way to say so.
 *
 * Three states and not two, and the third is where it starts. "Follow the
 * phone" is a real answer and a person who tried dark has to be able to get
 * back to it; a switch would leave them guessing which way their phone was
 * pointing.
 *
 * The key and the script below live here together on purpose. The script is a
 * string -- it runs before any module has loaded and can import nothing -- so
 * it is the one half of this that could quietly stop agreeing with the other.
 * Built from the same constants, it cannot.
 */

/** Every answer, in the order the control offers them. */
export const themeChoices = ["system", "light", "dark"] as const;

export type ThemeChoice = (typeof themeChoices)[number];

/**
 * Namespaced, because localStorage is shared with everything else served from
 * this origin and there is no second chance at a name.
 */
export const themeStorageKey = "contaro.theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return themeChoices.includes(value as ThemeChoice);
}

/**
 * The two a choice can force onto the document. "system" forces nothing, which
 * is the point: see `applyTheme`.
 */
const forcedThemes = themeChoices.filter((choice) => choice !== "system");

/**
 * What the Member chose on this device, and following the phone for everything
 * else -- nobody having chosen, a value from an older build, or a browser that
 * refuses storage outright.
 *
 * A browser can refuse: Safari with site data blocked throws on `localStorage`
 * rather than returning null. The palette is not worth a screen of nothing.
 */
export function storedTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Puts the choice on the document, or takes it off.
 *
 * Taking it off is how "follow the phone" is said, and it is why this feature
 * needs no `matchMedia` and no listener: with no `data-theme`, the
 * `color-scheme: light dark` in tokens.css and every light-dark() under it
 * track the OS by themselves, live, without a reload. Reading the media query
 * here would be a second answer to a question CSS already answers, and two
 * answers to one question eventually disagree.
 */
export function applyTheme(root: HTMLElement, choice: ThemeChoice): void {
  if (choice === "system") {
    delete root.dataset.theme;
    return;
  }

  root.dataset.theme = choice;
}

const listeners = new Set<() => void>();

/**
 * Told when the choice changes, so the control on screen redraws with it.
 *
 * Only this tab. Another tab of the same browser keeps its palette until it is
 * reloaded, and the `storage` event is not the fix it looks like: nothing
 * subscribes on the screens a person is actually reading, so the event would
 * repaint the Ajustes screen and leave every other one alone. Repainting
 * everywhere means a listener mounted on every screen, which is machinery this
 * ticket does not need.
 */
export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Remembers the choice, applies it, and says so.
 *
 * The write is allowed to fail. A browser that refuses to remember still gets
 * the theme the person asked for, for as long as the page is open: forgotten
 * on the next visit is a much smaller wrong than a button that does nothing.
 */
export function chooseTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(themeStorageKey, choice);
  } catch {
    // Nothing to do and nothing to say: the line below still runs.
  }

  applyTheme(document.documentElement, choice);

  for (const listener of listeners) listener();
}

/**
 * The one piece of this app that runs before the first paint.
 *
 * It has to be inline and it has to be blocking. React renders after the paint,
 * so a theme decided in a component is a theme the person watches flash white
 * on the way in -- which is the bug that only ever shows up in the dark, and
 * only for the people who asked for the dark.
 *
 * Deliberately tiny and deliberately dumb: `var`, no optional chaining, one
 * try/catch. It is parsed ahead of every element this app draws, so an
 * exception in it is a white screen rather than a wrong palette, and a syntax
 * an old browser trips on is the same.
 *
 * Where exactly it lands is Next's and not the layout's: see the comment in
 * `src/app/layout.tsx`, which cost an e2e failure to learn.
 */
export const themeScript = [
  "try{",
  `var c=localStorage.getItem(${JSON.stringify(themeStorageKey)});`,
  `if(${JSON.stringify(forcedThemes)}.indexOf(c)>-1)`,
  "document.documentElement.setAttribute('data-theme',c);",
  "}catch(e){}",
].join("");
