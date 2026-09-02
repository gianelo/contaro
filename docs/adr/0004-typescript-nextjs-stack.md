# Next.js, Drizzle and Auth.js, matching the developer's other project

contaro needs a web app on a subdomain, Google sign-in, a real database two people write to, and a domain module fast enough that strict TDD is not a punishment. We weighed three stacks: a full-stack Next.js monolith; a split Hono API with a Vite React SPA; and a Python FastAPI service with a React client.

We chose **TypeScript with Next.js (App Router), Drizzle ORM over Postgres, and Auth.js for Google sign-in**, tested with Vitest and Playwright. It is the same set the developer already runs in a neighbouring project, so authentication, migrations and the test harness are solved problems rather than research, and it ships as one deployable. The domain module is plain TypeScript with no framework imports, which Vitest runs in milliseconds.

## Considered options

The split API and SPA had the strongest architectural case: separate packages make the domain seam physical, so nothing can import React into it by accident, and an SPA feels closer to a native app on a phone. We rejected it because that same protection is available from a lint boundary at a fraction of the cost (ADR-0005), while the split adds a second deployable and hand-wired authentication — infrastructure work that produces no feature.

Python with FastAPI was rejected because the interface still requires a JavaScript client, so it buys two languages and two deployables while abandoning a stack the developer is already productive in, with no benefit to the product.

## Consequences

Next.js invites logic into route handlers and server actions. Left alone, that would dissolve the domain seam this project's entire testing strategy rests on, and every rule would end up tested over HTTP — slowly. ADR-0005 is the countermeasure and is not optional here.
