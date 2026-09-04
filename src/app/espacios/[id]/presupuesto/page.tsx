import { redirect } from "next/navigation";

/**
 * The plan lives on the Space's own screen, which is what the Presupuesto tab
 * points at: picking a Space lands on its plan, so a second address for it
 * would be a second screen to keep in step with the first.
 *
 * This exists so the address bar stays honest (ADR-0010). `/presupuesto/nuevo`
 * and `/presupuesto/<item>` are real screens, and chopping the last segment
 * off one of them is a thing people do — a 404 there would be the product
 * saying the plan is not where its own URLs say it is.
 */
export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);

  // The month is carried through rather than dropped: somebody who chopped the
  // segment off an item's URL was reading a month, and landing them on this
  // one would be answering a question they did not ask.
  redirect(mes ? `/espacios/${id}?mes=${mes}` : `/espacios/${id}`);
}
