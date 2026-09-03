# Migrations run in CI, and never destroy

contaro deploys to Vercel on every push to `main`, and its schema lives in Neon. Something has to apply the migrations, and we considered three candidates: the Vercel build command, a hand-run `pnpm db:migrate` before merging, and a step in CI.

Not the build command. Vercel runs builds for the same project concurrently by default — its own documentation says builds "will never queue" — so two deployments can apply the same migration at the same moment, and nothing in the build is holding a lock. Worse, a build that fails *after* migrating leaves the schema ahead of the code with no way back: Vercel's instant rollback reverts the code and does not touch the database. Not by hand either. It works until the evening you forget, and the deploy you forget is the one that answers 500.

We decided a **GitHub Action applies migrations**: on a push to `main` against the production branch, and on a push to `dev` against the preview branch (ADR-0009). It runs against Neon's direct endpoint, never the pooled one, because Neon says a pooled connection string for migrations "can lead to errors".

Vercel keeps its own git integration, so the Action and the deploy run **in parallel** rather than in order. Taking the deploy over — turning off auto-deploy and calling `vercel deploy --prod` from CI — would buy real ordering at the price of owning the whole pipeline: previews per branch, rollbacks, PR deployments, all of it hand-wired. For two people that is a bad trade, and it stays available later without undoing anything decided here.

The price of running in parallel is a window in which one side is ahead of the other, and **expand/contract** is what makes that window harmless:

- A new column is nullable or carries a `DEFAULT`. Making it `NOT NULL` is a third deploy, after a second one has filled it.
- Nothing is ever renamed. Add the new column, write both, move the reads, drop the old one.
- A column is dropped only a deploy after nothing reads it — otherwise a rollback to the previous code lands on a schema that no longer has what it asks for.
- Changing a column's type is a rename wearing a hat, and follows the same three steps.

That rule is **enforced by a check in CI, not written down and trusted**, for the reason ADR-0005 gives about the domain boundary: it "does not survive on good intentions". `drizzle-kit generate` compares the schema against its snapshot and emits `DROP COLUMN` without asking, so the generated SQL is a draft and not a verdict. The check fails a migration containing `DROP COLUMN`, `DROP TABLE`, or an `ADD COLUMN ... NOT NULL` with no default, and a deliberate destructive migration passes by saying so in the file.

## Consequences

Making a column required costs three deploys instead of one, and a column you regret costs two. That is the tax expand/contract charges, and it is charged on every schema change forever, including the ones where nothing would have gone wrong. It buys a deploy that can be rolled back at any moment without the database disagreeing.

Because the Action and the deploy are not ordered, CI cannot gate the deploy — only the merge. `main` is therefore protected: nothing reaches it without a green `verify:all`. Blocking the migration while the deploy proceeds would be worse than blocking neither, because expand/contract protects old code meeting a new schema and offers nothing in the opposite direction.
