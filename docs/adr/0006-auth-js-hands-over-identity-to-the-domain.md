# Auth.js runs the Google handshake and nothing else

Google sign-in is the only identity in this product, and ADR-0004 already chose Auth.js to obtain it. What that leaves open is who owns the person on our side. Auth.js ships a Drizzle adapter that would take the job, and with it four tables — `users`, `accounts`, `sessions`, `verificationTokens` — where `users` is the record of a person.

We chose **JSON Web Token sessions with no adapter**. Auth.js performs the OAuth handshake and signs a cookie; the person behind it is a **Member** in our own `members` table, and which Member an identity is gets decided by `resolveMember` in the domain. The token carries the Member's id, so a request costs no database round-trip to know who is asking.

`users` is a word `CONTEXT.md` tells us to avoid, and for a reason: the adapter's `users` and our `Member` would be the same person recorded twice, kept in step by hand. Worse, adopting the adapter would put the rule that matters — first sign-in creates a Member, later ones resolve to it, a changed Google profile follows, an identity we cannot place is refused — inside a library, where it is untestable without a database. Owning it costs one small pure function and buys eight tests that run in milliseconds, which is the same bargain ADR-0005 struck.

A Member is looked up by Google's `sub` claim, never by email address. The `sub` is stable for the life of the account and never reused; an email address can be changed by its owner. The address is stored for display and for the invitations in #5, and is refreshed on each sign-in. Auth.js is configured to refuse a Google account whose address it has not verified, so an unverified address can never become a Member's.

## Consequences

A JWT session cannot be revoked from the server: signing out clears the cookie, but a token already issued stays valid until it expires. Nobody can be forcibly signed out, and removing a Member does not end their session. For a product two people share this is a fair price for having no session table; if it ever stops being one, the change is a database session strategy, not a different owner for Member.

Deployed anywhere other than Vercel, Auth.js refuses to serve an untrusted host, so `AUTH_TRUST_HOST` has to be set. That is deliberate on their part and left as an explicit setting on ours.
