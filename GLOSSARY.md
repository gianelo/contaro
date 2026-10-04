# contaro

A personal finance tool for tracking expenses and budgets, used by one person alone or by a couple pooling their money.

## Language

**Space**:
A container holding members, a single currency, its movements and its budgets. A personal Space has one member; a couple's Space has two, and two is the most it can ever hold. The second member arrives by Invitation and no other way. It is identified by its **name**, which somebody chose, and described by **who is in it** — two jobs and not one. Both are said on the list a person chooses from: the name is the heading, and under it the Space says who it is shared with, by name — "Compartido con Ana" — rather than counting its Members, since two is the most it can hold and a count could only ever have said one thing. The one named is always the *other* one, never whoever is reading, because that is the only half they do not already know. A Space whose free seat is held by a pending Invitation still reads "Solo vos": the seat is held and not filled. Inside a Space the description falls away and only the name is written, on the head's quiet line and wherever an act confirms which Space money is landing in — whoever reads those has already chosen, and choosing is the only question a description answers (ADR-0056). Nothing makes a name unique, so two Spaces may carry the same one; what tells them apart is the pair, which is why neither line can be spent on arithmetic.
_Avoid_: Wallet, Group, Account, Cartera, Grupo, Cuenta

**Member**:
A person with access to a Space. Members are added by Invitation, addressed to an email address and never mailed to it (ADR-0017).
_Avoid_: User, Partner, Participant

**Creator**:
The Member who made a Space, remembered by it and never changed afterwards. The one asymmetry between a Space's two Members, and it covers exactly two acts: the Monthly close, and approving the Carry-over. Everything else stays symmetric — renaming the Space, recording Movements, editing the plan, inviting, and the colours each Member wears are all as much the invited Member's as the Creator's (ADR-0020, ADR-0051). It is a tie-break on two irreversible acts and never a rank: the Space says who made it, not who outranks whom. On the Spaces that predate the column it is recovered from the earliest membership row rather than invented.
_Avoid_: Owner, Admin, Role, Host, Head

**Reader**:
The Member a screen is being shown to, considered as the person reading it. The separators a figure is written with are theirs, taken from what their browser says they read; the currency never is, and is always the Space's (ADR-0014). The day they are standing in is theirs too: "today" on any screen is their day, never the server's (ADR-0018). The two together decide how wide a figure is, and a screen never assumes it is narrow: an amount is written in full or the line it sits on gives way, and it is never cut, shrunk, or overprinted to fit (ADR-0036). Both halves are the type `Reader` in `src/app/reader.ts`, built from a request by `readerOf` — so the word here and the code say the same thing, and whatever turns out to be theirs next has one place to go. What is theirs and *not* a Reader's is the theme: it is chosen on a device rather than read off a request, it never reaches the server, and putting it here would mean sending a preference up on every request that has no use for it (ADR-0030).
_Avoid_: Viewer, User, Audience

**Invitation**:
The offer of a Space's one free seat, addressed to an email address rather than to a Member, because the person invited may never have used contaro. While it waits it holds the seat, so a Space with one Member and one Invitation outstanding cannot invite anybody else; the person it names is the only one who can take it, and it is taken rather than given (ADR-0017). It is pending until it is answered, and then it is accepted, declined by the person invited, or revoked by the Space.
_Avoid_: Request, Share, Join link, Invite code

**Movement**:
A single entry of money leaving or entering a Space. An expense and an income are the two kinds of Movement, and which one it is is its Direction.
_Avoid_: Transaction, Entry, Record

**Direction**:
Which way the money went: an expense or an income. It is what kind of Movement one is and never the sign of its amount, it is fixed when the Movement is recorded and can never be corrected afterwards, and it decides what the Movement carries — an expense is filed under a Category and an income is filed nowhere (ADR-0016).
_Avoid_: Kind, Type, Sign, Flow

**Movement name**:
What a Movement was: "Éxito", "Uber", "la farmacia". It is what a row on the month's list is read by, with the Category as the quieter line beneath it. It is offered and never demanded — nobody is asked to name a Movement on the way in, and one that carries no name is read by its Category, the way every row was read before names existed (ADR-0048). This is the opposite of a Budget item, which must be called something, and the difference is the screen each is entered on rather than an inconsistency.
_Avoid_: Description, Merchant, Payee, Concept, Note, Memo, Title

**Recorded by**:
The Member who created a Movement. Set automatically from the signed-in Member and never changed afterwards; it exists to answer "who typed this in".
_Avoid_: Author, Creator, Owner

**Attributed to**:
The Member whose money a Movement actually is, defaulting to the one recording it and changeable at entry time. It is what reports read to break down who spent and who earned, and it is empty on a Carry-over and nowhere else — nobody earned that money, so no row on a screen names one and no report counts it against either Member (ADR-0003). It and **Origin** are one fact between them: a Movement came from a Member or it came from the Carry-over of a month, never from both and never from neither.
_Avoid_: Owner, Belongs to, Payer

**Struck out**:
A Movement a Member has removed from the ledger. It stops counting towards every figure and can no longer be read, and the entry keeps who struck it out and when (ADR-0015). Striking out the Movement that paid a Fixed item puts that item back to pending (ADR-0031).
_Avoid_: Deleted, Removed, Voided, Cancelled

**Origin**:
Where a Movement came from: a Member, or the Carry-over of a named month. A report about Members reads only Movements whose origin is a Member. It is one nullable month and not a kind beside a payload — the month is there or it is not, and **Attributed to** is empty exactly where it is filled (ADR-0003). It is as unchangeable as **Direction**, and for the same argument: a Movement that stopped being a Carry-over would have to invent a Member, and one that became a Carry-over would have to throw its Member away.
_Avoid_: Source, Kind, Type

**Space currency**:
The single currency a Space is denominated in, chosen when the Space is created and never changed afterwards. Every Movement and every report in that Space uses it. It is written to a person as its code — "ARS" — everywhere except where a currency is being chosen, and the only moment that happens is a Space being created. A currency's name explains it to somebody who does not know it, which is what a picker owes them and what nobody needs again afterwards (ADR-0056).
_Avoid_: Base currency, Default currency

**Last opened**:
The moment a Member last went into one of their Spaces, and by it the one Space of theirs the list marks as the one being used — "Activo" on its card (ADR-0029). It belongs to a Member and a Space together and never to the Space alone: two Members of one shared Space each came back to it at their own moment. A Member who has joined a Space and never opened it has no such moment, and a Member who has opened none has no Space being used. It answers a second question without holding a second fact: the moment being *replaced* as a Space is opened says whether a month has ended since that Member last looked, which is what makes the Monthly close announce itself exactly once and needs nothing that has to be unset afterwards (ADR-0053).
_Avoid_: Active, Current, Selected, Default space

**Category**:
The bucket an *expense* is classified under, such as food, rent or leisure. Categories come from a global catalogue that every Space sees, which a Space can extend with its own; a Category may hold subcategories. Income carries none: the dimension exists to be measured against a Budget, and a Budget is a plan of expenses (ADR-0016).

**Budget**:
The plan of expenses a Space expects to make in a given month, made up of Budget items. It is those items and nothing above them: it comes into existence with the first one and nobody creates an empty one first (ADR-0019). It stays editable until its month is closed, and real spending is measured against it; it never blocks a Movement from being recorded. After the Monthly close nothing on it moves again — a line cannot be added, corrected, taken off, or marked paid — and that refusal is decided in one place for the plan and the Movements alike (ADR-0002, ADR-0052). Because it is its items of either kind, the one way into it belongs to the plan rather than to either of the sections a screen sorts them into, and it is offered above them: at the foot it would be the one control whose distance from a thumb grows with every item planned, which is the walk ADR-0027 took off the way into a Movement (ADR-0045). What a person reads there names the plan — "Agregar al plan" — and never a kind. A month with no plan is also offered the most recent plan the Space has, to be carried forward: the offer is a second row in that same card and names the month it comes from — "Copiar el plan de agosto" and never "el plan del mes pasado" — because it reaches back with no bound, and naming the month is what makes an old plan read as old before the tap rather than after (ADR-0050). What it carries is a snapshot and not a link: the two months are independent from the moment it lands, so the month it copied may still be open and may go on changing.
_Avoid_: Limit, Cap, Allowance

**Budget item**:
One expected expense inside a Budget, carrying its Category, its amount and what it is called. Every item is either fixed or variable, and both are called something of their own — "Arriendo", "Netflix", "Semana 1" — because a row is read by its name and the Category is the quieter second line (ADR-0042). What a person reads is **gasto previsto**, which is this definition put in Spanish (ADR-0040). It shares "gasto" with a Movement deliberately: *previsto* against *gastado* is the comparison a Budget exists for, and the adjective is the whole of the difference between the two. Where a kind is named as a noun it is said whole, "un gasto fijo" rather than "un fijo", so the two kinds read as two kinds of one thing. Nobody is asked to name one on the way in: there is one way into a plan, and what a person answers there is whether the item vences — the day they give is what makes it fixed (ADR-0044). The list headings **Fijos** and **Variables** are not that and stay as they are: they name a grouping on a screen rather than the thing standing in it. The warmest words Spanish offers here, *cupo*, *tope*, *límite* and *sobre*, are refused for the reason Budget refuses Limit and Cap: they promise an enforcement this product does not have, and a word saying the app will stop you, on an app that never stops you, is a lie written on a button. *Ítem*, *línea*, *renglón* and *partida* are Entry, Line, Row and line item, already refused above in English; *previsión* names the expectation with the money taken out of it.
_Avoid_: Line, Entry, Row, Ítem, Línea, Renglón, Partida, Previsión, Cupo, Tope, Límite, El sobre

**Over**:
A Category whose Movements for the month add up past what the Budget expected of it. It is a Category's state and never one item's or one Movement's: several items on one Category are a single expectation, and a Member under on every shop can still be over for the month. A plan written on a heading is over when everything filed under it adds up past it (ADR-0021). What a Category is measured against is the whole of what the month planned for it, Fixed items included, and only a Category with a Variable item is measured at all: one planned with Fixed items alone has a badge saying whether it was paid, which is its whole question (ADR-0023). Being over is said in colour, in words and in an icon at once, never in colour alone.
_Avoid_: Exceeded, Breached, Blown, Over budget

**Fixed item**:
A Budget item whose amount and due date are known, such as rent or a subscription. It falls due on a day of the month it is planned on, and that day is the whole of what makes it a kind of its own: it is called something for the reason every item is (ADR-0042). It is pending or paid, and it is paid by holding the Movement that paid it rather than by a flag beside one (ADR-0023): marking it paid is what creates that Movement, so nobody types the rent twice. It is paid only while that Movement stands, so striking the Movement out puts it back to pending and it can be paid again (ADR-0031). Because that brings money into existence in the ledger, it confirms first, naming the Space the money lands in and whose it will be. While it is paid it is neither corrected nor taken off the plan: its amount is already in the ledger, and a plan does not own a ledger entry, so the way to change or remove one is to strike its Movement out first (ADR-0034).

**Payment**:
What paid a Fixed item: the Movement that marking it paid created, together with whether that Movement is still standing. An item is paid only while its payment stands, so striking that Movement out puts the item back to pending and it can be paid again (ADR-0031). Correcting the Movement's amount does not: what the plan expected and what was spent are two facts, and their difference is the comparison a Budget is for.
_Avoid_: Receipt, Settlement, Transaction

**Variable item**:
A Budget item that sets an expected amount for its Category, such as food or leisure. Movements recorded in that Category count against it, and it is never marked paid. Several on one Category are how a month is planned in weeks: they are told apart by their names, and they behave as a single item of their combined amount rather than as several comparisons.

**Pace**:
How much of a Budget's variable items a Space would have spent by today, were spending spread evenly across the month, against what really went out. Fixed items are excluded from both halves: they fall due on their own date rather than evenly, so measuring them against the calendar compares unlike things (ADR-0024). What is measured against it is the spending on the Categories those items are on, headings included (ADR-0021), so paying a Fixed item leaves the figure where it was — except where a variable item covers the Category it was filed under, that one or the heading above it, and then the money really moved and the pace sees it (ADR-0024). It is read on the month being lived in and on no other, from the Reader's day (ADR-0018), and a month with no variable item has none at all.
_Avoid_: Rhythm, Burn rate, Expected spend

**Carry-over**:
What a month left the one after it, measured against its own Budget. It is only a figure once the month is closed, and it is **one-directional**: a surplus is a Movement and a deficit is a sentence (ADR-0003). A surplus is money that still exists, so the Space's Creator approves it and it is recorded as income in the following month, attributed to no Member — approved once, and only while the Movement it created stands, because striking that out offers the month again (ADR-0051, ADR-0031). A deficit is money already spent, almost always on a card that is paid the following month where the payment is a real expense of it; writing the deficit in as well would charge one overspend twice, so it is stated on the following month and never enters its arithmetic. It is never corrected either way: every field on one is decided by the act rather than typed, so the way to undo it is to strike it out and approve it again. Both are read on the month it lands in and never on the closed one, because a closed month keeps every link and loses every control (ADR-0054), and it is read by where it came from — "Arrastre de septiembre" — since it has no Category and nobody named it (ADR-0055). A month with no plan has none at all: a Budget is its items, so there is nothing for a leftover to be the unspent part of.
_Avoid_: Leftover, Rollover, Surplus

**Monthly close**:
The point, triggered by hand once the Space's Creator decides the month is complete, at which its Budget and Movements become permanently immutable: nothing in a closed month can be edited, and no Movement can be added to it. The Creator and not either Member, because it is irreversible and the other one has to live inside it (ADR-0002, ADR-0051). It is offered only on a month that has ended, and "ended" is the Reader's day and never the server's — at nine at night on the 30th in Bogotá the server is already in the next month and the Member is not, and this is the one act no later request can correct (ADR-0018). A month is closed if a row says so and open if none does: there is no flag, and nothing to unset, because unsetting it would be the unlock that has never existed (ADR-0052). It does not refuse a late ticket — a September receipt found in October is recorded with the date it was entered and comes off October's Budget — and it does not refuse a plan being copied out of it. What it refuses is every write aimed into the month itself. It reaches a person twice over: a sheet that opens by itself on the first opening of the Space after the month ended, and a row on the Budget screen that appears the moment the month ends and stays until it is closed. Each covers the other's failure — the sheet can be missed at no cost because the row is still there, and the row never has to interrupt because the sheet already said it once; a sheet alone would train dismissal by reflex on the one act with no undo, and a row alone would never announce that the month ended. The row is about the oldest month still open and never the month on screen — it leaves only when that month is closed, so a September left open is still what the row names after October ends — and it reaches no further back than the month the Member joined in. The invited Member gets the row stating who it is waiting on — "septiembre terminó y espera que Gian lo cierre" — and never a button they cannot press (ADR-0053). Afterwards the month is shown and not offered: every link on it survives and every control comes off — nothing greyed and nothing disabled — with one standing line at the top of each screen saying it is closed, and no way out beside it, because there is none. A Fixed item nobody paid reads "Nunca se pagó" and not "Pendiente", which means *not yet*, and the day it fell due goes unsaid. The month picker marks a closed month with a padlock and the words "Mes cerrado" so nobody arrives in one without having been told, and the one field that reaches backwards — the day a Movement is on — refuses a closed month before anything is typed rather than after it is submitted (ADR-0054).
_Avoid_: Lock, Freeze, Cutoff
