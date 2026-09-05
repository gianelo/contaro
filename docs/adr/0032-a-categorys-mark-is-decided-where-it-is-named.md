# A Category's mark is decided where it is named, and its letter is the ordinary case

#39 asks for the month's list as `design/Movimientos.dc.html` draws it: two stat cards instead of two rows, a Category's icon on every row, and whose money it was as a circle instead of a line of text. The icons are the interesting part, and not for the reason the ticket's table suggests.

## The mark is a fact about a Category, not about a row

`categoryMark` lives beside `categoryLabel`, in the same file, and `ReadableCategory` carries a `mark` the way it carries a `name`. Both are answers to one question — what is this Category to a person — and a screen that worked the second one out for itself would be a second answer to it.

The *shape* of a mark lives in `@/ui/category-mark` and which mark a Category gets lives in `@/i18n/category`, which is the split `Avatar` and `memberColour` already draw: the component library owns the circle, and something that knows the domain decides what goes in it. The map's keys are the shipped catalogue's own slugs, and a component library that knew those would be one that knows what a Space ships with.

That is the same argument `namesFrom` was written for: "Said once, so the month's list and the month's plan can never name one Category two ways." A row has an identifier and nothing else, so if the mark did not ride along with the name through the same lookup, two lookups would be two chances to name one Category and draw another.

It is keyed by `slug`, which is the only stable name a Category has. `categories_shipped_or_typed` says the shipped rows carry one and the rows a Member typed never do, and the translated name is not a key at all — it changes the day a second language lands.

A subcategory falls back to its heading's slug: `food.groceries` is drawn as `food`. Fourteen more rows in the map would say the same thing fourteen times and go stale the day the seed migration gains a fifteenth.

## The fallback is a letter, and it is most of the screen

Two of the nine shipped headings are drawn on an artboard — `food` and `transport`. Seven are not, and a Category a Member typed can never be: there is no glyph for "Ahorro" and there never will be one. So the unmapped case is the common case, which is why the ticket calls it the work rather than an edge of it. (The canvas draws a third icon, the arrow, and it belongs to income, which is not a Category at all.)

Three answers were available and two of them are wrong.

**A hole** is wrong because the circle is not decoration. It is what keeps every row's text starting in the same place down the list, so a row without one has stepped out of the column its neighbours are in.

**One shared glyph** — a tag, a folder — is wrong for a subtler reason, and it is the reason this ADR exists. A mark that is identical on every unmapped row has stopped marking anything. Somebody who has typed five Categories of their own would get five identical circles: a picture that says less than no picture, because it takes the width of a signal and carries none. And the shipped icon set has no glyph free to be it anyway: `icon.test.tsx` asserts the set is exactly what the canvas draws, deliberately, and every neutral name in it is already spoken for — `list` is the Movimientos tab and `rotate` is the Carry-over the canvas reserved it for.

**Its own letter** is the answer, and the product already had it. A Member is drawn as one letter in a coloured circle; a Category with no drawing is drawn the same way, with `initialOf` — the same function, so there can never be two answers about what the first letter of a word is.

It is worth being exact about what that buys, because the tempting sentence is "it is different for different Categories" and that is not true. Letters always take the grey tint, so "Ocio" and "Otros" both come out as a grey **O**, and so do any two Categories a Member typed that start alike. What a letter buys is a much smaller collision than one shared glyph, which collides on every unmapped Category there is: twenty-something buckets instead of one. That is the honest claim, and it is the one the tests assert.

Closing the remaining collision would mean giving the letter a tint derived from the name, and that is refused: with two tints it halves the collisions at best, and it would make the tint look like it means something when the next section says it must not.

The letter is taken from the name a reader sees and never from the slug. A circle with an `H` in it beside the word "Salud" is a circle about a different word.

A Category a migration retired gets no letter at all — an empty circle. Its row already shows a raw identifier where the name should be, and the first character of a uuid in the circle beside it would be a second unreadable thing rather than a mark.

## Two tints, named for what they look like

The canvas draws three circles across five rows and reuses them, so the tint tells one row from the next at a glance. The third belongs to a bread glyph that is not in the icon set and is not being added, so two shipped: `--color-category-green-*` and `--color-category-grey-*`.

They are named for their hue, which every other token in this file refuses to do — and that refusal is right everywhere it is applied, because every other token has a job. These do not rank, classify or warn, which is the only claim being made for them; the canvas assigned them and nothing reads them back. A job-sounding name on that (`--color-category-important`) would be a promise the screen never keeps.

The green pair is the same two hexes as `--color-accent` and its soft ground and is deliberately not written as `var()` of them, exactly as the first Member pair is not written as `var()` of `--color-info`: they agree by coincidence of hue and not of meaning, and restyling the brand must not repaint a Category's circle. The grey ground is the canvas's `#EFEFF2`, which is also `--color-separator` — a ground here rather than a line, which is a different thing that happens to be the same colour today.

There is no dark Movimientos artboard, so both dark halves are invented, the way the status colours were. That is the mistake ADR-0028 records being caught only by reading both artboards, so it is written down here rather than left to be discovered.

## Whose money it was is a circle, and the throw stays off the screen

`ReadableMovement.attribution` — the string "Plata de Ana" — is gone, and `whose` carries a name and a colour in its place. The line cost the row its whole second line to say what a 21px circle says in no width at all, and the circle is a labelled image, so the fact is still there for anybody who cannot see the colour.

`memberColour` throws for a Member the Space does not hold, and rightly (ADR-0020): drawing a stranger as one of the Space's own is a wrong statement rather than a missing one. That throw must never reach the month's list, so the colours are worked out once in `whoseFrom`, from the Space's own rows. A Movement attributed to somebody who has since left finds nothing in that map and draws no avatar — the missing statement, which is the honest one. Asking for a colour per row would have put the question to an id the Space no longer holds and taken the whole month's list down with it.

A Space of one draws no avatar at all, and it hangs off the fact the second line already hung off: `whoseFrom` is empty below two Members. Every Movement there is the reader's, and a circle that says so on every row is one a thumb stops seeing.

## Consequences

`initialOf` moves out of `avatar.tsx` into `initial.ts`, the way `memberColour` already lives apart from `Avatar`: two different circles are drawn with it now, and a module that needs only the letter should not have to pull a component and a stylesheet in to get it.

The avatar gains a third size, 21px, and `--text-3xs` at 10px under it — smaller than any type meant to be read. That is allowed because nobody reads it: the whole name is on the label, so ten pixels of letter is a colour with a hint in it.

The amount is now the loudest thing on the row, at 15px semibold in the ordinary ink. It was 14px in the secondary grey, quieter than the Category above it, which is backwards for the figure a person opened the screen to read. `row.source.test.ts` holds the comparison, because it is a fact about two rules together and neither rule can state it alone.

The two totals stop being a `GroupedList`. As rows they read as a list of two things a thumb might tap, which is what a grouped list means everywhere else on this screen, and neither of them goes anywhere.

`--radius-card` is named for its use rather than wedged into the radius scale at 14px, the way `--radius-sheet` already is.

What this postpones: the seven undrawn shipped headings wear a letter until a canvas draws them, and that is a design decision rather than a coding one. The Carry-over's `rotate` is untouched — there is no `origin` column and nothing produces one, so there is nothing yet to map (ADR-0003).
