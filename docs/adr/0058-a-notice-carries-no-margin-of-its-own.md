# A Notice carries no margin of its own

`Notice` renders a `<p role="note">`, and `notice.module.css` never zeroed its
margin. Every `Notice` in the product has been carrying the browser's default
`1em` paragraph margin -- 28px at `--text-base` (14px top and 14px bottom) --
on top of whatever gap its container already declares.

This is ADR-0037's finding arriving on a fourth property. That ADR zeroed
`.figure`, `.currency`, `.line` and `.shared` for exactly this reason: *space
nobody chose, sized off each element's own font*. ADR-0046 then found the same
thing on a heading's `0.67em` margin. `Notice` is the one paragraph that was
never looked at, and ADR-0047 named it and left it, because re-spacing three
screens under cover of a fourth is not a fix -- it is a diff nobody reviewed.
This is that diff, reviewed on its own.

## Where it landed, measured

Three screens draw a `Notice` inside a container that declares its own `gap`,
which is where the bug is visible: a flex `gap` does not collapse against an
item's own margin the way block-flow siblings do, so the two add.

| screen | container | declared gap | before | after |
| --- | --- | --- | --- | --- |
| `espacios/nuevo/form.tsx` | `.form` | `--space-9` (20px) | 48px | 20px |
| `app/ui/gallery.tsx` | `.section` | `--space-4` (8px) | 36px | 8px |
| `movimientos/[movementId]/strike.tsx` | `BottomSheet`'s `.body` | `--space-5` (10px) | 38px | 10px |

Every row recovers exactly 28px, and that number needs no browser to trust it:
unlike ADR-0046's line-height, which came out different on a Linux fallback
font, a `<p>`'s default margin is `1em` of its own `font-size`, and `Notice`
sets that in px (`--text-base: 14px`) rather than leaving it to whichever font
the machine drew. 14px top plus 14px bottom is 28px on every platform that can
render this app, which is why the table above is arithmetic and not a
screenshot.

The third row is a margin and not a `gap` collision in the strict sense --
`strike.tsx`'s sheet holds one child, so `.body`'s `gap` never fires between
siblings -- but the mechanism is identical: `.body { margin-top: var(--space-5)
}` is the declared space between the sheet's title and its content, and
`Notice`'s own margin stacked 28px onto it the same way a `gap` would have.

## The decision: every declared gap already answers the question

Removing the margin does not leave a gap that needs re-deciding. Each
container's declared value already matches its own class of screen, checked
against the scale ADR-0037 and ADR-0046 both reasoned from:

- **`espacios/nuevo/form.tsx` keeps `--space-9` (20px).** This is the
  product's ordinary field-form gap where nothing is fighting a fold:
  `categorias/nueva/form.module.css` -- the same shape of screen, a `TextField`
  and a `SelectField` stacked with a `Button` -- declares the identical
  `--space-9`. The forms that instead use `--space-4` or tighter
  (`presupuesto/form.module.css`, `movimientos/form.module.css`) are the ones
  ADR-0046 and ADR-0048 measured against a keypad and a phone's fold; the
  Space-creation form has never been measured against either, and nothing
  about it is under that pressure. 20px is not what fell out of subtracting
  28 -- it is the value this form already shared with its nearest sibling
  before this change touched it.
- **`app/ui/gallery.tsx` keeps `--space-4` (8px).** `Gallery` is not a product
  screen; it is "every base component on one screen" (its own doc comment),
  and every one of its sections -- three stacked buttons, a list, a row of
  meters, a grid of icons -- uses the identical 8px to hold unrelated examples
  close enough to read as one page. Giving the fields section more air than
  the buttons section sits next to it would be a second scale invented for one
  section of a page whose entire point is that nothing on it is a special
  case.
- **`movimientos/[movementId]/strike.tsx` keeps `--space-5` (10px).** This
  number is not the strike sheet's to change: `.body`'s `margin-top` is
  `BottomSheet`'s own rule, shared by every sheet in the product (including
  `close-notice.tsx`'s, below). It is the standing answer to "how far is a
  sheet's body from its title", decided once for the component and not once
  per caller. Overriding it here would be the exact second place ADR-0037
  refused when it chose not to reset `<p>` in `globals.css`.

So the fix is the margin alone. No container's `gap` changes, because none of
the three was wrong -- they were each already the right number, carrying a
second, invisible number on top of them.

## What else this reaches

`close-notice.tsx`'s confirmation sheet draws a `Notice` inside the same
`BottomSheet.body`, alongside a paragraph and, where there is one, `Holdings`.
It was not named in the issue this fixes, because nothing there was
complained about -- but it is the same container and the same bug, and it
gets the same 28px back for free, landing on the same `--space-5` the sheet
already declares between its children.

Two more usages sit outside any `gap` container entirely: the closed-Budget
and closed-month `Notice`s in `espacios/[id]/page.tsx` and
`.../movimientos/page.tsx` are laid out by ordinary block flow inside
`AppShell`'s `.content`, which declares no `gap` of its own. There, `Notice`'s
margin was not a bug stacking on a decision -- it was the only decision, and
removing it lets the space between `Notice` and the block after it collapse
under ordinary margin-collapsing rules, because neither `MonthSummary`'s card
nor the plain `<section>` after it declares a top margin of its own. The space
above each `Notice` is untouched, because the block before it
(`CloseNotice`'s card, `MonthTotals`) already declares its own bottom margin
and that value governs the collapse regardless of what `Notice` contributes.
This is named rather than fixed, for the reason ADR-0047 gave for leaving
`Notice` itself alone: those two screens were not asked about here, and
deciding their spacing under cover of this change would be the diff nobody
reviewed, arriving from the other direction.

CONTEXT.md is not amended. Nothing here names or changes a domain term --
`Notice` is a UI primitive and this is a stylesheet correction, the same
reason ADR-0037 and ADR-0046 left it alone too.

## Where it is held

`src/ui/notice.source.test.ts` reads `notice.module.css` as text and pins
`margin: 0` on `.notice`, the same shape `hit-target.source.test.ts` and
`link.source.test.ts` use to guard a rule that a rendered jsdom test cannot
see at all: Vitest applies no stylesheet in this suite, so the only thing a
test here can check is that the rule stays written down. The three numbers
above are not held by an e2e test, because none of the three screens sits on
a fold path -- ADR-0047 said so for the strike sheet and it is equally true of
the other two -- so there is no existing fold assertion to extend, and adding
one here would be a new one written for a screen nobody has yet needed to
measure against a viewport.
