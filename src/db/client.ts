import { createDatabase, databaseUrl, type Connection } from "./connection";

let connection: Connection | undefined;

/**
 * The one connection pool the running application shares.
 *
 * It is opened on first use rather than on import, so building the app — and
 * importing anything that touches the database — does not need DATABASE_URL.
 * Tests open their own pool through `createDatabase` and close it themselves.
 */
export function database(): Connection["db"] {
  connection ??= createDatabase(databaseUrl());
  return connection.db;
}
