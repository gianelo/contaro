# Following the phone is said by writing nothing at all

#41 asks for a dark theme somebody can choose rather than one their phone
imposes. #1 had left it open — *"whether a dark theme ships on day one"* — and
the canvas answered it on day one with a whole artboard, `Cargar gasto ·
oscuro`, the same screen in the dark palette.

Most of the work was already done, and #41 said so. `tokens.css` declares every
colour once with `light-dark()` under `color-scheme: light dark`, and already
honours `[data-theme="light"]` and `[data-theme="dark"]` (ADR-0025's tokens,
extended by ADR-0028). The app has turned dark with the phone since #34. What
was missing was the choice: nothing in `src/` ever wrote `data-theme`, so a
Member whose phone is light and who wanted dark had no way to say so.

## The third state is an absence, and that is the whole design

A theme choice has three answers — light, dark, and whatever the phone says —
and the third is where it starts. The obvious way to build the third is to read
`matchMedia("(prefers-color-scheme: dark)")`, resolve it to `light` or `dark`,
write that on the document, and add a listener so the app keeps up when the
phone changes.

That is wrong here, and it is wrong for a reason worth writing down. `applyTheme`
answers "follow the phone" by **removing** the attribute rather than by
computing one:

```ts
if (choice === "system") {
  delete root.dataset.theme;
  return;
}
root.dataset.theme = choice;
```

With no `data-theme` on the document, `color-scheme: light dark` and every
`light-dark()` under it track the OS by themselves, live, with no reload and no
JavaScript at all. #41's fourth criterion — *"choosing to follow the phone
tracks the phone changing, without a reload"* — is satisfied by code that does
not exist.

A `matchMedia` listener would have been a second answer to a question CSS
already answers, and two answers to one question eventually disagree: the
resolved attribute would win over the media query, so any moment the listener
missed would leave the app pinned to a palette the phone had left. It also
would have cost this repo its first jsdom `matchMedia` stub, in a test suite
that has needed none in 739 tests.

## The choice is stored; the *theme* never is

`localStorage` holds `"light"`, `"dark"`, or nothing — never a resolved theme.
Storing what the phone currently says would freeze a preference into a snapshot
of a Tuesday evening.

Anything the module did not write reads back as `"system"`: a value from an
older build, a value from another app on the origin, or a browser that throws
on `localStorage` outright rather than returning `null` (Safari with site data
blocked does this). `storedTheme` and the pre-paint script both catch. On the
write side the failure is allowed through differently: `chooseTheme` applies the
theme even when the browser refuses to remember it, because forgotten on the
next visit is a much smaller wrong than a control that does nothing.

## The script runs ahead of every element the app draws, and Next decides where

*"A screen opened on the dark choice never flashes light first"* cannot be met
by a component. React renders after the first paint. `next/script`'s
`beforeInteractive` does not block the paint either — its own documentation says
execution "does not block page hydration from occurring". Either way the person
who asked for dark is the one who watches the screen flash white.

So `src/app/layout.tsx` renders a bare inline `<script>`. **Where it lands is not
the layout's to choose**, and finding that out cost an e2e failure worth keeping
here: the first version asserted the script came before `<body>` in the served
HTML, and it does not. Next puts an inline script at the top of the body
whatever the layout does with it — rendered loose as a sibling of `<body>`,
rendered inside a hand-written `<head>`, or handed to `<Script
strategy="beforeInteractive">`, all three come out in the same place —
`beforeInteractive` fractionally later than the plain tag, for the trouble.

What is true, and what the criterion actually needs, is that it precedes every
element this app draws. `e2e/theme.spec.ts` asserts exactly that and no more —
the script's offset against the first `<main>` in the served HTML — rather than
the stronger claim that turned out to be false.

The step from there to "nothing has painted" is reasoning and not evidence, and
it is worth marking as such: the stylesheets above it are render-blocking, so
the browser cannot have painted before they load, and an inline script waits on
those same stylesheets before it runs. No test in this repo proves that, and a
test that tried would be timing a few milliseconds in a headless browser. What
*is* proven behaviourally is the outcome: a phone emulated light, `dark` already
in storage, and the first thing the e2e can see is `data-theme="dark"` with a
black `body`.

It is deliberately tiny and deliberately dumb — `var`, no optional chaining, one
`try/catch` — because it runs before everything else on the page, and an
exception in it is a white screen rather than a wrong palette.

It is also the one place in this app that writes HTML as a string, which is why
the string is built in `src/ui/theme.ts` out of the same `themeStorageKey` and
the same list of choices the rest of the module uses. The script cannot import
anything; it is the one half of this that could quietly stop agreeing with the
other, and constructing it from those constants is what makes drift impossible
rather than merely unlikely. `theme.test.ts` runs the real script string through
`new Function` and asserts what it does to the document, so the string is tested
and not just spelled.

`<html>` takes `suppressHydrationWarning`. That disagreement between the server's
markup and the client's is the feature: the server does not know the choice and
cannot, because the choice lives in the browser.

The proof is read off the served HTML rather than off a screenshot. A flash is a
few milliseconds and a screenshot of one is a coin toss.

## The control is on the Space's Ajustes screen, and it is not the Space's

`/espacios/[id]/ajustes` is the only settings screen the tab bar reaches, and
its own comment said it was waiting for exactly this: *"this screen is where
whatever comes next that is not money will go"*. A theme is not money.

It is still a real tension, because the catalogue above it belongs to the Space
in the URL and the theme belongs to the device. The alternative was a root-level
`/ajustes` for device preferences — and that would put the word "Ajustes" in the
app twice, at two scopes, for a person to tell apart, plus a second way in from
a screen that has no tab bar. One screen with the Space's things first and the
device's under them is the smaller cost. `Appearance` says so in its own
comment, so nobody reads the URL and concludes the choice is per Space.

`SegmentedField` carries it. Its shape claims "these are all of them, and one is
already true", which is exactly a theme; the claim was never about there being
two of them, and its comment now says two or three and no further — a fourth
answer inside a 390px column leaves four labels nobody can read.

Unlike the direction control, this one prints its question. "Gasto | Ingreso"
says what it is being asked by being read; "Automático | Claro | Oscuro" says
automatic *what*. So the group's heading does real work here, and the heading and
the control take the same word: they are one question, and a second word for it
would be a second thing to learn.

## What the ticket asked for that was already there

#41's fifth criterion asks for two tokens `tokens.css` lacks — an amount nobody
has typed, and a button that cannot be pressed. Both landed in ADR-0028, after
#41 was written: `--color-disabled`, `--color-disabled-surface` and
`--color-on-disabled`, all three already guarded in both palettes by
`tokens.source.test.ts`. Nothing was added. Adding them again would have been two
names for one colour, which is ADR-0028's own warning.

`entry.source.test.ts` did have a real gap, and it is closed here: it guarded the
dead button's fill and ink against both artboards but never the untyped amount's
colour. That one is `#C6C6C8` in light and `#48484A` in dark — the same value as
the button's fill in light and a different one in dark, which is the exact shape
of the mistake that goes unseen with only the light artboard open.

The sixth criterion — every screen legible in the dark palette — needed no work
either, and that is worth stating rather than assuming: no stylesheet in `src/`
declares a colour. Every one goes through a token, and every token goes through
`light-dark()`. The only hex outside `tokens.css` is inside a comment.

## What this deliberately does not do

**Another tab keeps its palette until it is reloaded.** The `storage` event looks
like the fix and is not: nothing subscribes on the screens a person is actually
reading, so it would repaint the Ajustes screen and leave every other one alone
— which is worse than not having it, because it would half-work. Repainting
everywhere means a listener mounted on every screen, and #41 does not need that
machinery.

**The control corrects one pill after hydration.** `useSyncExternalStore`'s
server snapshot is `"system"`, because the server cannot know the choice, so a
device that chose light or dark renders "Automático" raised for one frame before
hydration moves it. A cookie would fix it, at the price of sending a device
preference to the server on every request. The *palette* never corrects — the
script settled that before the first paint — and the palette is what #41 asked
about.

**A Member with no Space cannot reach the control.** The tab bar exists inside a
Space and the Space list has none, so somebody who has just signed up and made
nothing has no way in until they make their first Space. It is the honest cost
of putting this on the Space's Ajustes screen rather than inventing a second
settings screen, and it lands on the one person for whom the app is still empty.

**The dark palette is taken on the canvas's word.** `e2e/theme.spec.ts` opens the
entry screen dark and reads back the untyped amount and the dead button against
`design/CargarGastoOscuro.dc.html`, which is the screen #41 singles out. Every
other screen is legible by construction — no stylesheet in `src/` declares a
colour — and that proves consistency rather than contrast. The dark disabled
pair is about 1.9:1, which is the artboard's own decision and not this change's
to overrule.

**The browser chrome is still light.** No `themeColor` is set in the viewport, so
the address bar does not follow. It is not one of this ticket's screens and
following the *choice* rather than the media query would mean rewriting a meta
tag from JavaScript. A follow-up, not a silence.

## Consequences

- `src/ui/theme.ts` is new: the choice, the storage key, `applyTheme`, and the
  pre-paint script string, together so they cannot drift. `theme.test.ts` covers
  all of it, the script included.
- `src/app/layout.tsx` renders the script and marks `<html>`
  `suppressHydrationWarning`.
- `src/app/espacios/[id]/ajustes/appearance.tsx` is the control;
  `settings.tsx` gained a second group and `settings.module.css`, which follows
  the Categories screen's `.group` padding rather than a flex gap.
- `src/ui/segmented-field.tsx`: two comments that had stopped being true were
  rewritten — the component's ("a choice with two answers") and `legend`'s claim
  that the halves always say what the question is. `segmented-field.test.tsx`
  gained a three-answer test and its `describe` was renamed.
- `src/ui/entry.source.test.ts` gained the untyped-amount guard.
- `src/i18n/messages.es.ts` gained `appearance.label`, `.system`, `.light` and
  `.dark`. "Automático" and not "Sistema": the thing a person has in their hand
  is a phone, and that is the word their phone already uses.
- `e2e/theme.spec.ts` is new: the script's position against the first element
  drawn, both forced themes against a phone pointing the other way, the phone
  being followed and changing live, the entry screen read back against the dark
  artboard, and the round trip through the control. It imports
  `themeStorageKey` rather than spelling it, because a spec that hardcodes the
  key is the drift this module's comment claims is impossible.
- Nothing was added to `tokens.css`.
