/**
 * The only shipped catalogue. Every string a person reads lives here, so that
 * adding a second language later is a new file rather than a search across the
 * codebase.
 */
export const es = {
  "app.name": "contaro",
  "app.description":
    "Planeá el mes y anotá lo que gastás, solo o con quien compartas la plata.",

  "nav.main": "Principal",
  "nav.budget": "Presupuesto",
  "nav.movements": "Movimientos",
  "nav.categories": "Categorías",
  "nav.spaces": "Espacios",
  "nav.settings": "Ajustes",

  "spaces.title": "Espacios",
  // The screen greets whoever landed on it instead of naming itself: a person
  // who just arrived can see which screen they are on (#38).
  "spaces.greeting": "Hola, {member}",
  "spaces.greeting.lead": "Elegí un espacio para entrar",
  "spaces.yours": "Tus espacios",
  // Who is in a Space and what money it holds, in one line under its name.
  // Two whole sentences rather than a count glued to a word, so a second
  // language can put them in whatever order it puts them in.
  "spaces.who.alone": "Solo vos · {currency}",
  "spaces.who.shared": "Compartido con {member} · {currency}",
  "spaces.active": "Activo",
  // What the month has cost, and what it was planned to (story 5 of #1).
  "spaces.card.spent": "Gastado",
  "spaces.card.expected": "Presupuesto",
  "spaces.empty.title": "Todavía no tenés espacios",
  "spaces.empty.body":
    "Un espacio guarda los movimientos y el presupuesto de una sola moneda. Creá el primero para empezar.",
  "spaces.new": "Crear espacio",

  "gallery.title": "Componentes",
  "gallery.buttons": "Botones",
  "gallery.list": "Lista agrupada",
  "gallery.fields": "Campos",
  "gallery.sheet": "Hoja inferior",
  "gallery.sheet.open": "Abrir la hoja",
  "gallery.sheet.title": "Cerrar septiembre",
  "gallery.sheet.body": "Esto no tiene vuelta atrás.",
  "gallery.item.actionable": "Fila que se puede tocar",
  "gallery.item.plain": "Fila que no se puede tocar",
  "gallery.destructive": "Cerrar septiembre",
  "gallery.plain": "Todavía no",
  "gallery.meters": "Medidores",
  "gallery.icons": "Iconos",
  "gallery.members": "Colores de miembro",

  "signin.title": "Entrar a contaro",
  "signin.body":
    "Entrás con tu cuenta de Google. No guardamos ninguna contraseña tuya.",
  "signin.action": "Entrar con Google",
  "signin.error.unverified":
    "Esa cuenta de Google todavía no tiene el correo verificado. Verificalo con Google y volvé a intentar.",
  "signin.error.other": "No pudimos entrarte. Probá de nuevo.",

  "space.new.title": "Nuevo espacio",
  "space.new.name": "Nombre",
  "space.new.name.hint": "Casa, Personal, Viaje\u2026",
  "space.new.currency": "Moneda",
  "space.new.currency.forever":
    "La moneda no se puede cambiar nunca. Si te equivocás vas a tener que crear otro espacio y empezar de cero.",
  "space.new.currency.none": "Elegí una moneda",
  "space.new.submit": "Crear el espacio",
  "space.new.working": "Creando\u2026",
  "space.new.error.name": "Ponele un nombre al espacio.",
  "space.new.error.currency": "Elegí una moneda de la lista.",
  "space.new.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  "space.new.error.failed": "No pudimos crear el espacio. Probá de nuevo.",

  // The quiet line under a screen that names itself (#40): which Space you are
  // in, and the money everything on it is written in. The Space is first
  // because it is the one a person is checking; the currency qualifies it.
  "space.beneath": "{space} \u00b7 {currency}",

  "space.month": "Este mes",
  // Two screens, two words for one figure, on purpose. The Budget tab shows
  // one number and reads "lo que va gastado"; the month's list shows two side
  // by side and reads them as a pair of nouns.
  "space.month.spent": "Gastado",
  "space.month.expenses": "Gastos",
  "space.month.income": "Ingresos",
  "space.members": "Miembros",
  "space.movements.empty": "Todavía no anotaste ningún movimiento acá.",
  // The same fact in the tense a closed month has (#119). "Todavía no" is a
  // *not yet*, and a month that can never change again has no yet left -- the
  // same reason "Pendiente" gives way to "Nunca se pagó" one tab across.
  "space.movements.empty.closed": "No quedó ningún movimiento anotado acá.",
  "space.month.choose": "Elegir el mes",
  // The pill at the top of the plan and of the month's list (#40, #61). The
  // month first, because the accessible name has to start with the word a
  // person can see on it. "Mes anterior" and "Mes siguiente" left with the
  // walker they named: there is one way to change the month, and it is this.
  "space.month.pill": "{month}, elegir el mes",
  "space.month.inView": "Mes que est\u00e1s viendo",
  // The second state a row of that list has ever carried (#119). Words and a
  // padlock, never a colour on its own, for the reason the badge at the end of
  // a Fixed row gives -- and said here rather than only on arrival, because a
  // closed month is a screen that behaves differently and finding that out by
  // reaching for a control that is gone is finding it out too late.
  "space.month.closed": "Mes cerrado",

  // What the month was planned to cost, beside what it really cost (#40). A
  // pair of nouns on one card, the way the month's list writes "Ingresos" and
  // "Gastos": each one is only readable against the other. It replaced
  // "Planeado", which was a participle because it was the last row of a list
  // of things somebody had planned rather than half of a comparison.
  "budget.budgeted": "Presupuestado",
  // The comparison, one line per Category (#11). Named for the kind of item
  // it is about rather than for the grouping, which is what makes room for
  // the Fijos beside it (#13), and it is what the canvas titles it.
  // `GroupedList` puts it in capitals.
  "budget.variables": "Variables",
  // The heading over what opens under one of those rows (#63): the items the
  // figure on the row is made of.
  //
  // "de esta categoría" is the whole of it. The screen used to head these same
  // items "El plan del mes", in a list of their own beside the Categories --
  // so a month with four weeks of groceries on it drew "Comida · Súper" twice,
  // under two headings, and neither one said what the other was for. This
  // names what it is: not the month's plan, one Category's share of it, hung
  // under the figure it adds up to.
  //
  // "El plan" and not "Los gastos previstos", which is what a Budget item is
  // called everywhere a person is asked for one (#82, ADR-0040): those rows
  // are the items, and this line is the thing they make together.
  "budget.variables.plan": "El plan de esta categor\u00eda",
  // The amount is written out and not only shown in red, so a person who
  // cannot see the colour is still told (#11).
  "budget.over": "Te pasaste {amount}",
  // The pace of the month (#14), one line and not a second meter: a person
  // reading two meters does not need a third figure to compare them against,
  // they need telling in words whether they are early or late. Two halves
  // because the canvas writes the second in heavier ink, split at a clause
  // boundary so neither carries a space it could lose.
  //
  // The line names its own scope -- "en gastos variables" -- so nobody has to
  // know why the rent is not in it.
  "budget.pace.lead": "D\u00eda {day} de {days} \u00b7 en gastos variables vas",
  "budget.pace.ahead": "{amount} arriba del ritmo",
  "budget.pace.behind": "{amount} abajo del ritmo",
  // Neither ahead nor behind by nothing: "vas $0 arriba del ritmo" is a figure
  // written where there is no news.
  "budget.pace.onPace": "justo en el ritmo",
  // The empty state says what to do, not that there is nothing: a month
  // nobody has planned yet is the ordinary state of every first of the month.
  "budget.empty": "Todav\u00eda no planeaste este mes.",
  // The one line a closed month adds to the top of the plan (#119). It is not
  // an error and nothing just happened: it is why every control below it is
  // missing, which is the exact job `Notice` exists for.
  //
  // The month is named rather than called "este mes", because somebody can
  // arrive here from a link or from the picker and the sentence has to be true
  // read on its own. In the past tense throughout: "no se puede cambiar" is
  // what the close bought, and there is no unlock to hint at (ADR-0002).
  "budget.closed":
    "{month} está cerrado. Nada de lo que quedó acá se puede cambiar.",
  // The same line at the top of the month's list. Its own key and not the
  // plan's, because the two screens lose different things to the close and a
  // shared string is a string that stops fitting one of them.
  "movements.closed":
    "{month} está cerrado. Nada de lo que quedó acá se puede cambiar.",
  // What the Movement's own screen says where its form and its "Anular" used
  // to be. The Category and the day under what it is called, the way the row
  // on the list writes its second line.
  "movements.closed.beneath": "{category} · {day}",
  "movements.closed.title": "Este mes está cerrado",
  "movements.closed.body":
    "Lo que quedó anotado en un mes cerrado no se puede corregir ni anular. Nunca.",
  // The other reason a Movement's screen has no form (#120). A carry-over is
  // not typed, so there is nothing on it to correct -- but unlike the close,
  // this refusal has a way out, and it is the "Anular" left standing under the
  // card rather than a link inside it (ADR-0031, ADR-0034).
  "movements.carriedOver.title": "Esto es un arrastre",
  "movements.carriedOver.body":
    "El monto es lo que sobró del mes que se cerró, así que no se corrige. Si te equivocaste, anulalo y aprobalo de nuevo.",
  // The words on the row that opens the plan, above both of its sections
  // (#81, ADR-0045). They name the destination and not the kind, which is what
  // #80 made sayable: there is one way in for both kinds now, so the row can
  // be about the plan a person is adding to rather than about the thing they
  // are adding. "Agregar un gasto previsto" said the noun on a row that
  // belongs to neither Fijos nor Variables, and a row naming one kind of item
  // above two lists is the ambiguity #63 exists to remove.
  //
  // The noun itself is untouched (ADR-0040): "gasto previsto" is still what an
  // item is called wherever a person reads one, and the screen this row opens
  // is still titled with it.
  "budget.plan.new": "Agregar al plan",
  // The offer to carry last month's plan forward (#121), on a row above
  // "Agregar al plan" in the same card. Two answers to one sentence, in the
  // order the artboard draws them: the plan a person almost certainly wants is
  // first, and writing one from nothing stays where it always was.
  //
  // The month is named and never called "el mes pasado", which is decision 22
  // of #109 and the thing that makes an unbounded lookback safe: the last plan
  // there is can be from March, and "el plan del mes pasado" said about March
  // in October is an offer accepted for a month nobody meant. Lower case,
  // because a month inside a sentence is written that way in Spanish
  // (`monthName`).
  "budget.plan.copy": "Copiar el plan de {month}",
  // The sheet the row opens, which is the shape "Marcar pagado" already uses:
  // a row opens a sheet, the sheet says what is about to happen, the person
  // confirms. The title names the month being copied *from*, because that is
  // the fact a person is checking before they say yes; the button names the
  // month it lands on, because that is what tapping it does.
  "budget.plan.copy.title": "\u00bfCopiar el plan de {month}?",
  // What the copy does, said before it happens rather than discovered after.
  // The two facts a person cannot see from the row: the amounts come with it,
  // and a Fijo arrives pending on a day in this month -- it does not arrive
  // paid because somebody paid it last month (decision 9 of #109).
  "budget.plan.copy.body":
    "Se copian los gastos previstos con sus montos. Los gastos fijos vuelven a quedar pendientes y sus fechas se corren a {month}.",
  // "4 gastos previstos \u00b7 $2.053.900". The noun in full and never
  // "renglones", which `CONTEXT.md` refuses under Line and Row -- the artboard
  // wrote it as working material and the vocabulary is decided here (ADR-0040).
  "budget.plan.copy.tally": "{count} gastos previstos \u00b7 {total}",
  "budget.plan.copy.tally.one": "1 gasto previsto \u00b7 {total}",
  // The reassurance under the recap. It is the answer to the only real fear a
  // person has about accepting a whole plan at once: that they are agreeing to
  // it rather than starting from it.
  "budget.plan.copy.reassurance": "Vas a poder editarlo todo el mes.",
  "budget.plan.copy.confirm": "Copiar a {month}",
  "budget.plan.copy.working": "Copiando\u2026",
  // The way out, and it is not "Cancelar". Cancelling closes a sheet and
  // leaves a person where they were; this names the other thing they can do,
  // which is the plan they came to write. The row underneath does it, so this
  // only has to close.
  "budget.plan.copy.scratch": "Empezar de cero",
  // What a Budget item is called where a person reads it (#82, ADR-0040).
  // "Ítem" was never chosen for it: it is the container word `CONTEXT.md`'s
  // own avoid list already refuses under Line, Entry and Row, and it names
  // where the thing is drawn rather than what it is. "Gasto previsto" is that
  // definition put in Spanish, and it shares "gasto" with a Movement on
  // purpose -- previsto against gastado is the comparison a Budget exists
  // for, and the adjective is the whole of the difference. Cupo, tope and
  // límite read warmer and were refused for promising the enforcement a
  // Budget deliberately does not have.
  "budget.item.new.title": "Nuevo gasto previsto",
  "budget.item.edit.title": "Corregir el gasto previsto",
  // Asked of both kinds, and one key because it is one question (#79). A gasto
  // previsto of either kind is read by what it is called rather than by what
  // it is filed under: four weeks of groceries on one Category are four rows a
  // person has to tell apart, and the Category is what they have in common
  // rather than what separates them. It was "budget.fixed.name" while only the
  // Fixed form asked it, which said the difference was the kind -- and it
  // never was.
  "budget.item.name": "C\u00f3mo se llama",
  "budget.item.category": "Categor\u00eda",
  // "Supermercado · Comida": the Category and the heading it sits under, on
  // the quiet line under the name, exactly where "budget.fixed.beneath" writes
  // the Category and the day. The separator is copy and not markup, so this
  // line is punctuated in the file the rest of its words live in. That is not
  // yet true of both lines: `fixed.tsx` still writes a middot into JSX to hang
  // the due notice off the end of its own, and until it stops, the two can
  // come to be punctuated differently. A wart, and not the rule. Category
  // first: it is the
  // more precise of the two, and it is what the row was called until #79.
  "budget.item.beneath": "{category} \u00b7 {heading}",
  "budget.item.amount": "Cu\u00e1nto esper\u00e1s gastar",
  "budget.item.save": "Guardar",
  "budget.item.save.working": "Guardando\u2026",
  "budget.item.remove": "Sacar del plan",
  "budget.item.remove.working": "Sacando\u2026",
  // The one question a person is asked about the kind, and it never says the
  // word (#80). "Vence" is what the two kinds actually differ by, and it is a
  // word somebody already owns -- unlike "fijo", which the screen used to ask
  // them to have learnt before they were allowed to write down a number.
  //
  // A question and not a label, because the picker under it answers yes and no
  // both: a day, or "No vence". The month is the one being planned, so "del
  // mes" is not vague -- the day cannot belong to another one.
  "budget.item.due": "\u00bfVence un d\u00eda del mes?",
  // First in the list and where the picker starts, because it is the absence
  // of a day rather than a claim about one, and it is what almost every item
  // is. A real answer and not a prompt, which is why the picker asking this
  // question is never `required`: every state of it is something somebody can
  // have meant.
  "budget.item.due.never": "No vence",

  "budget.fixed.edit.title": "Corregir el gasto fijo",
  // Why the four questions are not on the screen, and what to do about it. The
  // way out is named as a place to go and not only as an instruction: a
  // sentence telling somebody to undo something they cannot reach from here is
  // a dead end with good manners.
  "budget.fixed.paid.title": "Este gasto fijo ya est\u00e1 pagado",
  "budget.fixed.paid.body":
    "Para corregirlo o sacarlo del plan, primero anul\u00e1 el movimiento que lo pag\u00f3.",
  "budget.fixed.paid.movement": "Ver el movimiento",

  // The same card, for the refusal that has no way out (#119). A closed month
  // takes the correction and the removal off both kinds at once, so it is one
  // pair of strings and not one per kind.
  //
  // No "Ver el movimiento" beside it and no third line offering anything,
  // which is the whole difference from the pair above: that refusal is undone
  // by striking a Movement, and this one is the single act in contaro with no
  // undo at all (ADR-0002). A sentence pointing somewhere would be pointing at
  // a screen that refuses the same thing.
  "budget.item.closed.title": "Este mes está cerrado",
  "budget.item.closed.body":
    "Lo que quedó anotado en un mes cerrado no se puede corregir ni sacar del plan. Nunca.",

  // The other half of a Budget (#13): the amounts whose day and figure are
  // known in advance. Above the Variables, the way the canvas draws them, and
  // named for the kind of item rather than for the grouping. `GroupedList`
  // puts it in capitals.
  "budget.fixed": "Fijos",
  // There is no "Agregar un gasto fijo" any more, and no screen titled "Nuevo
  // gasto fijo". One way into the plan since #80: the words a person reads on
  // the way in are "Agregar al plan", which name the plan rather than either
  // kind, and the kind is decided by "budget.item.due" rather than by which
  // button was pressed.
  //
  // Shortened from "Qu\u00e9 d\u00eda del mes vence" (#105, Option C+): the correction
  // screen sits this label beside the name field rather than above it on a
  // row of its own, and the long form does not fit a column narrow enough to
  // leave the name room to grow. Used nowhere else, so the value changes
  // rather than a second key standing beside it for the same question.
  "budget.fixed.dueDay": "Vence el d\u00eda",
  "budget.fixed.amount": "Cu\u00e1nto es",
  // The badge at the end of a row. Two words, and never a colour on its own:
  // the state has to survive somebody who cannot tell the two grounds apart.
  "budget.fixed.paid": "Pagado",
  "budget.fixed.pending": "Pendiente",
  // The third thing that badge can say, and it exists because the second one
  // stopped being true (#119). "Pendiente" means *not yet*; after the close
  // there is no yet, and an item that was never paid in a month that can never
  // change again is owed the past tense.
  "budget.fixed.never": "Nunca se pagó",
  // "Vivienda · 1 sep" — the Category and the day, under the name.
  "budget.fixed.beneath": "{category} \u00b7 {day}",
  // What an item close to its day says, in words and not only in the amber
  // (#13). It says the day is near and promises nothing more: the advance
  // warning before a subscription renews is phase two in #1, and a line
  // saying "avisa 3 días antes" would be signing for an email nobody sends.
  "budget.fixed.due.soon": "vence en {days} d\u00edas",
  "budget.fixed.due.tomorrow": "vence ma\u00f1ana",
  "budget.fixed.due.today": "vence hoy",
  // Louder rather than quieter once the day has passed: an unpaid item behind
  // its date is the one a Member most needs telling about.
  "budget.fixed.due.overdue": "vencido",
  // Marking one paid, which is what creates its Movement. It confirms first,
  // because that brings money into existence in the ledger — and the recap is
  // the point of the confirmation: it says which Space the money lands in and
  // whose it will be, the two things a stray tap would get wrong.
  "budget.fixed.pay": "Marcar pagado",
  "budget.fixed.pay.title": "\u00bfMarcar {name} como pagado?",
  // Two halves, because the amount between them is written in the ordinary ink
  // while the rest is grey: it is the one figure a person is confirming, and a
  // single interpolated string would render it in the same grey as the words
  // around it. Split at a clause boundary, so neither half carries a space it
  // could lose.
  "budget.fixed.pay.body.lead": "Se va a crear un gasto de",
  "budget.fixed.pay.body.rest":
    "con fecha de hoy, en la categor\u00eda {category}.",
  "budget.fixed.pay.space": "Espacio",
  "budget.fixed.pay.recordedBy": "Registrado por",
  "budget.fixed.pay.attributedTo": "Atribuido a",
  "budget.fixed.pay.working": "Marcando\u2026",
  "budget.fixed.pay.row": "Marcar {name} como pagado",

  "budget.error.amount": "Pon\u00e9 un monto mayor que cero.",
  "budget.error.category": "Eleg\u00ed una categor\u00eda de este espacio.",
  "budget.error.month": "No pudimos ver de qu\u00e9 mes se trata.",
  "budget.error.space": "No pudimos ver de qu\u00e9 espacio se trata.",
  // The ceiling comes from `MAX_BUDGET_ITEM_NAME_LENGTH` rather than being
  // written out here: a number in the copy and a number in the domain are two
  // places for one rule, and only one of them refuses anything.
  "budget.error.name": "Pon\u00e9le un nombre de hasta {max} caracteres.",
  "budget.error.dueDay": "Eleg\u00ed un d\u00eda que ese mes tenga.",
  // The noun is said whole here rather than as a bare "gasto" plus a clause:
  // now that "gasto" also names a Movement, a person told a gasto is gone has
  // two places it could have gone from. Saying "gasto previsto" answers that
  // and keeps the shape its two siblings have -- "Ese movimiento ya no está",
  // "Esa invitación ya no está" (#82).
  "budget.error.gone": "Ese gasto previsto ya no est\u00e1.",
  "budget.error.alreadyPaid": "Ese gasto fijo ya estaba pagado.",
  // The month a copy was carrying emptied in between. Named as the month
  // rather than as "el plan", because what is gone is every item on it and a
  // person is about to look for it.
  "budget.error.nothingToCopy": "Ese mes ya no tiene un plan para copiar.",
  // The other thumb won. Not an apology and not "prob\u00e1 de nuevo": trying
  // again is exactly the wrong move, because the plan they wanted is already
  // there and a second copy would double it.
  "budget.error.alreadyPlanned":
    "Este mes ya tiene un plan. Volv\u00e9 a cargar la pantalla para verlo.",
  // The month is closed, and there is no way back into it (ADR-0002). Said as
  // a fact and never as an apology, and with no "probá de nuevo": trying again
  // is the one thing that will never work, and the person did nothing wrong.
  // It says what to do instead, because there is something -- the money still
  // goes somewhere, and it goes on this month.
  "budget.error.monthClosed":
    "Ese mes está cerrado y no se puede cambiar. Anotalo en el mes en curso.",
  "budget.error.signedOut": "Se cerr\u00f3 tu sesi\u00f3n. Entr\u00e1 de nuevo.",
  "budget.error.failed": "No pudimos guardar el gasto previsto. Prob\u00e1 de nuevo.",

  // The monthly close (#117). The act itself, and every way it can be refused.
  //
  // ADR-0002 is the whole voice of this section: the close has no undo, so
  // nothing here softens it or hedges it, and nothing invites a person to try
  // again at something that already happened. The last one does invite a
  // retry, and that is the difference it turns on: a dropped connection is the
  // one refusal here where nothing was closed and trying again is the fix.
  "close.error.notTheCreator":
    "Solo quien creó el espacio puede cerrar un mes.",
  // The month is still running for the person tapping, whatever the server
  // thinks (ADR-0018). It says when they can come back rather than only that
  // they cannot yet, because the answer is a day away and nothing they do
  // brings it closer.
  "close.error.notOverYet":
    "Todavía no terminó el mes. Vas a poder cerrarlo cuando termine.",
  // A month no calendar has, off a form nobody types into: the screen is
  // broken rather than the answer wrong. Named anyway, the way the plan names
  // its own, so a person who somehow sees it knows it was not them.
  "close.error.month": "No pudimos ver de qué mes se trata.",
  // The other thumb won, and nothing went wrong. No "probá de nuevo": the
  // month is exactly as they wanted it, and there is no second close.
  "close.error.alreadyClosed": "Ese mes ya estaba cerrado.",
  "close.error.failed": "No pudimos cerrar el mes. Probá de nuevo.",

  /*
   * The month that ended, said on the Budget screen until it is closed (#118).
   *
   * Two sentences for one fact, and the difference between them is the whole
   * asymmetry ADR-0051 admits: the creator is told the month ended and invited
   * to finish it, and the invited Member is told the same thing and who it is
   * waiting on. Neither is shown a button the other one owns.
   *
   * "Cuando no le falte nada" and not "cuando quieras". The close is not a
   * preference -- it is a claim that the month is fully loaded -- and the only
   * honest instruction is the one that names the condition.
   */
  "close.waiting.title": "Cierre del mes",
  "close.waiting.mine": "{month} terminó. Cuando no le falte nada, cerralo.",
  "close.waiting.theirs": "{month} terminó y espera que {member} lo cierre.",
  "close.waiting.act": "Cerrar {month}",

  // The sheet the artboard draws (`design/SheetCerrar.dc.html`), grouped the
  // way it groups them: the plain paragraph carries the whole of what closing
  // does, and the block set apart from it carries the one rule a person will
  // meet later without being told -- what happens to a September ticket found
  // in October.
  "close.sheet.body":
    "Esto no tiene vuelta atrás. Después de cerrar no vas a poder editar ni agregar nada a {month} — nunca.",
  "close.sheet.late":
    "Si aparece un ticket de {month} después, se va a cargar con la fecha del día en que lo cargues y va a descontar del presupuesto de {next}.",
  // What the month holds, so nobody freezes it blind. The pending line is the
  // only one worth acting on, so it is the only one that has a "nothing" to
  // say: "0 fijos pendientes" is a worry printed where there is none.
  //
  // The artboard labels that line "Sin cargar hoy" and this is the one word on
  // the sheet that departs from it. The row counts Fixed items of the whole
  // month that were never marked paid; "hoy" is a different question and the
  // label would misdescribe its own figure. Said as what it counts instead.
  "close.sheet.movements": "Movimientos",
  "close.sheet.pending": "Sin pagar",
  "close.sheet.pending.none": "Nada pendiente",
  "close.sheet.pending.one": "1 fijo pendiente",
  "close.sheet.pending.many": "{count} fijos pendientes",
  "close.sheet.confirm": "Cerrar {month}",
  "close.sheet.working": "Cerrando\u2026",
  // "Todavía no" and not "Cancelar" (the artboard). Cancelling says the tap
  // was a mistake; this says the month is not finished yet, which is the true
  // reason somebody backs out of this sheet.
  "close.sheet.notYet": "Todavía no",

  /*
   * The Carry-over (#120, ADR-0003). What a closed month left the next one, and
   * the one thing about it that is not symmetric.
   *
   * The whole voice of this section is that a surplus and a deficit are two
   * different sentences with two different jobs. The surplus offers, and says
   * where the money goes and that it belongs to neither Member. The deficit
   * only ever states -- there is no verb anywhere in it, because approving a
   * debt into existence was never a thing to put under a thumb -- and it has to
   * answer, unasked, the question anybody would have: why is this not coming
   * off this month.
   */
  "carry.title": "Arrastre",
  // The surplus, as the card's own sentence. It names both months, because the
  // whole of what a person needs to decide is where it came from and where it
  // is going.
  "carry.surplus.mine": "Sobraron {amount} en {month}.",
  // The invited Member's row: it states, and names who it is waiting on, the
  // same way the close's does (ADR-0051, ADR-0053). Never a greyed-out button.
  "carry.surplus.theirs":
    "Sobraron {amount} en {month} y espera que {member} lo apruebe.",
  // The surplus on a month that has since been closed: shown and not offered
  // (ADR-0054). The control comes off and the sentence stays.
  "carry.surplus.closed": "Sobraron {amount} en {month} y no se aprobó.",
  "carry.surplus.act": "Aprobar el arrastre",
  // The deficit. Two sentences and not one: the first is what happened, and the
  // second is the rule -- and the rule is the half a person would otherwise
  // read as a bug.
  "carry.deficit": "Se gastaron {amount} de más en {month}.",
  "carry.deficit.why":
    "No se descuenta de este mes: esa plata ya se gastó, y lo que la pagó se anota acá como gasto.",

  // The sheet the surplus opens. It confirms one act and explains the one thing
  // about it that surprises people: the money comes back with nobody's name on
  // it, because nobody earned it (ADR-0003).
  "carry.sheet.title": "Sobraron {amount} en {month}",
  "carry.sheet.body":
    "Si lo aprobás, entra como ingreso de {next}. No se atribuye a ninguno de los dos, porque no lo ganó nadie.",
  "carry.sheet.confirm": "Aprobar el arrastre",
  "carry.sheet.working": "Aprobando\u2026",
  // "Ahora no" and not "Cancelar", which the artboard already drew: this act
  // does not expire, and the honest reason somebody backs out of it is that
  // they are not deciding it right now.
  "carry.sheet.notNow": "Ahora no",

  /*
   * The refusals. The two in the middle are the ones nothing fixes -- a deficit
   * is never carried, and a month that landed on its plan left nothing -- so
   * neither invites a retry. The last one does, and for the reason the close's
   * does: a dropped connection is the one refusal here where nothing happened
   * and trying again is the fix.
   */
  "carry.error.notTheCreator":
    "Solo quien creó el espacio puede aprobar el arrastre.",
  "carry.error.nothingToCarry": "Ese mes no dejó nada para arrastrar.",
  "carry.error.aDeficit":
    "Lo que se gastó de más no se arrastra: esa plata ya se gastó, y lo que la pagó se anota en el mes en que se paga.",
  "carry.error.notOverYet": "Todavía no terminó ese mes.",
  "carry.error.notClosed":
    "Ese mes todavía no está cerrado, así que lo que sobró no es definitivo.",
  "carry.error.monthIsClosed":
    "Este mes está cerrado y no se le puede agregar nada.",
  "carry.error.month": "No pudimos ver de qué mes se trata.",
  "carry.error.failed": "No pudimos aprobar el arrastre. Probá de nuevo.",

  "movements.new": "Anotar un movimiento",
  "movements.new.title": "Nuevo movimiento",
  "movements.shared": "Compartido con {member}",
  "movements.direction": "Qué anotás",
  "movements.direction.expense": "Gasto",
  "movements.direction.income": "Ingreso",
  // What an income row is called on the month's list. It carries no Category
  // (#8), so this is the whole of its name.
  "movements.income": "Ingreso",
  // The one income nobody earned, read by where it came from (ADR-0003, #120).
  // "Ingreso" alone would put a figure on the list that a person cannot account
  // for, and there is no Category and no typed name to fall back on.
  "movements.carriedOver": "Arrastre de {month}",
  // The one mark that tells money coming in from money going out at a glance.
  // A written sign, and since #39 a colour as well: the sign is what somebody
  // who cannot tell the two greens apart reads, and the colour is what makes
  // the row scannable for everybody else. Never the colour on its own.
  "movements.amount.income": "+{amount}",
  "movements.keypad": "Teclado del monto",
  "movements.keypad.erase": "Borrar el último número",
  "movements.category": "Categoría",
  "movements.name": "Qué fue",
  "movements.name.example": "Éxito, Uber, la farmacia",
  "movements.category.none": "Elegí una categoría",
  "movements.when.today": "Hoy",
  "movements.change": "Cambiar",
  "movements.when.title": "Cuándo y de quién",
  "movements.when.change": "Cambiar cuándo y de quién",
  // What the line says when the day picked falls inside a closed month (#119).
  // It names the month rather than saying "ese mes", because the day above it
  // is written as "30 de agosto" and the two have to be the same August.
  //
  // It names the way out in the same breath. The refusal on its own would be a
  // dead end, and unlike the closed screens there is one here: pick another
  // day. Nothing is offered that would unlock anything (ADR-0002).
  "movements.when.closed":
    "{month} está cerrado. Elegí un día de un mes que siga abierto.",
  "movements.day": "Día",
  "movements.attributedTo": "Es plata de",
  "movements.recordedBy": "Anotado por {member}",
  "movements.submit": "Guardar",
  "movements.working": "Guardando\u2026",
  "movements.edit.title": "Corregir el movimiento",
  "movements.edit.submit": "Guardar los cambios",
  // "Struck out" in the key and "borrar" in the words, deliberately: the
  // glossary's term is Struck out, because the row is never deleted, and what
  // a person calls the button is "borrar" (ADR-0015).
  "movements.strike": "Borrar el movimiento",
  "movements.strike.title": "¿Borrar este movimiento?",
  "movements.strike.body":
    "Deja de contar en el mes. Queda anotado que lo borraste vos.",
  "movements.strike.confirm": "Sí, borralo",
  "movements.strike.working": "Borrando\u2026",
  "movements.error.amount": "Poné un monto mayor que cero.",
  "movements.error.category": "Elegí una categoría de este espacio.",
  "movements.error.day": "Elegí un día que ya haya pasado.",
  "movements.error.attribution": "Elegí a alguien de este espacio.",
  "movements.error.name":
    "Poné un nombre más corto, de hasta {max} caracteres.",
  "movements.error.direction": "Elegí si es un gasto o un ingreso.",
  "movements.error.space": "No pudimos ver de qué espacio se trata.",
  "movements.error.gone": "Ese movimiento ya no está.",
  // The same fact the plan states, said about a Movement. ADR-0002 decided
  // where a late ticket goes, so this points at the answer rather than leaving
  // a person holding a receipt with nowhere to put it.
  "movements.error.monthClosed":
    "Ese mes está cerrado y no se puede cambiar. Cargalo con la fecha de hoy y va a descontar del mes en curso.",
  "movements.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  "movements.error.failed": "No pudimos guardar el movimiento. Probá de nuevo.",

  // Who shares a Space, and the one seat it has to offer (#9).
  "members.title": "Miembros",
  "members.you": "Vos",
  "members.invite.title": "Invitar a alguien",
  "members.invite.body":
    "Un espacio lo comparten dos personas como máximo. Poné el correo de Google con el que entra y le va a aparecer la invitación cuando entre.",
  "members.invite.email": "Correo",
  "members.invite.email.hint": "nombre@gmail.com",
  "members.invite.submit": "Invitar",
  "members.invite.working": "Invitando\u2026",
  "members.pending": "Invitación pendiente",
  // Who sent it, said without gendering anybody: the Space knows a name and
  // never which words go with it.
  "members.pending.from": "La mandó {member}",
  "members.pending.cancel": "Cancelar",
  "members.pending.working": "Cancelando\u2026",
  "members.full": "Este espacio ya lo comparten dos personas.",
  "members.error.email": "Ese correo no parece un correo. Fijate cómo está escrito.",
  "members.error.full":
    "Este espacio ya está completo: lo comparten dos personas como máximo.",
  "members.error.space": "No pudimos ver de qué espacio se trata.",
  "members.error.gone": "Esa invitación ya no está.",
  "members.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  // Four actions share this one line -- inviting, cancelling, accepting,
  // turning down -- so it names none of them. "No pudimos mandar la
  // invitación" shown to somebody who was accepting one is wrong about the
  // act as well as about the cause.
  "members.error.failed": "Algo se rompió de nuestro lado. Probá de nuevo.",

  // What waits for the person who was invited, on the list they land on.
  "invitations.title": "Te invitaron",
  "invitations.from": "Te invitó {member}",
  "invitations.accept": "Entrar",
  "invitations.decline": "Rechazar",
  "invitations.working": "Un momento\u2026",

  "categories.subtitle":
    "Vienen con contaro y las podés ampliar. Lo que agregues acá no sale de este espacio.",
  "categories.add": "Agregar una categoría",
  "categories.own": "Tuya",
  "categories.alone": "Sin subcategorías",

  "categories.new.title": "Nueva categoría",
  "categories.new.name": "Nombre",
  "categories.new.name.hint": "Panadería, Mate, Regalos\u2026",
  "categories.new.parent": "Va dentro de",
  "categories.new.parent.none": "Nada, es una categoría principal",
  "categories.new.parent.hint":
    "Una categoría puede tener subcategorías, y una subcategoría no.",
  "categories.new.submit": "Agregar la categoría",
  "categories.new.working": "Agregando\u2026",
  "categories.new.error.name": "Ponele un nombre que este espacio no use todavía.",
  "categories.new.error.parent": "Elegí una categoría de este espacio.",
  "categories.new.error.space": "No pudimos ver de qué espacio se trata.",
  "categories.new.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  "categories.new.error.failed": "No pudimos agregar la categoría. Probá de nuevo.",

  // Everything under `category.` is a shipped Category's name, keyed by its
  // slug in the seed migration, and nothing else may live in that namespace:
  // src/i18n/category.test.ts asserts the two lists are the same list.
  "category.food": "Comida",
  "category.food.groceries": "Supermercado",
  "category.food.dining": "Restaurantes y delivery",
  "category.home": "Hogar",
  "category.home.rent": "Alquiler",
  "category.home.utilities": "Servicios",
  "category.home.upkeep": "Expensas y mantenimiento",
  "category.transport": "Transporte",
  "category.transport.fuel": "Nafta",
  "category.transport.public": "Transporte público",
  "category.transport.vehicle": "Auto y moto",
  "category.health": "Salud",
  "category.health.pharmacy": "Farmacia",
  "category.health.care": "Consultas y estudios",
  "category.leisure": "Ocio",
  "category.leisure.outings": "Salidas",
  "category.leisure.subscriptions": "Suscripciones",
  "category.personal": "Personal",
  "category.personal.clothing": "Ropa",
  "category.personal.grooming": "Cuidado personal",
  "category.education": "Educación",
  "category.pets": "Mascotas",
  "category.other": "Otros",

  "currency.ARS": "Peso argentino",
  "currency.USD": "Dólar estadounidense",
  "currency.EUR": "Euro",
  "currency.UYU": "Peso uruguayo",
  "currency.BRL": "Real brasileño",
  "currency.CLP": "Peso chileno",
  "currency.PYG": "Guaraní",
  "currency.COP": "Peso colombiano",
  "currency.MXN": "Peso mexicano",
  "currency.CAD": "Dólar canadiense",

  // How the app is lit, which is the device's answer and not the Space's
  // (#41). One word for the group and for the control inside it: they are the
  // same question, and a second word for it would be a second thing to learn.
  "appearance.label": "Apariencia",
  // "Automático" and not "Sistema": the thing a person has in their hand is a
  // phone, and this is the word their phone already uses for it.
  "appearance.system": "Automático",
  "appearance.light": "Claro",
  "appearance.dark": "Oscuro",

  "account.label": "Tu sesión",
  "account.signOut": "Salir",

  "action.cancel": "Cancelar",
  "action.done": "Listo",
  "action.save": "Guardar",
  "action.dismiss": "Descartar",

  // The two steps of a chip picker over a catalogue that has headings (#45).
  // One pair for every screen that asks, because picking a Category is one
  // question: the Movement being recorded and the month's item being planned
  // ask it in the same words or they stop being the same control.
  //
  // A question and not a label: what is under a heading is offered, and an
  // offer that reads like a field asks to be filled in.
  "chips.more": "¿Algo más preciso?",
  // The way back to the whole list. Written and not "Volver", because it is
  // the answer that changes and not the screen.
  "chips.change": "Cambiar",
} as const;

export type SpanishMessages = typeof es;
