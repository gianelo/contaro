# A Category's plan lives under the row that measures it

The Budget screen grew three groups. FIJOS is the Fixed items, EL PLAN DEL MES was the Variable items, and VARIABLES is one line per Category measured against what really got spent. With Supermercado and Ocio planned, a person read "Supermercado" and "Ocio" twice, forty pixels apart, with different figures against each.

Neither list was redundant. They answer different questions and the code was right about that: the items are what somebody wrote down and can correct, the comparison is how the month is going, and ADR-0019 and ADR-0021 are why the second cannot simply be the first. `design/Presupuesto.dc.html` has never drawn three groups — it draws FIJOS and VARIABLES, and no per-item Variable list at all.

So the decision is not which list to keep. It is: **how does one screen say "here is what you planned" and "here is how it is going" without the two reading as the same list twice?**

## The decision

The comparison absorbs the items. There is no EL PLAN DEL MES. Every row of VARIABLES opens, and what is under it is the plan that row is a measurement of, headed "El plan de esta categoría".

The two questions stop being two lists side by side and become one question inside the other, which is what they always were: a Category's figure *is* its items added up, and the tray is that sentence drawn. A person who wants to know how Comida is going reads the row; a person who wants to know what Comida is made of, or to correct one of the four weeks, opens it. Nobody has to work out why the same word appears twice on one screen, because it no longer does.

The alternatives were on the table and all four were written down in the ticket. The items keeping their own list under a heading that named the *question* rather than the thing was the cheapest, and it does not survive the first Space with a dozen Categories: two lists of the same names stay two lists however carefully they are titled. Taking the items off this screen entirely and reaching a correction only through the meter is this decision minus the tray — the same navigation with the plan hidden behind a tap that says nothing about what is behind it.

## Everything on the Category, both kinds

The tray is every Budget item filed on that Category, Fixed ones included.

This is forced by the figure it hangs under. `expectedByCategory` sums *every* item on the Category, and ADR-0023 says why in as many words: what a Category is measured against is the whole of what the month planned for it, Fixed items included, because the Movement a Fixed item creates is spending in its Category like any other. Only `measured` — has this Category a Variable item — decides which Categories get a row at all.

So a tray that listed only the Variable items would not add up to the number printed above it, and it would not say so. A list of amounts under a total it does not reach is a list that quietly lies, and the reader who notices has no way to find the missing part.

The price is that a Fixed item on a measured Category is drawn twice on this screen: once in FIJOS, once in its Category's tray. That is deliberate, and it is not the thing this ADR exists to remove. The two appearances answer two questions a person actually asks separately — *have I paid the rent* and *what is this total made of* — and they look nothing alike: the FIJOS row carries a due day and a Pagado/Pendiente badge, the tray row carries a name and an amount under a meter. What #63 was about was two lists of the same **Category names** with a figure on the right, where a person could not tell which question either was answering. One item under two questions is not that.

A Category planned with Fixed items alone still has no comparison row at all (ADR-0023), so its items appear once, in FIJOS, and nowhere else.

## The tray is an exact match, and the meter above it is not

The rows of a tray are the items whose `categoryId` **is** that Category's. The ADR-0021 rollup is not applied here, and the two halves of one row are deliberately measured by different rules.

That reads like an inconsistency and is not. The rollup is a statement about *spending*: nobody shops under a heading, so a plan on Comida has to count what went out under Comida · Súper or it reads zero all month. It is not a statement about which items somebody wrote down. An item planned on Comida · Súper was written on Comida · Súper, and putting it in Comida's tray as well would show one item in two places as though it had been planned twice — while its amount really is counted once, in the child's expectation and not the heading's.

So a Space that plans both a heading and a child still gets two rows (ADR-0021), each opening the items actually written on it, and the heading's meter still measures the shops filed underneath. Each row's tray adds up to that row's own expected figure, which is the property the previous section is about.

## A disclosure the platform already has

`<details>` and `<summary>`, not React state.

It opens before any JavaScript has loaded, which is the reason `ButtonLink` is a link and not a button. A keyboard reaches it and a screen reader announces it as a disclosure and says whether it is open, none of which is written here — a `div` with an `onClick` and an `aria-expanded` is that behaviour reimplemented, and reimplemented is where it goes wrong. `Variables` stays a server component.

Every Category starts closed. The screen's resting state is the comparison — how the month is going is what somebody opens Presupuesto to see — and a plan of a dozen Categories opened by default is the three-group screen again with more scrolling.

## Consequences

`ReadableBudget` no longer carries `items`. The items reach the screen inside the comparison they belong to, which is the one place that can say which Category they add up to, and a second flat list of the same items beside it would be the two-lists problem moved into the read model.

The whole-plan empty state moves onto the screen. It used to live inside EL PLAN DEL MES, which was the only list that rendered on an unplanned month; FIJOS and VARIABLES both draw nothing at all when empty. `fixed.length === 0 && variables.length === 0` is exactly "no item of either kind", and it is exact rather than approximate: every Variable item's Category is measured (ADR-0023), so an empty `variables` means there is no Variable item anywhere in the month.

ADR-0019's "the rows stay several so all of them can still be corrected" still holds, and this is where they stay several. Four weekly items of sixty thousand are four rows in Comida · Súper's tray, each opening its own correction screen at the same `/presupuesto/<itemId>` both lists already used — one URL that works for either kind, because the correction screen branches on `kind` itself (#48).

The way into the plan was still two buttons at the foot of the screen, and this ADR did not move them. #80 and #81 are what that is, and #81 was already written against the two-group screen this produces. #80 has since landed: there is one button now, and the day question on the form behind it is what makes an item Fixed (ADR-0044).
