/**
 * One answer out of a submitted form.
 *
 * A form field is a string or a file, and anything that is not a string is not
 * an answer: it reaches the domain as an empty one and is refused there by
 * name, rather than reaching it as a File and being refused by a type error
 * nobody can act on.
 */
export function answer(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
