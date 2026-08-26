import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

let sqliteReady: Promise<void> | null = null;

/**
 * SQLite sérialise les writers. Sans busy_timeout, le 2e writer concurrent
 * peut recevoir SQLITE_BUSY immédiatement au lieu d'attendre la fin du 1er.
 * On configure donc un délai d'attente pour que le 2e UPDATE s'exécute après le 1er.
 */
export function ensureSqliteConcurrencyPragmas(): Promise<void> {
  if (!sqliteReady) {
    sqliteReady = prisma
      .$queryRawUnsafe("PRAGMA busy_timeout = 5000")
      .then(() => undefined);
  }

  return sqliteReady;
}
