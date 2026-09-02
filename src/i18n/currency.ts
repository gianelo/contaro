import type { CurrencyCode } from "@/domain/money/currency";
import { t } from "./index";

/**
 * How a currency is named to a person: "Peso argentino (ARS)".
 *
 * The code is on the screen beside the name because the code is what the Space
 * is stored in, what an amount is printed in, and what a second Member will see
 * when they are invited into it. One decision, one place.
 */
export function currencyLabel(code: CurrencyCode): string {
  return `${t(`currency.${code}`)} (${code})`;
}
