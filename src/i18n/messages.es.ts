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
  "spaces.who.several": "{count} miembros · {currency}",
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
  "space.month.choose": "Elegir el mes",
  "space.month.previous": "Mes anterior",
  "space.month.next": "Mes siguiente",
  // The pill at the top of the Budget screen (#40). The month first, because
  // the accessible name has to start with the word a person can see on it.
  "space.month.pill": "{month}, elegir el mes",
  "space.month.inView": "Mes que est\u00e1s viendo",

  // The month's plan (#10). "Presupuesto" is the tab and, since #40, the
  // screen's own title; the list under it is "El plan del mes", because the
  // rows are the plan and a second "Presupuesto" over them would name the
  // screen twice.
  "budget.title": "El plan del mes",
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
  "budget.item.new": "Agregar un \u00edtem",
  "budget.item.new.title": "Nuevo \u00edtem",
  "budget.item.edit.title": "Corregir el \u00edtem",
  "budget.item.category": "Categor\u00eda",
  "budget.item.amount": "Cu\u00e1nto esper\u00e1s gastar",
  "budget.item.save": "Guardar",
  "budget.item.save.working": "Guardando\u2026",
  "budget.item.remove": "Sacar del plan",
  "budget.item.remove.working": "Sacando\u2026",

  "budget.fixed.edit.title": "Corregir el fijo",
  // Why the four questions are not on the screen, and what to do about it. The
  // way out is named as a place to go and not only as an instruction: a
  // sentence telling somebody to undo something they cannot reach from here is
  // a dead end with good manners.
  "budget.fixed.paid.title": "Este \u00edtem ya est\u00e1 pagado",
  "budget.fixed.paid.body":
    "Para corregirlo o sacarlo del plan, primero anul\u00e1 el movimiento que lo pag\u00f3.",
  "budget.fixed.paid.movement": "Ver el movimiento",

  // The other half of a Budget (#13): the amounts whose day and figure are
  // known in advance. Above the Variables, the way the canvas draws them, and
  // named for the kind of item rather than for the grouping. `GroupedList`
  // puts it in capitals.
  "budget.fixed": "Fijos",
  "budget.fixed.new": "Agregar un fijo",
  "budget.fixed.new.title": "Nuevo \u00edtem fijo",
  "budget.fixed.name": "C\u00f3mo se llama",
  "budget.fixed.dueDay": "Qu\u00e9 d\u00eda del mes vence",
  "budget.fixed.amount": "Cu\u00e1nto es",
  // The badge at the end of a row. Two words, and never a colour on its own:
  // the state has to survive somebody who cannot tell the two grounds apart.
  "budget.fixed.paid": "Pagado",
  "budget.fixed.pending": "Pendiente",
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
  // The ceiling comes from `MAX_FIXED_ITEM_NAME_LENGTH` rather than being
  // written out here: a number in the copy and a number in the domain are two
  // places for one rule, and only one of them refuses anything.
  "budget.error.name": "Pon\u00e9le un nombre de hasta {max} caracteres.",
  "budget.error.dueDay": "Eleg\u00ed un d\u00eda que ese mes tenga.",
  "budget.error.gone": "Ese \u00edtem ya no est\u00e1.",
  "budget.error.alreadyPaid": "Ese \u00edtem ya estaba pagado.",
  "budget.error.signedOut": "Se cerr\u00f3 tu sesi\u00f3n. Entr\u00e1 de nuevo.",
  "budget.error.failed": "No pudimos guardar el \u00edtem. Prob\u00e1 de nuevo.",

  "movements.new": "Anotar un movimiento",
  "movements.new.title": "Nuevo movimiento",
  "movements.shared": "Compartido con {member}",
  "movements.direction": "Qué anotás",
  "movements.direction.expense": "Gasto",
  "movements.direction.income": "Ingreso",
  // What an income row is called on the month's list. It carries no Category
  // (#8), so this is the whole of its name.
  "movements.income": "Ingreso",
  // The one mark that tells money coming in from money going out at a glance.
  // A written sign, and since #39 a colour as well: the sign is what somebody
  // who cannot tell the two greens apart reads, and the colour is what makes
  // the row scannable for everybody else. Never the colour on its own.
  "movements.amount.income": "+{amount}",
  "movements.keypad": "Teclado del monto",
  "movements.keypad.erase": "Borrar el último número",
  "movements.category": "Categoría",
  "movements.category.none": "Elegí una categoría",
  "movements.when.today": "Hoy",
  "movements.change": "Cambiar",
  "movements.when.title": "Cuándo y de quién",
  "movements.when.change": "Cambiar cuándo y de quién",
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
  "movements.error.direction": "Elegí si es un gasto o un ingreso.",
  "movements.error.space": "No pudimos ver de qué espacio se trata.",
  "movements.error.gone": "Ese movimiento ya no está.",
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
