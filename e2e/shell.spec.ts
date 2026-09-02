import { expect, test } from "@playwright/test";

test("the app runs and renders the shell in Spanish", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { name: "Presupuesto", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Principal" }),
  ).toBeVisible();
});

test("navigation is a slot the shell fills on every route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Movimientos" }).click();

  await expect(page).toHaveURL(/\/movimientos$/);
  await expect(
    page.getByRole("link", { name: "Movimientos" }),
  ).toHaveAttribute("aria-current", "page");
});
