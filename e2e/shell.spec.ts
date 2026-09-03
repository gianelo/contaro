import { expect, test } from "./fixtures";

test("the app runs and renders the shell in Spanish", async ({ page }) => {
  await page.goto("/");

  // There is no screen above a Space, so entering means landing on the list
  // of them (#5).
  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { name: "Espacios", level: 1 }),
  ).toBeVisible();
});

test("the list a Member lands on carries no tab bar", async ({ page }) => {
  await page.goto("/espacios");

  // It belongs to no Space, so a "Presupuesto" tab here would have no money
  // to be about. Navigation begins once a Space is chosen.
  await expect(
    page.getByRole("navigation", { name: "Principal" }),
  ).toHaveCount(0);
});
