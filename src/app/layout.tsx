import type { Metadata, Viewport } from "next";
import { locale, t } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("home.empty.body"),
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
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
