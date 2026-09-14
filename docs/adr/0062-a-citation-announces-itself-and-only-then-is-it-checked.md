# A citation announces itself, and only then is it checked

Issue #96.

This codebase argues in prose. Counted the day this was written: **521
references to an ADR across 144 files** under `src/` and `e2e/`, against the
61 ADRs that stood before this one — comments that do not restate the code but
name the decision the code came from. That prose is a large part of what makes
the repo navigable, and it was the one part nothing verified.

`tsc` checks shape. A test checks behaviour. A comment saying *"0012 added this
column"* has neither: it is an assertion about the world, and the world it
describes lives in another file.

It had already cost real work twice. ADR-0033 exists partly to untangle a
miscitation — `screen.tsx` had spent months crediting a product rule to
ADR-0010, which never made it. And #90's review turned up three findings, all
of them prose and no logic defect at all, one of which was a sentence in
quotation marks credited to ADR-0008 that ADR-0008 does not contain: the
comment said *"Making **a column** `NOT NULL`"* where the ADR says *"Making
**it** `NOT NULL`"*. That was the fourth ticket running (#40, #61, #81, #90)
where the review found stale prose and no bug.

## Only one shape of that claim is decidable

Not all of it. But **a quoted run presented as an ADR's own words** is a fact
with a location: the words are either in that file or they are not.

So the decidable half is checked and the rest is left to people. Attribution
errors where nothing is quoted, and claims that were true when written, still
need somebody reading. This is a cheap check for one shape, not a claim to have
solved comment drift.

## The trigger is opt-in, because a proximity rule would be deleted within a week

The whole risk is the trigger. Double-quoted text near an ADR reference is
routinely **not** a quotation of it in this tree — there are over four thousand
quoted runs of twelve characters or more under `src/` alone, against 521 ADR
references, and these three are typical:

- `budget.ts` quotes this codebase's own slogan, `"income is not spending"`,
  thirty-five lines from a real ADR-0016 citation in the same file — and it is
  a sentence ADR-0016 has never contained.
- `money.ts` paraphrases its own module, `"the Space's and is never the
  locale's guess"`, two lines above an ADR-0014 reference.
- `closure.test.ts` quotes a real claim and credits it to `(#118)` — a GitHub
  issue, not an ADR at all.

A proximity rule flags the first two and still misses the third. A length rule
lets the slogan through by **accident rather than by design**, which is worse,
because the next slogan this codebase invents might not be short. And a check
with false positives is a check that gets turned off.

We decided the citation **announces itself**, with a marker the writer opts
into and nothing else:

```
ADR-00NN says "..."
ADR-00NN is "..."
```

The quote has to open on the verb, with nothing between them but space. That is
what tells a citation from the parenthetical `(ADR-0014)` this repo writes
several hundred times, and from prose that reaches for an ADR mid-sentence:
`ADR-0024 is where that lives` is a phrasing already in the tree, and it cites a
decision rather than a sentence, so a quote later on the same line is not its.
Verified against the tree as it stands, the marker finds three citations and
nothing else — zero false positives across all 521 references.

The check is `scripts/adr-citations.test.ts`, and it runs in `pnpm test` and so
in `pnpm verify:all`. It is a test rather than another `scripts/check-*.js`
because what it asserts is a claim, not a build step.

## What the comparison forgives, and what it does not

The markup comes off both sides before the words are compared, and so does the
wrapping. A comment breaks a sentence wherever its column ran out and the ADR
broke it somewhere else, so every run of whitespace becomes one space. And an
ADR writes an identifier in backticks and stresses a word in bold — #90's
finding is a comment quoting exactly such a sentence with the markup dropped,
which is what a person copying it out does. Comparing raw bytes would fail
every honest quote and pass none.

What does not come off is an underscore inside a name: `0009_fixed_items` is a
file this repo cites by name, not an emphasis. A quote also cannot itself
contain a double quote; nothing in the tree needs one, and the alternative is
escaping rules inside prose.

## Scope

`src/` and `e2e/`, because that is where the drift has cost work. `scripts/`,
because the checks in it argue from ADR-0008 as much as any module does, and a
rule's enforcement drifting from the rule is the worst of these shapes.

And `docs/adr/` itself, which #96 left as a call rather than a technical
question. ADRs quote each other — 0014, 0018, 0028, 0033, 0037 and 0045 each
quote another one — and a decision restating another's words is exactly the
claim that goes false when the other is amended, which happens here: ADR-0003
carries an `## Amended by #120`, and ADR-0002 and ADR-0019 both grew sections
after #117. Since the marker is opt-in, including them costs nothing today and
catches that tomorrow. Markdown has no comment syntax, so an ADR is read whole;
everywhere else only comments are read, because `"https://..."` is not a
citation and a string literal is UI copy.

`docs/agents/` and the rest of `docs/` are out: they address an agent rather
than argue a decision.

## Consequences

**Coverage starts at three and grows only where somebody opts in.** Nothing in
the tree is migrated by this change; existing citations adopt the marker as
they are touched. A check that covers three citations on the day it ships is
worth less than one that covers five hundred — and it is worth more than one
that was deleted in its first week for crying wolf, which is the only other
outcome available here.

**A marked quote makes the ADR load-bearing.** Amending an ADR now breaks a
test somewhere, which is the point, but it means an amendment costs a sweep of
its citations. That is the tax, and it is charged in exactly the place where
the alternative was finding out months later in a code review.

The comment reader in `scripts/adr-citations.ts` does not model regular-
expression literals, because telling one from division needs a parser. A regex
holding `//` would be read as opening a comment — harmless unless that text
also carries the marker, which no regex in this repo does.
