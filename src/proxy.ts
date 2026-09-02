export { auth as proxy } from "@/auth";

/**
 * Every page is behind the session. Three things are deliberately outside it:
 * Auth.js's own routes, which run the handshake that creates a session; the
 * sign-in page, which a signed-out person has to be able to reach; and `/api`,
 * where a route answers 401 itself rather than redirecting a fetch to HTML.
 */
export const config = {
  matcher: [
    "/((?!api|ingresar|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
