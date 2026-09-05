"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/i18n";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { SegmentedField } from "@/ui/segmented-field";
import {
  chooseTheme,
  isThemeChoice,
  storedTheme,
  subscribeToTheme,
} from "@/ui/theme";

/**
 * Where a Member says how the app should be lit (#41).
 *
 * A segmented control for the reason `SegmentedField`'s own comment gives:
 * these are all of the answers and one of them is already true. It is three
 * halves rather than two, which is the shape the question actually has --
 * light, dark, and whatever the phone says.
 *
 * It carries a heading and the direction control does not. "Gasto | Ingreso"
 * says what its question is by being read; "Automático | Claro | Oscuro" says
 * automatic *what*, so the group's label is doing real work here. The group
 * and the control take the same word on purpose: they are one question, and a
 * second word for it would be a second thing to learn.
 *
 * `useSyncExternalStore` and not an effect, following the entry form's day
 * (ADR-0018): the choice lives in the browser, the server cannot know it, and
 * this is the hook that gets that hydration right instead of re-rendering to
 * correct itself. The server's answer is "follow the phone" because that is
 * what the app does for anybody who has not chosen -- so a device on light or
 * on automatic renders the same on both sides, and only a device that chose
 * corrects one pill after hydration. The *palette* never corrects: the script
 * in the root layout settled that before the first paint.
 *
 * The Space in the URL has nothing to do with it. This choice is the device's,
 * and it holds across every Space that device opens; it lives on this screen
 * because this is where "whatever comes next that is not money" was always
 * going to go, and a theme is not money.
 */
export function Appearance() {
  const choice = useSyncExternalStore(
    subscribeToTheme,
    storedTheme,
    () => "system" as const,
  );

  return (
    <GroupedList label={t("appearance.label")}>
      <GroupedListItem>
        <SegmentedField
          name="theme"
          legend={t("appearance.label")}
          options={[
            { value: "system", label: t("appearance.system") },
            { value: "light", label: t("appearance.light") },
            { value: "dark", label: t("appearance.dark") },
          ]}
          value={choice}
          onChange={(value) => {
            // The control is ours and its values are the three, so this can
            // only fail if somebody adds a fourth option and forgets the type.
            if (isThemeChoice(value)) chooseTheme(value);
          }}
        />
      </GroupedListItem>
    </GroupedList>
  );
}
