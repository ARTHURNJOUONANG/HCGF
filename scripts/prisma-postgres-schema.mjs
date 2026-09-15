import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const postgres = source.replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync(join(root, "prisma", "schema.postgres.prisma"), postgres);
