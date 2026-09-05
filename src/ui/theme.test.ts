import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  chooseTheme,
  storedTheme,
  subscribeToTheme,
  themeScript,
  themeStorageKey,
} from "./theme";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

/** Runs the pre-paint script the way the browser will: as its own program. */
const runTheScript = () => new Function(themeScript)();

describe("the theme a Member chose", () => {
  it("follows the phone until somebody says otherwise", () => {
    // The third state is the one it starts on. A first-run app that picked
    // light or dark for somebody would be overruling a choice they already
    // made, in their phone's own settings.
    expect(storedTheme()).toBe("system");
  });

  it("remembers a choice on the device it was made on", () => {
    chooseTheme("dark");

    expect(storedTheme()).toBe("dark");
  });

  it("lets a Member go back to following their phone", () => {
    // The way out of the choice, and the reason it is three states and not a
    // switch: a person who tried dark must be able to stop having chosen,
    // rather than being stuck guessing which one their phone was on.
    chooseTheme("dark");
    chooseTheme("system");

    expect(storedTheme()).toBe("system");
  });

  it("reads anything it did not write as following the phone", () => {
    // Storage is shared with everything else on this origin and outlives every
    // deploy. A value from an older build, or from nothing at all, must not
    // leave the app on a theme that does not exist.
    localStorage.setItem(themeStorageKey, "solarized");

    expect(storedTheme()).toBe("system");
  });

  it("still answers on a browser that refuses storage", () => {
    // Safari with site data blocked throws on localStorage rather than
    // returning null. The palette is not worth a screen of nothing.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("the browser said no");
    });

    expect(storedTheme()).toBe("system");
  });

  it("still applies a choice a browser refuses to remember", () => {
    // Forgotten on the next visit is a smaller wrong than not working at all:
    // the person asked for dark and the screen goes dark.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("the browser said no");
    });

    expect(() => chooseTheme("dark")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("what a choice writes on the document", () => {
  it("says nothing at all for the phone's own theme", () => {
    // This absence is the whole of "follows the phone changing, without a
    // reload". With no attribute, `color-scheme: light dark` and every
    // light-dark() under it track the OS by themselves. A matchMedia listener
    // here would be a second answer to a question CSS already answers, and two
    // answers to one question eventually disagree.
    applyTheme(document.documentElement, "system");

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it.each(["light", "dark"] as const)(
    "names %s, which is what flips every token under it",
    (choice) => {
      applyTheme(document.documentElement, choice);

      expect(document.documentElement.dataset.theme).toBe(choice);
    },
  );

  it("takes a forced theme back off rather than leaving it behind", () => {
    // Going back to the phone has to undo the attribute. Left there, the app
    // would sit on the last thing anybody pressed and never move again.
    applyTheme(document.documentElement, "dark");
    applyTheme(document.documentElement, "system");

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("who hears that the choice changed", () => {
  it("tells a listener, so the control on screen redraws with it", () => {
    const told = vi.fn();
    subscribeToTheme(told);

    chooseTheme("dark");

    expect(told).toHaveBeenCalled();
  });

  it("stops telling one that unsubscribed", () => {
    const told = vi.fn();
    subscribeToTheme(told)();

    chooseTheme("dark");

    expect(told).not.toHaveBeenCalled();
  });
});

describe("the script that runs before the first paint", () => {
  it("puts a stored choice on the document before React renders anything", () => {
    // The whole point of the script. React runs after the first paint, so a
    // theme decided in a component is a theme the person sees flash.
    localStorage.setItem(themeStorageKey, "dark");

    runTheScript();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("leaves the document alone when the choice is the phone's", () => {
    runTheScript();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("ignores a stored value that names no theme", () => {
    localStorage.setItem(themeStorageKey, "solarized");

    runTheScript();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("survives a browser that refuses storage instead of taking the page down", () => {
    // This runs before everything else on the page. An exception here is a
    // white screen, not a wrong palette.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("the browser said no");
    });

    expect(runTheScript).not.toThrow();
  });

  it("reads the key the rest of the module writes", () => {
    // The script is a string and cannot import anything, so this is the one
    // place the two halves could drift apart. They are built from the same
    // constant; this is what says so out loud.
    expect(themeScript).toContain(themeStorageKey);
  });
});
