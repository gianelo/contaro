# The export's content half is built from the sources, and its shell is not

#95 asked the question ADR-0045 left open when it recorded the drift instead of
fixing it: is there a way to have `design/contaro-app.html` produced from the
sources, or a check that fails when the two disagree? ADR-0045 read the file as
one indivisible generated artefact — "2.6MB of generated bundle with no script
behind it" — and concluded that regenerating it was a human action.

Half of that is true. Opened rather than assumed, the export is two things in
one file. It is 11009 lines, and 11008 of them are a canvas editor shell: React,
fonts, styles, the pan-and-zoom viewer, none of which has a source anywhere in
this repo. Line 1067 is the other thing. It is a single line of JSON inside
`<script type="application/json" id="appifact-doc">`, and everything in it that
is not editor state is the fifteen files in `design/` — the fourteen artboards
`canvas.json` lists, and `canvas.json` itself — serialized and nothing more.

Only the second half has ever drifted, and it is exactly the half the repo
already holds the sources for. So the answer to #95 is yes, and the reason is
that the question had one word too many in it: the export is not produced from
the sources, its content is, and its content is all that was ever wrong.

## So the content half is built and checked

`scripts/design-bundle.js` reads the fifteen sources in the order the bundle
carries them, parses the payload out of a bundle, serializes a document back
into that one line, and splices it in leaving every other byte where the editor
put it. `scripts/check-design-bundle.js` is the runner: it fails when the two
disagree and `--write` rebuilds the line. `pnpm check:design` is in the `verify`
chain beside `pnpm check:migrations`, and that placement is the argument.

ADR-0008 put migrations under a check for a reason it states plainly — expand
and contract is "enforced by a check, not written down and trusted", because the
tool that writes the SQL "emits DROP COLUMN without asking, so the SQL it writes
is a draft and not a verdict". This is the same shape. The canvas editor emits a
bundle whenever somebody last happened to press export, so the bundle is a draft
of what the sources say and not a verdict on it. ADR-0040 wrote the rule down in
its own Consequences, in as many words: a source and its export disagreeing about
the copy is worse than either being wrong on its own. Writing it down is what was
tried, and this is the second drift on the same file since. The first one was
noticed two changes late, in #95, by which point it had swallowed #63 and #81
both.

A rule nothing checks is a rule that holds until somebody stops watching.

## What it caught, which is the whole of #95

Run against the bundle as committed, before anything was rebuilt, the check
named three disagreements and no others:

```
    ✗ Presupuesto.dc.html: the bundle draws it the way it was, not the way it is
    ✗ canvas.json: the bundle draws it the way it was, not the way it is
    ✗ Presupuesto63Plegado.dc.html: the design folder no longer has it
```

Those are #95's first three acceptance criteria, found by the script rather than
by a person reading a 2.6MB file. The rebuilt bundle now carries a
`Presupuesto.dc.html` byte-identical to the one on disk, so the Category tray
from #63 is in it — the chevron `stroke="#C7C7CC"` appears four times where it
appeared zero — and so is the "Agregar al plan" row from #81. Its `canvas.json`
is byte-identical too, so the Idea C note says what the source note says, and
the word **DEBAJO** is now nowhere in the file. It embeds fifteen sources where
it embedded sixteen, and `Presupuesto63Plegado.dc.html` is gone with the artboard
`28d0e0a` deleted.

The report says which of the three kinds each one is, rather than that the two
differ. A source the export never saw, an artboard the export kept after the
folder dropped it, and one whose drawing has moved on are three different
mistakes with three different fixes, and this drift was two of them at once.

The check refuses a bundle whose payload it cannot find or parse instead of
passing. A check that quietly finds nothing to compare is a check that passes on
a file it never read, which is indistinguishable from the state it exists to
prevent.

## The boundary is the interesting part

Two things in that payload are not built, and the generator carries them over
from the bundle it is rewriting rather than inventing them: `title`, which is the
string `contaro`, and `comments`, which is empty. They are editor state, they
have no file in `design/` to be rebuilt from, and a script that made them up
would be having an opinion about a thing it cannot see.

The shell is the larger admission. Those 11008 lines are still only ever produced
by the canvas editor, and nothing here changes that. Picking up a newer editor —
a fixed viewer, a new control — remains a human re-export, and this repo has no
way to produce it and no way to check it. What is now impossible is the narrower
and realer failure: the shell being perfectly current while the artboards inside
it are two changes stale. That is not a hypothetical shape of drift, it is the
one that actually happened, twice, and it is the only one either time.

Which also settles #95's second question, whether committing the bundle is worth
it at all. It is, now that its content cannot be wrong: the export's job is being
openable, and being openable was never in tension with being right — the tension
was with being unchecked.

## The escaping is pinned by a test because it is correctness

The serialization is `JSON.stringify(doc)` with every `<` rewritten to the six
characters `\u003c`, and `scripts/design-bundle.test.ts` holds that in a test of
its own.

It looks like formatting and it is not. The payload sits inside a `<script>`
block, and the artboards it carries are HTML documents that contain their own
`</script>` tags. An unescaped one ends the block early, and what follows stops
being a JSON payload and becomes text drawn on the page — a 2.6MB file that
still opens, still looks like a canvas, and is silently missing everything after
the first artboard that had a script in it. It is also the only escape the
editor applies, which is what makes rewriting one line of somebody else's
generated file safe at all: the test that parses the real bundle and
re-serializes it reproduces line 1067 byte for byte, and that byte-for-byte
result is the licence for everything else here.

The way back is plain `JSON.parse`, and that is deliberate enough to be worth
saying: `\u003c` is an escape JSON already understands, so undoing it textually
first is redundant on every artboard and wrong on one — a script that spells
those six characters out is written with its backslash escaped, and a blind
replace over the line turns it into `\<`, which JSON has no escape for and
which fails the whole 2.6MB file rather than the one artboard. A test holds that
too.

The suite tests the pure logic against small in-memory bundles, plus that one
invariant against the real file. Nothing snapshots 2.6MB.

## ADR-0045 is answered rather than contradicted

Its closing paragraph said hand-editing an export is not regenerating it, "it is
a third copy of the copy". That is still true and this does not break it. The
generator is not hand-editing: it discards whatever the payload held and rebuilds
it from the fifteen sources every time, so there is no patch to be silently
discarded by the next export and no third copy to keep in step. A person who
edits that line by hand is still doing the wrong thing, and now `pnpm verify`
will say so the moment the sources disagree with what they typed.

## Consequences

The drift from #63 and the drift from #81 are closed together, in one rebuild,
which is what #95 said would happen — "whoever regenerates it closes both".

`design/contaro-app.html` changes by exactly one line. `git diff --stat` reports
one insertion and one deletion, the hunk header reads `@@ -1067 +1067 @@`, and the
file is still 11009 lines. That is the shape every future rebuild should have,
and a diff wider than one line means the editor shell moved, which is a human
re-export and a different piece of work. It reads in that direction only: the
payload is one line whatever it holds, so one insertion and one deletion is as
true of replacing every artboard as of replacing none. The diff says the shell
did not move; the check is the only thing that says the content is right.

The manifest and the folder are now two lists of the same set that have to agree.
An artboard `canvas.json` lists and the folder does not have, or a `.dc.html`
beside it that no artboard points at, both stop the check with the filename in
the message. Neither is silently dropped into the bundle, because a file in one
list and not the other is a source-side mistake the export would otherwise
inherit — an artboard nobody can see on the canvas, or a canvas entry pointing at
nothing. Today they match at fourteen.

`pnpm verify` grew a fourth gate and it costs nothing to run: no database, no
browser, one file read and one comparison.
