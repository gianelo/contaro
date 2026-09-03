# An invitation holds the seat, and the person invited takes it

#9 asks for "a Member invites their partner to a Space by email address… the invited person signs in with that Google account and finds the Space waiting". Two decisions hide in that sentence: **who turns an invitation into a membership**, and **what an unanswered invitation does to the Space in the meantime**.

## The invited person takes the seat; it is never given to them

The ticket's own wording points the other way — "signing in for the first time with the invited address makes that person a Member" — so the user was asked directly, and chose an explicit answer over an automatic one.

The reason is what the automatic version costs. An address is not a secret; it is written on the bottom of every email a person has ever sent. Under automatic redemption, anyone who knows yours can drop a Space full of somebody else's money into your list, and the first you hear of it is that it is already there. The Space list is the one screen in contaro that is entirely the reader's, and a thing that can appear on it without their consent is a thing somebody else controls.

There is no cost on the path the ticket actually cares about. Somebody who has never used contaro signs in with Google, lands on `/espacios`, and the Space is there with **Entrar** under it — one tap, on the first screen they see. What the explicit answer adds is that the tap exists.

It also fixes a case the automatic reading could not answer at all. "Signing in for the first time" is a moment that never comes for a partner who already uses contaro and already has a session: sessions are JSON Web Tokens (ADR-0006) and live for weeks, so they would wait for the token to expire before the Space appeared. Answering the invitation is an act available on every visit, so there is no such wait.

Two answers and never one. `declineInvitation` exists because an invitation nobody can turn down sits on that screen forever — and, worse, holds a seat the Space can never offer again.

## A pending invitation holds the seat

A Space holds two Members (`MAX_SPACE_MEMBERS`), and `inviteToSpace` counts the seated **and** the outstanding against that number. A Space of one Member with one invitation waiting is as full as a Space of two.

The alternative — count only real Members, let invitations pile up — is a race with money on the other side of it. Three invitations go out, and whichever two people happen to sign in first take the Space. Nobody chose that pair and nobody can see afterwards that it was decided by network timing.

Reserving the seat has one price, and it is paid on purpose: a mistyped address holds the seat until somebody frees it. So the Space can take an invitation back (`revokeInvitation`), any Member may do it — inside a Space the money is one pot and so is the seat, the same reasoning ADR-0015 uses for striking out any Member's Movement — and the Members screen puts **Cancelar** on the pending row. Without that, one typo makes a Space permanently unshareable.

The seat is counted three times, the way #7's rules are:

- `inviteToSpace` refuses a second offer, and `acceptInvitation` counts again over the Space as it is at the moment of acceptance rather than trusting the reserve made when the invitation was sent;
- a unique partial index, `space_invitations_one_pending_per_space`, gives a Space at most one pending row, so two requests racing on "invite Ana" and "invite Sol" cannot both win;
- a trigger on `space_members`, `space_holds_two_members_at_most`, locks the Space's own row and refuses a third Member — including one arriving from a `psql` session that never heard of any of this.

## An invitation is a row that is answered, not a row that disappears

`status` is `pending`, `accepted`, `declined` or `revoked`, with `resolved_at` set alongside it. Four words rather than a `DELETE`, because "she said no" and "he took it back" are two different things that happened, and a Space whose seat is free again should be able to say which of them freed it.

It is `text` with a check rather than a Postgres enum, for the reason `movements.direction` is (ADR-0016): the set of words belongs to the domain, and `isInvitationStatus` is the one place it is written.

Every write that answers one is conditional on it still being `pending`, so two taps leave one answer and a "no" arriving after a "yes" changes nothing. Accepting marks the row and inserts the membership in a single transaction: an invitation marked accepted whose membership never landed is a seat nobody holds and nobody can offer again.

## The address is the whole of who an invitation is for

It is stored normalised — trimmed and lowercased by `normaliseEmail` — and a database check (`space_invitations_email_is_normalised`) refuses any other shape. Google hands back whatever a person typed the day they made the account, so `Ana@Example.COM` and `ana@example.com` are one mailbox reaching us as two strings; an invitation only some of those spellings can redeem is one that silently never arrives.

Matching is done by the domain over rows fetched first (`invitationsAddressedTo`), never by a `WHERE` clause built from something a request carried — the same shape `spaceVisibleTo` has for membership. An invitation addressed to somebody else comes back as no invitation at all, so holding the identifier buys nothing, exactly as a Space someone is not in is not found rather than forbidden.

The address check itself is deliberately loose: one `@`, something either side, a dot in the domain, no spaces. Google is the real judge of whether a mailbox exists, because the address is worth nothing unless Google later hands back the same one. What the rule refuses is the answers that are certainly not addresses — a name, half of one, a sentence — because those are typos a person can still fix while looking at the field.

## Consequences

Membership stops being something only `createSpace` produces. `acceptInvitationAsMember` is now the second and last way a `space_members` row comes into existence, and both of them go through the seat count.

The attribution work #9 asks for was already done and needed nothing: `spaceMembers` has fed the "Es plata de" picker since #7, `recordMovement` already holds an attribution to the Space's Members, the correction screen already says who recorded a Movement, and the month's list already names whose money a row was **only** in a shared Space (ADR-0016). The second Member existing is the whole of what those acceptance criteria were waiting for.

The Members screen hangs off the Space's own screen rather than the tab bar. The four tabs are where a thumb goes every day; inviting somebody happens once.

`invitationsWaitingFor` is the one query in this product that shows a person a Space they are not in. What makes it theirs to see is their own verified address on the row and nothing else, which is why the address is read off the Member's record rather than taken from anything a request supplied.

What this postpones: nothing is emailed. The invitation waits on the Space list until the person signs in and looks, which is enough for a product two people share and not enough for one where they do not already know it is coming. Sending mail is its own ticket, and it changes nothing here — the row is already the invitation.
