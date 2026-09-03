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
  "space.month.spent": "Gastado",
  "space.movements.empty": "Todavía no anotaste ningún movimiento acá.",

  "movements.new": "Anotar un gasto",
  "movements.new.title": "Nuevo gasto",
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
  "movements.edit.title": "Corregir el gasto",
  "movements.edit.submit": "Guardar los cambios",
  // "Struck out" in the key and "borrar" in the words, deliberately: the
  // glossary's term is Struck out, because the row is never deleted, and what
  // a person calls the button is "borrar" (ADR-0015).
  "movements.strike": "Borrar el gasto",
  "movements.strike.title": "¿Borrar este gasto?",
  "movements.strike.body":
    "Deja de contar en el mes. Queda anotado que lo borraste vos.",
  "movements.strike.confirm": "Sí, borralo",
  "movements.strike.working": "Borrando\u2026",
  "movements.error.amount": "Poné un monto mayor que cero.",
  "movements.error.category": "Elegí una categoría de este espacio.",
  "movements.error.day": "Elegí un día que ya haya pasado.",
  "movements.error.attribution": "Elegí a alguien de este espacio.",
  "movements.error.space": "No pudimos ver de qué espacio se trata.",
  "movements.error.gone": "Ese gasto ya no está.",
  "movements.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  "movements.error.failed": "No pudimos guardar el gasto. Probá de nuevo.",

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
