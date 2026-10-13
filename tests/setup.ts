/**
 * Setup global vitest — nonaktifkan guard production & matikan autoseed random.
 * Memuat .env secara manual (nilai TIDAK pernah ditampilkan/log).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

(process.env as Record<string, string | undefined>).NODE_ENV =
  (process.env as Record<string, string | undefined>).NODE_ENV || "development";

