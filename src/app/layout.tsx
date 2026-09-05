import type { Metadata, Viewport } from "next";
import { locale, t } from "@/i18n";
import { themeScript } from "@/ui/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.description"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mobile-first: the phone is the product, not a narrow view of a desktop app.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The script below writes data-theme onto this element before React has
    // seen the page, so the server's <html> and the client's disagree by one
    // attribute on every load a Member chose a theme on. That disagreement is
    // the feature, not a bug to fix by rendering the attribute on the server:
    // the server does not know the choice, and cannot -- it lives in the
    // browser (#41).
    <html lang={locale} suppressHydrationWarning>
      {/*
       * The theme, settled before a pixel of this app is drawn.
       *
       * A bare inline script and not <Script>: `beforeInteractive` does not
       * block the paint by its own documentation, and an effect or a component
       * runs later still. Either way the person who asked for dark is the one
       * who watches the screen flash white on the way in.
       *
       * Where it lands is Next's to decide and not ours -- rendered here, in a
       * hand-written <head>, or through <Script beforeInteractive>, all three
       * come out at the top of <body>, ahead of every element this app draws.
       * That is what `e2e/theme.spec.ts` asserts, because it is what is true;
       * the stylesheets above it are render-blocking, so nothing has painted
       * by the time it runs.
       *
       * It is the only place in this app that writes HTML as a string, which
       * is why the string is built in one module with the key it reads.
       */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <body>{children}</body>
    </html>
  );
}
