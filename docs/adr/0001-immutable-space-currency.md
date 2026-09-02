# A Space's currency can never be changed

A Space is denominated in one currency, chosen when it is created. We considered letting that currency be changed later, either freely with a one-off conversion of the whole history or only while the Space is still empty.

We decided it can never change. Converting an existing history requires picking a rate, and no rate is correct: valuing a January expense at September's rate produces a number that was never true, which defeats the point of keeping the history at all. Because the currency is picked at creation, a wrong choice surfaces within minutes rather than months, and the remedy is to create another Space.

## Consequences

A Space cannot hold Movements in more than one currency. Someone who genuinely lives across two currencies keeps two Spaces and gives up a single combined view. Lifting this restriction is a project of its own, not a setting to add.
