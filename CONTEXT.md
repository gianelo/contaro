# contaro

A personal finance tool for tracking expenses and budgets, used by one person alone or by a couple pooling their money.

## Language

**Space**:
A container holding members, a single currency, its movements and its budgets. A personal Space has one member; a couple's Space has two, and two is the most it can ever hold. The second member arrives by Invitation and no other way.
_Avoid_: Wallet, Group, Account, Cartera, Grupo, Cuenta

**Member**:
A person with access to a Space. Members are added by Invitation, addressed to an email address and never mailed to it (ADR-0017).
_Avoid_: User, Partner, Participant

**Reader**:
The Member a screen is being shown to, considered as the person reading it. The separators a figure is written with are theirs, taken from what their browser says they read; the currency never is, and is always the Space's (ADR-0014). The day they are standing in is theirs too: "today" on any screen is their day, never the server's (ADR-0018). Both halves are the type `Reader` in `src/app/reader.ts`, built from a request by `readerOf` — so the word here and the code say the same thing, and whatever turns out to be theirs next has one place to go.
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

**Recorded by**:
The Member who created a Movement. Set automatically from the signed-in Member and never changed afterwards; it exists to answer "who typed this in".
_Avoid_: Author, Creator, Owner

**Attributed to**:
The Member whose money a Movement actually is, defaulting to the one recording it and changeable at entry time. It is what reports read to break down who spent and who earned, and it is empty on a Carry-over.
_Avoid_: Owner, Belongs to, Payer

**Struck out**:
A Movement a Member has removed from the ledger. It stops counting towards every figure and can no longer be read, and the entry keeps who struck it out and when (ADR-0015).
_Avoid_: Deleted, Removed, Voided, Cancelled

**Origin**:
Where a Movement came from: a Member, or the Carry-over of a named month. A report about Members reads only Movements whose origin is a Member.
_Avoid_: Source, Kind, Type

**Space currency**:
The single currency a Space is denominated in, chosen when the Space is created and never changed afterwards. Every Movement and every report in that Space uses it.
_Avoid_: Base currency, Default currency

**Category**:
The bucket an *expense* is classified under, such as food, rent or leisure. Categories come from a global catalogue that every Space sees, which a Space can extend with its own; a Category may hold subcategories. Income carries none: the dimension exists to be measured against a Budget, and a Budget is a plan of expenses (ADR-0016).

**Budget**:
The plan of expenses a Space expects to make in a given month, made up of Budget items. It is those items and nothing above them: it comes into existence with the first one and nobody creates an empty one first (ADR-0019). It stays editable throughout its month, and real spending is measured against it; it never blocks a Movement from being recorded.
_Avoid_: Limit, Cap, Allowance

**Budget item**:
One expected expense inside a Budget, carrying its Category and amount. Every item is either fixed or variable.
_Avoid_: Line, Entry, Row

**Over**:
A Category whose Movements for the month add up past what the Budget expected of it. It is a Category's state and never one item's or one Movement's: several items on one Category are a single expectation, and a Member under on every shop can still be over for the month. A plan written on a heading is over when everything filed under it adds up past it (ADR-0021). What a Category is measured against is the whole of what the month planned for it, Fixed items included, and only a Category with a Variable item is measured at all: one planned with Fixed items alone has a badge saying whether it was paid, which is its whole question (ADR-0023). Being over is said in colour, in words and in an icon at once, never in colour alone.
_Avoid_: Exceeded, Breached, Blown, Over budget

**Fixed item**:
A Budget item whose amount and due date are known, such as rent or a subscription. It is called something of its own — "Arriendo", "Netflix" — because that is what it is read by, and it falls due on a day of the month it is planned on. It is pending or paid, and it is paid by holding the Movement that paid it rather than by a flag beside one (ADR-0023): marking it paid is what creates that Movement, so nobody types the rent twice. Because that brings money into existence in the ledger, it confirms first, naming the Space the money lands in and whose it will be.

**Variable item**:
A Budget item that sets an expected amount for its Category, such as food or leisure. Movements recorded in that Category count against it, and it is never marked paid. Several on one Category are how a month is planned in weeks, and they behave as a single item of their combined amount rather than as several comparisons.

**Pace**:
How much of a Budget's variable items a Space would have spent by today, were spending spread evenly across the month, against what really went out. Fixed items are excluded from both halves: they fall due on their own date rather than evenly, so measuring them against the calendar compares unlike things (ADR-0024). What is measured against it is the spending on the Categories those items are on, headings included (ADR-0021), so paying a Fixed item leaves the figure where it was — except where a variable item covers the Category it was filed under, that one or the heading above it, and then the money really moved and the pace sees it (ADR-0024). It is read on the month being lived in and on no other, from the Reader's day (ADR-0018), and a month with no variable item has none at all.
_Avoid_: Rhythm, Burn rate, Expected spend

**Carry-over**:
The unspent part of a month's Budget. At close the Members approve it, and it is recorded as income in the following month, attributed to no Member.
_Avoid_: Leftover, Rollover, Surplus

**Monthly close**:
The point, triggered by hand once a Member decides the month is complete, at which its Budget and Movements become permanently immutable: nothing in a closed month can be edited, and no Movement can be added to it.
_Avoid_: Lock, Freeze, Cutoff
