# A Budget item is a gasto previsto, and the adjective is the whole difference

`CONTEXT.md` has always defined a Budget item well — *"one expected expense inside a Budget, carrying its Category and amount"* — and refused three words under it: Line, Entry, Row. What a person actually read was the Spanish half, and there the word was **ítem**, in eight strings and on one artboard.

Nobody chose it. It arrived because something had to be typed on a button. `CONTEXT.md` chose every English word standing above an avoid list; it never chose the Spanish one, and the word that filled the gap was the container word those same lists refuse three times over.

#82 is not a rename. It is the choice that should have happened first.

## Why now

Three tickets are about to write this word into three screens at once. #79 gives every item a name of its own, so the word for what kind of thing "Semana 1" *is* gets said out loud. #80 merges the two forms, so "Agregar un ítem" and "Agregar un fijo" become one sentence that has to work for both kinds. #81 moves that sentence to the top of the screen, where it is read first rather than last. Choosing once is cheaper than choosing three times and reconciling.

## The two families Spanish offers, and why both were refused

**Cupo, tope, límite, sobre.** These are the warmest, most household words available — *"ya gasté el cupo del súper"* is how a person really talks. Every one of them promises enforcement. `CONTEXT.md` already refuses Limit, Cap and Allowance under **Budget** for exactly this, because a Budget *"never blocks a Movement from being recorded"*. A word saying the app will stop you, on an app that never stops you, is a lie written on a button — and it is a worse lie in Spanish than in English, because these words are warmer and therefore more believed.

**Línea, renglón, partida.** These are Line, Row and line item. They name where the thing is drawn rather than what it is, which is the whole of the existing refusal. *Partida* is additionally accounting jargon in a household tool.

Between the two families, most of what sounds natural was already ruled out by rules written before this ticket. That is the avoid list doing its job.

**Previsión** survives both tests and was still refused: it names the expectation with the money taken out of it, and reads like an insurance policy rather than the shopping.

## Gasto previsto, and the objection to it

**Gasto previsto** is `CONTEXT.md`'s definition put in Spanish, word for word: an expected expense.

The objection is real and worth writing down, because it will be raised again. The UI already calls a Movement a *gasto* — `"Se va a crear un gasto de"` — and #63 is about the Budget screen confusing two things that look alike. Reusing "gasto" for a Budget item pulls those two nearer.

It is accepted deliberately, and the reason is the product itself: **previsto against gastado is the comparison a Budget exists for.** The two things *are* the same kind of thing seen at two moments, and the adjective is the whole of the difference. Giving the planned half a word with no relation to the spent half would hide the one relationship the screen is built to show.

`design/MasHoja.dc.html` had already made this argument without naming it. Its sheet draws two rows in parallel:

| | |
| --- | --- |
| **Un gasto** | Plata que ya salió |
| **Un ítem al plan** | Plata que esperás gastar en septiembre |

The subtitles are one opposition — money that left against money you expect to spend — and the titles were two unrelated words. The artboard was already asking for the adjective. That row now reads **Un gasto previsto**, and the pair reads as a pair.

## The kinds are said whole

"Agregar un fijo" became "Agregar un gasto fijo", and "Corregir el fijo" became "Corregir el gasto fijo". Neither said *ítem*, so neither was on #82's list; they moved because a bare *fijo* is an adjective standing in for a noun, which makes a fixed item look like a different species from what the other button adds. Saying the kind whole makes the two ways into a plan read as two kinds of one thing — which is what #80 is going to merge, and merging is easier when the copy already says they belong together.

The list headings `budget.fixed` and `budget.variables` — **Fijos**, **Variables** — are deliberately left alone. Their own comments say they are "named for the kind of item rather than for the grouping", and a heading over a list names the grouping a person is looking at rather than the thing standing in it. The rule is about the noun, not about every appearance of the adjective.

## What "ítem" was doing in half of the strings

Eight strings said *ítem*, and only four were naming the thing — one button and three screen titles. The other four were grammatical filler: *"Ese ítem ya no está"*, *"Este ítem ya está pagado"*, *"Ese ítem ya estaba pagado"*, *"No pudimos guardar el ítem"*. There the fix is not to substitute a noun but to say the sentence properly, and each one now says which thing it means:

- `budget.error.gone` says the noun whole — **"Ese gasto previsto ya no está."** A bare *gasto* would be ambiguous now that the word also names a Movement, and the full noun answers that without a clause, keeping the shape its two siblings already have: *"Ese movimiento ya no está"*, *"Esa invitación ya no está"*.
- `budget.error.alreadyPaid` and `budget.fixed.paid.title` say **gasto fijo**, because only a fixed item is ever paid.
- `budget.error.failed` says **gasto previsto**, the parent word, because it is the one refusal that covers both kinds.

## What this does not settle

The English domain word stays **Budget item**. `CONTEXT.md` is the code's vocabulary and the UI's is a translation of it; they were already different, and nothing here argues they should not be. `budget.item.*` message keys, the `budget_items` table and every identifier are untouched — this ADR is about a word a person reads.

Whether the two kinds keep being read as **Fijo** and **Variable** once #80 stops asking anybody to choose between them stays open, and the two list headings are untouched here. This ADR settles only that where a kind is named as a noun, it is named whole.

## Consequences

- `CONTEXT.md`'s **Budget item** entry carries the chosen word and an avoid list that now names both refused families in Spanish, so the next person to reach for *cupo* finds the reason already written.
- Ten strings in `messages.es.ts` changed: the eight that said *ítem*, plus `budget.fixed.new` and `budget.fixed.edit.title`, which said a bare *fijo*. Five test assertions and one artboard row moved with them.
- `design/canvas.json`'s proposal notes moved too, in seven passages, one of which quotes both buttons verbatim. Those notes are the material #79, #80 and #81 will be written from. A note still arguing an open ticket is not a record of anything, and leaving the old word standing in it is how the old word comes back.
- `design/contaro-app.html`, the exported bundle that embeds both the artboards and those notes, carried all eight passages and moved with them. A source and its export disagreeing about the copy is worse than either being wrong on its own.
- ADR-0035's prose quotes the old button text as a historical example, and is left alone. That is the line between the two: an ADR records what was true when it was signed; an open proposal note describes what is true now.
