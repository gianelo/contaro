# The domain module

Every rule in contaro lives here: what a Movement counts against, how Pace is
computed, who may see a Space. See `CONTEXT.md` for the vocabulary.

This directory may only import from inside itself and from `node:` builtins.
No `next`, no `react`, no database client, no `@/` alias, and no relative path
that climbs out. Everything the domain needs from the outside arrives as an
argument.

A test file here may additionally import `vitest` — that is the whole point of
the seam: the rules are driven directly, in milliseconds, with no database, no
session and no browser.

That is enforced by lint (`domain/no-outside-imports` in `eslint.config.mjs`),
not by convention, because the fast test seam this project's whole testing
strategy rests on does not survive on good intentions. See
`docs/adr/0005-domain-module-imports-no-framework.md`.
