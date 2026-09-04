# Today is the Reader's day and never the server's

contaro had two answers to "what day is it" and they disagreed for five hours every night.

The entry form is a client component. It reads the browser's own clock and dates a Movement with the day the person recording it is standing in. The month's list is rendered on the server, and `todayOnTheServer` is UTC, so the label `dayLabel` compares against is the server's day. From seven in the evening in Bogotá the UTC day has already turned over: the Movement is written on the 3rd and read against the 4th, and the row a person recorded a minute ago is headed "3 de septiembre" instead of "Hoy". The Members are in Colombia, so the broken window is not a traveller's edge case. It is their evening, every evening.

We decided that **the day a screen calls "today" is the Reader's**, taken from `x-vercel-ip-timezone`.

This looks like it contradicts ADR-0013, which is titled "Geolocation sorts the currency picker and never answers it", and it is worth saying exactly why it does not. That decision turned on the cost of being wrong being *asymmetric and permanent*: a Space's currency can never be changed (ADR-0001), so a guess that answers it is a guess nobody can undo. Its principle is that geolocation must not make a permanent decision, not that geolocation may never answer anything. Here a wrong guess produces a heading that reads "3 de septiembre" — which is what already happens — and the next request corrects it.

ADR-0014's own distinction points the other way for once. It preferred `Accept-Language` over the country with the sentence "the country is a guess about where a body is; the header is a statement about how a person reads". For a time zone, where the body is *is* the question. A day is a fact about the ground somebody is standing on rather than a preference they configured, so the guess is finally aimed at the thing it is a guess about.

## Considered options

**Labelling on the client**, the way the form already resolves its day through `useSyncExternalStore`, is the most accurate answer available: the browser knows its own zone and no VPN can fool it. It was rejected for what it costs to get there. `ReadableMonth` carries labels that are already written, so every day heading would have to travel as a raw date and be named in the browser, which turns each row into a client component and repaints the top of every list after hydration — "3 de septiembre" for a frame, then "Hoy".

**A cookie** written once from `Intl.DateTimeFormat().resolvedOptions().timeZone` is as accurate and does not flash, but the first request of a session is blind, and it is the only option that adds something persistent to maintain for a heading.

**Both** — the header on the server, the browser correcting it when they disagree — is the shape to reach for if a Reader behind a VPN ever complains. Building it now would be an abstraction for a report nobody has made.

## What this does not change

The bound on how late a day may be (`movement.ts`) stays on the server's day, with the twenty-four hours of slack the Kiritimati comment explains. It is a guard rail against a nonsense date, and being generous is the correct failure there: tightening it to the Reader's day would begin refusing real entries from a device whose clock is off, which is a worse outcome than admitting one dated tomorrow.

The `timeZone: "UTC"` in `day.ts`'s formatters stays. That is not a zone anybody chose — a `CalendarDate` is a day and not an instant, and formatting `2026-01-01` in any zone west of UTC prints the 31st of December. Only the day a label is *compared against* becomes the Reader's; how a date is written does not move.

## Consequences

The zone is read in `src/i18n/`, and the header is taken in `src/app/reader.ts`, the same two-part shape #23 and #24 used: the pure part takes a string and the edge takes a `Headers`, so the whole path is driven with no server and the domain never sees a request (ADR-0005). `reader.ts` was already called from the screen this fixes, so the seam did not have to be invented.

A Reader whose zone is unknown gets `America/Bogota`, and it is a last resort rather than a default: a request that says where its Reader is is never read with it. It is Colombian because that is where the Members are. UTC was rejected for the reason ADR-0014 rejected plain `es` — it looks like the neutral choice and is not one. UTC is Greenwich, and choosing it is choosing London with none of the reasons there are for choosing Bogotá.

A time zone name that `Intl` does not know is dropped rather than thrown, for the reason ADR-0014 gives about a malformed `Accept-Language`: a header is not code, and a proxy sending junk must not be a screen that will not render.

The fix reaches which month a list opens on and not only the day headings. `monthInView` fell back to the server's month, so a plain visit at nine at night on the 30th opened on the month after the one the expense had just landed in — the same skew, in a place where the failure is an empty list rather than an odd word. The redirect after recording still goes to the month the Movement itself landed in, which was written as a workaround for that skew and survives it: a Movement dated three months back should still be read where it belongs.

Nothing new is opted into per-request rendering. Every screen under `/espacios/[id]` already reads `Accept-Language` and already renders per request (ADR-0014).

The end-to-end run pins `timezoneId` and `x-vercel-ip-timezone` together in `playwright.config.ts`. Pinning only the zone would pass through the fallback and look like it worked by accident; pinning both makes the browser and the server agree on any machine and drives the path production takes. Freezing the clock instead was rejected: a test that passes because it was told the wrong time proves nothing about the route being deployed.

ADR-0013's Consequences are amended rather than left to disagree, the way ADR-0013 amended ADR-0012's.

*Reader* in `CONTEXT.md` gains the day. It already named the person an amount is written for; it now names the person a screen is dated for, which is the same person and was always going to be asked of the same term.
