# A heading is an answer, and what is under it is an offer

#12 asked that "the interface suggests a subcategory when one exists, without forcing it". Everything else in that ticket was built; this was a screen change rather than a domain one, so it came out as #45 and was decided there.

What the screen did until now was flatten the whole catalogue into one row of chips: every heading followed by its own children, all of them identical, the heading first. Twenty-four chips with nothing saying which of them sat inside which. "Without forcing it" was true, because the heading stayed selectable. "Suggests" was not: nothing marked a child as the preferred answer, and the heading took the earlier position, which steers the other way.

## The decision

**Tapping a heading chooses it.** The field is filled, the form is valid, the save button is live. That is what keeps story 19 of #1 true — a Category is one tap from the amount — and it is what makes a heading an honest answer rather than a way through, which the domain already agrees with: money filed on a heading counts against the heading's plan and never against a sub-limit under it (ADR-0021). A screen that treated a heading as a step on the way to something else would be disagreeing with the ledger.

**What the heading holds is offered next, not demanded.** Choosing a heading that has children replaces the list of headings with the chosen one plus a second group, "¿Algo más preciso?", holding its children. Tapping one moves the choice down to it; tapping the heading chip again moves it back up. Nothing in that second group is required, which is what "without forcing it" looks like when it is drawn rather than asserted.

**Getting back out is one tap.** "Cambiar", beside the chosen heading, returns to the whole list and leaves no answer behind: it is the answer that changes, not the screen. A heading with no children skips the second step entirely, having nothing to offer, and the other headings never leave the screen.

It was chosen on a canvas of the real screen, with this project's own tokens and catalogue, against two alternatives: <https://claude.ai/code/artifact/36935597-b5c8-49ee-b50a-1b4f06202f0c>

- **Weight.** Keep the flat list and draw a heading that has children in a dotted outline and secondary ink: available, not offered. One tap, and the smallest change of the three — but the list stays flat and long, and which child hangs off which heading is still invisible.
- **A row per branch.** Each heading labels its own row, its children first, the heading closing it as "En general". The hierarchy is visible and everything stays one tap — and it is the tallest by far. With nine branches, most of it is below the fold.

## The cost

A subcategory now takes two taps rather than one, and while one heading is open the other eight are off the screen until "Cambiar" is tapped. That is the trade, and it is the one that was chosen. What it buys is a first screen of nine chips instead of twenty-four, and a shape where the suggestion is something a person can see.

## Where it is said

`BranchingChipField` in `src/ui/branching-chip-field.tsx`, which composes `ChipField` rather than restating it: the radio group, the 44px target, the off-screen input and the focus ring are the same rules in both. Both steps write one field under one name, because the answer is one Category.

`categoryChips` in `src/app/espacios/[id]/movimientos/month.ts` stopped flattening: which branch a chip belongs to has to survive the trip to the screen. A subcategory still carries its heading as the `qualifier`, and now it has to — the second group's legend asks for something more precise rather than naming the heading, so the qualifier is the only thing telling a listener which branch a child is heard in.

This is every screen that picks a Category and not only the one that records a Movement: recording a Movement and correcting one, planning a Budget item and correcting one. Picking a Category is one question, so it gets one answer; two behaviours for the same control is how a product stops feeling like one product.

## Consequences

A correction opens on the branch the saved Category sits in, so a Member correcting an amount never has to answer the Category again to keep it.

The entry screen carries two "Cambiar" at once whenever a heading with children is chosen: the one that unfolds the day and the attribution, and this one. The canvas drew both, and it is the shape that was wanted. They are not ambiguous in practice — they sit in different groups, and the first is heard as "Hoy · Nara Cambiar" rather than on its own, because a `<summary>` is named by everything inside it. Deliberate, and not an oversight to tidy away.

If the catalogue ever grows a third level, this control does not deepen: `ChipBranch` is two levels because the catalogue is two levels (ADR-0021), and a third would want a different control rather than a recursive one.

#37 redraws this same screen and says "the shape of the chips are already right". After this they are not the same chips; whichever of the two lands second inherits the other's work.
