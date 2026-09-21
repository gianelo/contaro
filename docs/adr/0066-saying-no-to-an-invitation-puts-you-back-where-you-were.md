# Saying no to an Invitation puts you back where you were

Issue #152.

`declineInvitationAction` ended on `redirect("/espacios")`. That was right for the only place `Rechazar` has ever been drawn — the invitations section of the Space list — because from the list, the list costs nothing. #133 puts the same control on the bell's sheet, which opens over any of the headered screens inside a Space. There, the fixed redirect would throw somebody reading `Movimientos` in `Casa` out to the list for having turned down a seat in `Mudanza`.

## The decision

Declining returns to the screen it was answered from. Accepting still goes into the Space just joined.

The two branches were written as a pair and only one of them had a reason. Saying yes is a destination: somebody who just agreed to share money wants to see the money. Saying no is not one. It is a thing you finish, and then you carry on with what you were doing.

For the only caller that exists today this changes nothing: answered from `/espacios`, the origin *is* `/espacios`.

## How the origin travels

`AnswerInvitation` posts a hidden `from` field holding the path and query it is drawn on. The query is not decoration: the Space's own screens keep their month in `?mes=`, and somebody reading August who turns a seat down is still reading August afterwards. It is read in the client component and not passed in by the page, because the bell lives in a layout, and a server layout does not know which of its screens is open.

The action hands it to `inAppPath` (`src/app/in-app-path.ts`) before `redirect()`. A form field is whatever the request says it is, and this one decides where a person is sent, so it is never reflected raw. It is resolved against a throwaway origin rather than pattern-matched — `//host` and `/\host` both leave the site in a browser — and anything that is not a single-slash path resolving to the same origin falls back to `/espacios`.

Every answer carries the field; only a decline reads it. One component posting one shape is simpler than three shapes, and the field costs the other two actions nothing.

## Rejected

**Staying on the sheet, with the row gone.** Arguably the purer answer, since declining really is a non-event. It was rejected on cost: nothing in this repo calls `revalidatePath` or `revalidateTag`. Every mutation relies on `redirect()` to force a fresh render, and staying put would need a `router.refresh()` or a revalidation call — new machinery, introduced for one row. If that machinery arrives for another reason, this is worth revisiting.

**Leaving it.** It would ship a control that moves you out of the Space you were working in, and nothing else in this product does that as a side effect of declining something.
