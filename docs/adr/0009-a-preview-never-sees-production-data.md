# A preview never sees production data

Vercel gives every branch its own URL, so the `dev` branch is a running copy of contaro that needs a database. We considered pointing it at the production one, standing up a single long-lived preview database, and giving each deployment a Neon branch.

We decided the preview runs against **its own permanent Neon branch, `dev`**, and that this branch is **never refreshed from production**. A preview needs the *schema*, not the data; the data is whatever the person testing invents.

Pointing a preview at production is the option that costs nothing to set up and everything once. contaro holds two people's actual money, and a preview is a branch that is by definition unfinished — the ticket being built right now, with the migration that has not been reviewed yet and the delete that has no confirmation on it. A Vercel preview URL is also public by default; we protect it (Vercel Authentication), but a protected URL is a lock on the door of a room that should not contain the money in the first place.

The trap worth writing down is in the tool: a Neon branch is created **with a copy of its parent's data**. So "give the preview its own branch" is not by itself the decision — branching from production would hand every preview a copy of the real ledger and satisfy the letter of the rule while breaking all of it. Neon's *reset from parent* is the same mistake with a different name, and is forbidden on this branch.

## Consequences

A production bug cannot be reproduced by copying the data across, which is the fastest way to reproduce one and is now unavailable. It is reproduced from the report, or from a test written to fail the way the report describes — which is the outcome we would want anyway, because a test outlives the session and a copied database does not.

The preview branch has to be migrated on its own, or it drifts out of step with the code deployed against it and the preview breaks. ADR-0008 runs the same migration Action on a push to `dev` for exactly this reason.

Both branches start empty, so the first Google sign-in on either creates the first Member there. Nothing is seeded, and a Member in the preview branch is unrelated to the Member of the same person in production.
