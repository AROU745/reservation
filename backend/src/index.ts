import { app } from "./app";
import { ensureSqliteConcurrencyPragmas } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3000;

async function main(): Promise<void> {
  await ensureSqliteConcurrencyPragmas();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
