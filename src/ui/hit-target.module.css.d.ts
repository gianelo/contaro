// Next types every *.module.css as an index signature, which under
// noUncheckedIndexedAccess makes every class `string | undefined`. Naming this
// one class exactly means a typo, or a deleted rule, is a type error rather
// than a silent fallback.
declare const styles: { readonly hitTarget: string };
export default styles;
