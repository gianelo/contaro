# Only a destination gets a chevron in Avisos

Issue #133, design prerequisite.

The Avisos sheet is a list of things that need attention, but not every notice
is a route. It shows a pending invitation, an unclosed month, and unpaid Fixed
items. The first two are answered from the sheet; unpaid Fixed items are the
only notice that takes the member somewhere else.

## The decision

- **Invitation de Ana** keeps `Aceptar` and `Rechazar` inline and has no chevron.
- **Cerrar septiembre** keeps `Revisar y cerrar` inline and has no chevron. That
  action opens the existing close-month confirmation in place.
- **Fijos impagos** is one navigable row and has the only chevron. It takes the
  member to the Fixed items that need attention.

A chevron means “this row has a destination.” It is not a generic decoration
for a row that happens to be important. The invitation already exposes its two
answers, and the close notice already names its one in-place action. Adding a
chevron to either would promise a second, unnamed destination and make the
whole row compete with the control that actually answers the notice.

## Why the destination is different

Unpaid Fixed items are a collection, not an answer. The notice says there are
items to inspect, but the sheet does not contain those items or the controls to
resolve them. The member needs a destination where those Fixed items can be
read and paid. The chevron makes that continuation visible without inventing a
new action in the sheet.

This keeps the sheet's affordance rule structural:

| Notice | What it does here | Chevron |
| --- | --- | --- |
| Invitation | Accept or reject inline | No |
| Unclosed month | Open the existing confirmation in place | No |
| Unpaid Fixed items | Navigate to the items that need attention | Yes |

## Scope boundary

This ADR and `design/SheetAvisos.dc.html` establish the visual contract for
#133. They do not implement the bell, sheet state, invitation actions, close
flow, or Fixed-item destination. Runtime work follows in the issue after this
redraw.
