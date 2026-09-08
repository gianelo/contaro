# A Space is named, and described by who is in it

Issue #64. Every artboard called a shared Space `Compartido con Ana`; the app
called it `Casa`. Both were defensible, which is why it was a decision and not a
bug: the app was right about the model — a Space has a name somebody chose — and
the artboards were right about the question a person arrives with, which is
*whose money am I looking at*.

The answer is that these are two different jobs, and the card had room for both
all along. **A Space is identified by its name and described by who is in it.**

## The count could only ever say one thing

The line under the name already existed. It said `2 miembros · ARS`, and that
string is the whole argument.

A Space holds two Members at the most, and a Space of one is already sent to
`Solo vos`. So the counted branch had exactly one thing it could ever render, in
every Space, for every person, forever. It was not a weak answer to "who is in
this" — it was a template with one output, sitting on the only line that could
have answered the question the screen exists for.

The code that wrote it argued its own case: a count and not the names, because
the avatars beside it already carry both names for anybody not reading the
colours. That is true and it is why the avatars stay. But both names is not the
answer. The reader is one of the two, and the only thing worth saying is *which
one is the other*.

## Where you choose, and where you have already chosen

This is the rule the whole ticket collapses into, and it settles the three
screens at once plus the fourth nobody has drawn yet:

> The description belongs where you **choose**. The identity belongs where you
> have already **chosen**.

The Spaces list is the one screen in the product where a person is picking
between Spaces, and it is the only place `Compartido con Ana` earns its width.
Every screen inside a Space — the head's quiet line, the sheet that confirms
which Space money is about to land in — writes the name, because whoever is
reading got there by choosing it, and repeating the choice back at them is
furniture standing on a screen whose job is figures.

The invitation card had already decided this without anybody noticing: it puts
the Space's name in the heading and `Te invitó Ana` underneath, for a person who
is not even in it yet.

## The phrase was already ours

`Compartido con Ana` was not adopted from the canvas. It was already in the
product, on the screen a movement is recorded on — the one screen that
deliberately shows no Space name at all, because you are about to attribute an
expense to somebody and which of you it is matters more than what the Space is
called.

So the app had not rejected the artboards' idea. It had put it in the one place
identity was not the question, and never carried it back to the place it was.
Those two screens keep the phrase and gain nothing else.

## Two names can be the same, and that is not what fixed this

Nothing makes a Space's name unique. There is no constraint, nothing checks the
Spaces a Member already has, and one person may keep as many single-member
Spaces as they like. Two Spaces called `Casa` shared with the same Ana are
indistinguishable, and no answer to this ticket could have changed that.

Which is the point. Neither axis distinguishes on its own, so the pair is what
distinguishes — and that is the real reason the second line cannot be spent on
arithmetic. The rejected middle where the two are fused into one heading
(`Casa · Ana`) buys the same information and spends the heading on it, leaving a
line under it with no job.

**The known cost:** a name is typed once, in a form, when a Space is created,
and there is still no way to change it (#5). Choosing the name as the identity
makes that ticket matter more than it did this morning. It is the strongest
argument the artboards had, and it is answered by shipping #5 rather than by
identifying a Space with a person who can leave it.

## A held seat is not somebody in it

A Space with one Member and one Invitation outstanding reads `Solo vos`.

An Invitation holds the free seat rather than filling it, and this line names
who is in the Space. A third shape would also have cost a query on the one
screen every session begins at — the list is six queries whatever its size, and
that is deliberate — to say something the Space will say on its own the moment
it becomes true.

## The currency is its code, except where one is being chosen

The same question, smaller. The artboards wrote `COP`; the app wrote
`Peso argentino (ARS)`.

A currency's **name** exists to explain a currency to somebody who does not know
it, and the only moment that happens is a Space being created. After that the
choice is permanent (ADR-0001) and the code is what the money is stored in, what
every amount is printed in, and what the second Member will see. So the code
alone everywhere, and the full name in the picker — which is what the canvas
itself had already drawn on `CrearEspacio`.

It also gives a figure back the width the label was taking, which is the
cheapest possible way to serve ADR-0036.

## Consequences

**The Spaces list now needs to know who is reading it.** The name of the other
Member cannot be found without it, and a `Reader` is built from headers while
this comes from the session — so it is an argument, in the position every other
function in this area already puts it. The failure it introduces is naming the
wrong one of the two, which is why that is asserted from both sides.

**`currencyLabel` is now a picker's helper and nothing else.** Its only callers
are the currency list and the component gallery. A future screen reaching for it
to label a currency outside a choice is reaching for the wrong function.

**The canvas moved, not the app.** Nine artboards were redrawn, and
`design/contaro-app.html` — a build holding an escaped copy of every one of them
— was regenerated rather than patched. Two artboards deliberately keep
`Compartido con Ana`: both faces of the movement entry screen, where it was
right before this decision and is right after it.
