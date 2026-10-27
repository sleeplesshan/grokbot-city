import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
if (!existsSync(resolve(root, 'data/live.sqlite'))) throw new Error('Start Grokbot City before creating a backup.');
const dir = resolve(
  root,
  "data/backups",
  new Date().toISOString().replaceAll(":", "-"),
);
mkdirSync(dir, { recursive: true });
for (const mode of ["live"]) {
  const db = new DatabaseSync(resolve(root, `data/${mode}.sqlite`));
  db.exec("PRAGMA busy_timeout=5000");
  db.exec(
    `VACUUM INTO '${resolve(dir, `${mode}.sqlite`).replaceAll("'", "''")}'`,
  );
  db.close();
}
console.log(`Snapshot backup: ${dir}`);
