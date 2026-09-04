// Named exactly, for the reason hit-target.module.css.d.ts is: Next types every
// *.module.css as an index signature, which under noUncheckedIndexedAccess
// makes every class `string | undefined`. A deleted rule is a type error here
// rather than an avatar that silently loses its colour.
declare const styles: { readonly first: string; readonly second: string };
export default styles;
