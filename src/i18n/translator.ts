export type Messages = Readonly<Record<string, string>>;

export type Params = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Builds the `t` used everywhere interface copy is needed.
 *
 * Keys are checked by the type system against the catalogue, and placeholders
 * are checked at runtime: a missing parameter throws rather than rendering
 * "{member}" to a person.
 */
export function createTranslator<M extends Messages>(messages: M) {
  return function t(key: keyof M & string, params?: Params): string {
    const message = messages[key];
    if (message === undefined) {
      throw new Error(`No message for key "${key}" in the catalogue.`);
    }

    return message.replace(PLACEHOLDER, (_match, name: string) => {
      const value = params?.[name];
      if (value === undefined) {
        throw new Error(
          `Message "${key}" needs a parameter "${name}", which was not given.`,
        );
      }
      return String(value);
    });
  };
}
