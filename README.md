# contaro

A personal finance tool for tracking expenses and budgets, used by one person
alone or by a couple pooling their money. See `CONTEXT.md` for the vocabulary
and `docs/adr/` for the decisions behind the shape of the code.

## Getting started

```bash
pnpm install
cp .env.example .env.local     # points at the Postgres below
pnpm db:up                     # Postgres 18 on localhost:5434
pnpm db:migrate
pnpm dev                       # http://localhost:3000
```

Sign-in needs three more variables in `.env.local`:

```bash
AUTH_SECRET=                   # pnpm dlx auth secret
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

The Google pair comes from an OAuth 2.0 client in the Google Cloud console with
`http://localhost:3000/api/auth/callback/google` as an authorised redirect URI.
Anywhere other than Vercel, also set `AUTH_TRUST_HOST=true` (ADR-0006). The
test suites need none of this: `pnpm test:e2e` signs its own session cookies
and never reaches Google.

Playwright drives WebKit on a phone viewport, so install it once:

```bash
pnpm exec playwright install webkit
```

## Checks

| Command | What it covers |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the domain boundary |
| `pnpm test` | Unit and component tests (no database needed) |
| `pnpm test:db` | Integration tests against a real Postgres |
| `pnpm test:e2e` | Playwright, mobile WebKit, a production build and a real Postgres (it starts one) |
| `pnpm check:migrations` | Refuses a migration that destroys without saying so (ADR-0008) |
| `pnpm verify` | typecheck + lint + the migration check + unit tests |
| `pnpm verify:all` | everything above |

## Layout

```
src/
├── app/        Next.js App Router: routes, layout, and /ui (component gallery)
├── auth/       Auth.js: the Google handshake, and only that (ADR-0006)
├── domain/     The rules. No framework imports (ADR-0005, enforced by lint)
├── db/         Drizzle schema, connection and migrations
├── i18n/       The Spanish message catalogue and the translator
├── ui/         Design tokens and the base components
└── proxy.ts    Puts every page behind a session
eslint-rules/   The domain boundary rule and its tests
scripts/        The migration safety check (ADR-0008) and its tests
e2e/            Playwright specs
.github/        verify:all on pull requests and pushes, migrations on main and dev
```

## Deployment

`main` serves https://contaro.gianbarboza.com and `dev` serves
https://dev.contaro.gianbarboza.com, each against its own Neon branch. The
reasoning is in ADR-0008 (migrations run in CI, and never destroy) and ADR-0009
(a preview never sees production data).

CI cannot gate the deploy, because the migration Action and the Vercel deploy
run in parallel — so it gates the merge instead, and nothing reaches `main`
without a green `verify:all`. What makes the gap between them harmless is
expand/contract, and `pnpm check:migrations` is what enforces it: a migration
containing `DROP TABLE`, `DROP COLUMN`, or an `ADD COLUMN … NOT NULL` with no
default fails the build. A loss that is deliberate says so, and says why:

```sql
-- deliberate-loss: nothing has read spaces.nickname since #31.
```

| Variable | Set in | What it is |
| --- | --- | --- |
| `DATABASE_URL` | Vercel, per environment | Neon's **pooled** endpoint — what the running app uses |
| `DATABASE_URL_UNPOOLED` | GitHub environment `production` / `preview` | Neon's **direct** endpoint — what `drizzle-kit` migrates through |
| `AUTH_SECRET` | Vercel, per environment | Its own value in each; a preview must not be able to mint a production session |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Vercel | One OAuth client, with a redirect URI per host |

`AUTH_TRUST_HOST` stays unset on Vercel: Auth.js infers it from `VERCEL=1`.
Anywhere else it is needed (ADR-0006).

postgres.js needs no `prepare: false` against Neon's pooled endpoint. Neon runs
PgBouncer 1.22+ with `max_prepared_statements` set, which supports the
protocol-level prepared statements postgres.js uses; only SQL-level `PREPARE`
is unavailable, and nothing here writes one.

## The domain boundary

`src/domain/` may only import from inside itself and from `node:` builtins — a
domain test may also import `vitest`, and nothing else. `domain/no-outside-imports`
in `eslint.config.mjs` enforces it across every extension the domain can hold
(`.ts .tsx .mts .cts .js .jsx .mjs .cjs`), including relative paths that escape
the directory, non-literal `import()`, `require()`, and the `node:module`
escape hatch. `eslint-rules/no-outside-imports.test.ts` drives the project's
real ESLint config over each of those. See `src/domain/README.md`.

## Interface

Mobile-first: the phone is the product. Design tokens live in
`src/ui/tokens.css`, taken from the design canvas in `design/`. Each colour is
declared once with `light-dark()`, so the light and dark sets cannot drift; the
theme follows the OS and can be forced with `data-theme` on the root element.

Every interactive element gets its 44px touch target from the single `hitTarget`
class in `src/ui/hit-target.module.css`, and it is proved three ways:
`src/ui/hit-target.test.tsx` catches a component that forgot the class,
`src/ui/hit-target.source.test.ts` catches the class losing its rule or a second
stylesheet setting its own size, and `e2e/hit-targets.spec.ts` measures real
geometry in WebKit. `/ui` renders every base component so the browser has
something to measure.

## Sign-in

Auth.js runs the Google handshake and signs a JWT session cookie; who that
person is stays ours. `resolveMember` in `src/domain/identity/` decides whether
an identity is a new Member or an existing one, and refuses one it cannot
place; `src/db/members.ts` only fetches and writes. See ADR-0006.

`src/proxy.ts` puts every page behind a session and sends a signed-out visitor
to `/ingresar`. `/api` is outside it on purpose, so a route answers 401 itself
rather than redirecting a fetch to HTML.

`src/app/api/me/` is the seam that proves a session resolves to its Member, and
it is proved twice over. `handler.ts` takes both the session and the lookup as
arguments, so every answer — no session, a session naming a Member, a session
naming one that is gone — is driven without a server; `e2e/sign-in.spec.ts`
then seeds a real Member, mints the cookie a Google handshake would have
produced, and drives the whole chain against the running app. A Google
handshake itself cannot happen in a test, so `e2e/session.ts` starts where one
would have finished.

All interface copy resolves through `src/i18n/`, with Spanish as the only
shipped language. Navigation is a slot on `<AppShell>` — today a tab bar, and
the shell does not know that.
