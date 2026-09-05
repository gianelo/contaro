// Named exactly, for the reason avatar.module.css.d.ts is: Next types every
// *.module.css as an index signature, which under noUncheckedIndexedAccess
// makes every class `string | undefined`. The tint is looked up by a variable,
// so a renamed rule has to be a type error rather than a circle drawn with no
// ground under it at all.
declare const styles: {
  readonly circle: string;
  readonly green: string;
  readonly grey: string;
};
export default styles;
