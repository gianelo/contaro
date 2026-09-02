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
| `pnpm test:e2e` | Playwright, mobile WebKit, against a production build |
| `pnpm verify` | typecheck + lint + unit tests |
| `pnpm verify:all` | everything above |

## Layout

```
src/
├── app/        Next.js App Router: routes, layout, and /ui (component gallery)
├── domain/     The rules. No framework imports (ADR-0005, enforced by lint)
├── db/         Drizzle schema, connection and migrations
├── i18n/       The Spanish message catalogue and the translator
└── ui/         Design tokens and the base components
eslint-rules/   The domain boundary rule and its tests
e2e/            Playwright specs
```

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

All interface copy resolves through `src/i18n/`, with Spanish as the only
shipped language. Navigation is a slot on `<AppShell>` — today a tab bar, and
the shell does not know that.
