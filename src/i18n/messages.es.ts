/**
 * The only shipped catalogue. Every string a person reads lives here, so that
 * adding a second language later is a new file rather than a search across the
 * codebase.
 */
export const es = {
  "app.name": "contaro",

  "nav.main": "Principal",
  "nav.budget": "Presupuesto",
  "nav.movements": "Movimientos",
  "nav.spaces": "Espacios",

  "home.title": "Presupuesto",
  "home.empty.title": "Todavía no hay nada acá",
  "home.empty.body":
    "Cuando crees tu primer espacio vas a ver acá el presupuesto del mes.",
  "home.empty.action": "Crear un espacio",

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
  "space.new.submit": "Crear el espacio",
  "space.new.working": "Creando\u2026",
  "space.new.error.name": "Ponele un nombre al espacio.",
  "space.new.error.currency": "Elegí una moneda de la lista.",
  "space.new.error.signedOut": "Se cerró tu sesión. Entrá de nuevo.",
  "space.new.error.failed": "No pudimos crear el espacio. Probá de nuevo.",

  "space.month": "Este mes",
  "space.month.spent": "Gastado",

  "currency.ARS": "Peso argentino",
  "currency.USD": "Dólar estadounidense",
  "currency.EUR": "Euro",
  "currency.UYU": "Peso uruguayo",
  "currency.BRL": "Real brasileño",
  "currency.CLP": "Peso chileno",
  "currency.PYG": "Guaraní",

  "account.label": "Tu sesión",
  "account.signOut": "Salir",

  "action.cancel": "Cancelar",
  "action.save": "Guardar",
  "action.dismiss": "Descartar",
} as const;

export type SpanishMessages = typeof es;
