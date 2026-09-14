# The way out and the way in share one head, and the way in is one control

Issue #142.

Five screens in contaro leave `AppShell`'s tab bar behind because a person on them is doing one thing. Four of them wear `EntryHead` — the Movement entry and correction screens, and the plan's entry and correction screens. The fifth, creating a Space, did not: `src/app/espacios/nuevo/page.tsx` drew an `<h1>`, then the form, then a `Cancelar` link under it.

`design/CrearEspacio.dc.html` has drawn the bar since it was first drawn — `Cancelar` / `Nuevo espacio` / `Crear`, the last one greyed. ADR-0060 left the gap here by name and guessed wrong about who would catch it: #138 shipped a **colour** check, and a colour check cannot see where a control sits.

## The direction was not open

ADR-0028 put `Cancelar` in the head on the Movement entry screen, ADR-0046 extended that to the plan's, and ADR-0047 extended it again to both correction screens. The argument has never changed: a person who changes their mind is at the top of the screen or at the keypad, and neither is a scroll away from a bar across the top. This screen is the last one that had not heard it.

So nothing here is a new decision about where the way out goes. What *is* a decision is the control on the other side of the bar.

## `Crear` is the form's submit and not a second way in

The canvas draws a `Crear` in the head **and** a full-width `Crear espacio` at the foot. Only one of them is built, and it is the one in the head.

Two controls that submit the same form are two disabled rules to keep in step, two accessible names for one act, and two places a person can be told "no" differently. The screen already had that shape latent: `form.tsx` rendered `<Button type="submit" disabled={pending}>`, which is refused *while* submitting and offered before anything at all is typed — the opposite of what the canvas draws.

One control, in the head, disabled until the form can actually be sent. The foot of this screen now ends at the warning ADR-0001 owes whoever is about to choose a currency, which is the last thing worth reading before the head is reached for.

> The canvas still draws the foot button. That divergence is deliberate and it is the canvas's to settle, not this change's — the same artboard also draws a `COMPARTIR` block and a pending-invitation row that this screen has never had. #138's check reads colour and would pass either way; nothing yet reads structure, which is the seam this ADR stands in.

## Why the head moved into the client component

The other four screens render their head from the server component above the form. This one renders it from inside `NewSpaceForm`, because the control in it is the form's own and so is the only interesting thing about it: whether it can be pressed yet.

That is client state. A server component cannot hand it down, and mirroring it up through a prop would mean the screen knowing what makes its form answerable — a second copy of a rule that already exists on the fields. `BudgetItemCorrectionHead` made the identical trade for the identical reason under #105: the control has to sit in the head because that is where the room is, and its state cannot come from above.

The button therefore stands **outside** the `<form>` element in the DOM and is tied to it by the `form` attribute and a `useId`. Wrapping the head inside the form instead would have avoided the attribute and put a heading and a link inside the thing being submitted, which is not what either of them is.

## Whether it can be sent is read off the form, not mirrored

`Crear` is disabled when `form.checkValidity()` is false, read back on every change to the form.

The alternative was to mirror the two answers into React state and derive the rule here. It is one line shorter today and it is a second definition of "what makes this screen answerable", living a file away from the `required` attributes that are the first one. The third question somebody adds to this form is the one that goes out of step.

Reading the browser's own answer also keeps the layers honest end to end: the browser refuses an invalid submission, and `handleCreateSpace` refuses it again on the server, because a form field is a claim (ADR-0010). The control being greyed is the *first* of three refusals and never the only one — which is what the e2e spec asserts, rather than asserting the grey alone.

## The shape of a trailing control is shared; what it means is not

`EntryHead`'s trailing slot holds an invisible copy of `Cancelar` by default, there only to centre the title. Anything real put in it is therefore a button on a bar of plain text, and it has to give up every ground, border and box a browser would hand it, or the head reads as two registers of control instead of one.

Two screens now do that — taking an item off the plan (#105) and creating a Space — and they arrived at the same nine declarations independently. That is the second time this repo has watched a rule about what a control looks like get written twice; `hitTarget` was the first, and its stylesheet says why it exists in those words: *the rule has one place to be wrong*.

So the reset moves to `src/ui/trailing-control.module.css`, exported as `trailingControl` through a one-line module the way `hit-target.ts` exports its class, and both screens compose the two together.

What does **not** move is colour and type. A destructive icon and an accent word are what the two screens actually mean by their control, and the line was drawn already when ADR-0046 moved the pill's shape into `@/ui/entry-head` and left what it says with the screens. The refused state is the one exception and it is shared on purpose: a plain control goes grey, and it goes the same grey wherever it is, because fading an unfilled control says "loading" and not "not yet".

`trailing-control.source.test.ts` reads both screens' stylesheets, so a third copy of the reset fails the suite rather than waiting for a fourth screen to notice.

## What this costs

`space.new.submit` is now `Crear` rather than `Crear el espacio`. The bar has three things in it across 390px and the canvas drew the short word; the long one is what the foot button had room for and the foot button is gone.

`page.module.css` is deleted. Both its rules — `.title` and `.back` — styled elements that no longer exist.

`e2e/space-creation.spec.ts` gains a fold test at the iPhone 13's 390x664, the sibling of the three ADR-0047's family already has. Moving a control into the head is exactly the kind of change that quietly costs height elsewhere, and this screen had never been measured.
