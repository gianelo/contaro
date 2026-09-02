import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so React Testing Library's own auto-cleanup
// never registers. Without this, one test's DOM leaks into the next.
afterEach(cleanup);
