// Named exactly, for the reason hit-target.module.css.d.ts is: Next types every
// *.module.css as an index signature, which under noUncheckedIndexedAccess
// makes every class `string | undefined`. `reader` leaves this file as a bare
// string, so a deleted rule has to be a type error rather than a Reader drawn
// with no colour at all.
declare const styles: {
  readonly avatar: string;
  readonly lg: string;
  readonly sm: string;
  readonly ringed: string;
  readonly reader: string;
};
export default styles;
