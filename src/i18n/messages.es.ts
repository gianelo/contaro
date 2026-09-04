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

  "spaces.title": "Espacios",
  "spaces.empty.title": "Todavía no tenés espacios",
  "spaces.empty.body":
    "Un espacio guarda los movimientos y el presupuesto de una sola moneda. Creá el primero para empezar.",
  "spaces.new": "Crear un espacio",

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

  // The month's plan (#10). "Presupuesto" is the tab; inside it the plan is
  // read as what the month is expected to cost, which is why the total is
  // "Planeado" beside the "Gastado" above it rather than a second "Presupuesto".
  "budget.title": "El plan del mes",
  "budget.planned": "Planeado",
  // Shown only where a Category really has several items, so the heading says
  // what that block is for rather than repeating "El plan del mes".
  "budget.byCategory": "Por categor\u00eda",
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

  "budget.error.amount": "Pon\u00e9 un monto mayor que cero.",
  "budget.error.category": "Eleg\u00ed una categor\u00eda de este espacio.",
  "budget.error.month": "No pudimos ver de qu\u00e9 mes se trata.",
  "budget.error.space": "No pudimos ver de qu\u00e9 espacio se trata.",
  "budget.error.gone": "Ese \u00edtem ya no est\u00e1.",
  "budget.error.signedOut": "Se cerr\u00f3 tu sesi\u00f3n. Entr\u00e1 de nuevo.",
  "budget.error.failed": "No pudimos guardar el \u00edtem. Prob\u00e1 de nuevo.",

  "movements.new": "Anotar un movimiento",
  "movements.new.title": "Nuevo movimiento",
  "movements.direction": "Qué anotás",
  "movements.direction.expense": "Un gasto",
  "movements.direction.income": "Un ingreso",
  // What an income row is called on the month's list. It carries no Category
  // (#8), so this is the whole of its name.
  "movements.income": "Ingreso",
  // The one mark that tells money coming in from money going out at a glance.
  // A written sign and not a colour: a difference carried by colour alone is a
  // difference somebody cannot see, and this product's one accent colour
  // already means "this can be tapped".
  "movements.amount.income": "+{amount}",
  // Shown on a row only where the Space has somebody else in it. In a personal
  // Space every Movement is yours, and saying so on every row says nothing.
  "movements.attributed": "Plata de {member}",
  "movements.keypad": "Teclado del monto",
  "movements.keypad.erase": "Borrar el último número",
  "movements.category": "Categoría",
  "movements.category.none": "Elegí una categoría",
  "movements.when": "{day} · {member}",
  "movements.when.today": "Hoy",
  "movements.change": "Cambiar",
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

  "account.label": "Tu sesión",
  "account.signOut": "Salir",

  "action.cancel": "Cancelar",
  "action.save": "Guardar",
  "action.dismiss": "Descartar",
} as const;

export type SpanishMessages = typeof es;
