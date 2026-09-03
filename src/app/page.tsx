import { redirect } from "next/navigation";

/**
 * A Member lands on the list of Spaces they belong to, and picks which money
 * they are looking at (#5). There is no screen above a Space: the budget and
 * the movements are always about one, so they live under its identifier.
 */
export default function HomePage() {
  redirect("/espacios");
}
