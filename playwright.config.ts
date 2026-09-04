import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { authSecret } from "./e2e/secret";

// The seam tests seed a Member, so the run needs the same DATABASE_URL the
// server does. Inline for the same reason the vitest configs are: a module
// with an import-time side effect trips this loader. A pure import is fine —
// this file already imports one from ./e2e/secret.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    // Both clocks in one zone, and the zone somebody is actually in. The entry
    // form dates a Movement from the browser's own day; the month's list names
    // that day against the Reader's, which is the zone the request arrived
    // with (ADR-0018). Unpinned, the browser takes the machine's zone and the
    // server falls through to its fallback, so a run west of Greenwich
    // straddles a date boundary the server does not and every heading that
    // should read "Hoy" reads a date instead.
    //
    // The two are pinned together on purpose. Pinning only the browser would
    // leave the server on the fallback, which is Bogota anyway -- the suite
    // would pass, and it would be passing by accident, proving nothing about
    // the header production actually sends. With both, the run drives the
    // route that is deployed.
    //
    // A pin and not a frozen clock: the run still reads the real time. A test
    // that passes because it was told the wrong time proves nothing at all.
    timezoneId: "America/Bogota",
    extraHTTPHeaders: { "x-vercel-ip-timezone": "America/Bogota" },
  },
  // The product is mobile-first: the default project is a phone.
  projects: [{ name: "mobile", use: { ...devices["iPhone 13"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    // Never reuse: with `pnpm build` in the command, a reused server would
    // silently test the previous build.
    reuseExistingServer: false,
    timeout: 180_000,
    // The run signs its own session cookies, so the server it starts has to
    // verify them with the same secret. No Google credentials are needed: the
    // handshake never happens (see e2e/session.ts).
    env: {
      AUTH_SECRET: authSecret,
      // Auth.js refuses an untrusted host outside Vercel, and the run serves
      // itself on localhost. Production sets this too (see README).
      AUTH_TRUST_HOST: "true",
    },
  },
});
