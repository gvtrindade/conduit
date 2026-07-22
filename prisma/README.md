# Prisma

Prisma is used here **only to organize entities and generate DB migrations** for the
Postgres database that PowerSync replicates from. **PowerSync remains the single
runtime data-access layer** for the app — all CRUD in app code goes through
`lib/powersync/AppSchema.ts`. Do **not** import `@prisma/client` into app/runtime code.

## Layout

| Path | Purpose |
| --- | --- |
| `prisma/schema.prisma` | Single source of truth for entities (tables, columns, enums, relations). Edit this to change the DB schema. |
| `prisma.config.ts` | Prisma ORM v7 config — DB url, schema path, migrations path. |
| `prisma/migrations/` | Prisma-managed migrations (committed). |
| `prisma/migrations/0_init/migration.sql` | Baseline migration = the full current schema (mirrors the legacy `migrations/*.sql`). |
| `prisma/generated/client/` | Generated Prisma Client (git-ignored; for tooling/types only). |

## Connection

`prisma.config.ts` reads `DATABASE_URL` from `.env`. It mirrors the existing `PG_*`
vars (same Postgres PowerSync talks to):

```
DATABASE_URL="postgresql://postgres:changeme@192.168.1.10:5434/postgres"
```

> Bun auto-loads `.env`, so no `dotenv` import is needed. `process.env.DATABASE_URL ?? ""`
> is used so DB-less commands (`prisma validate`, `prisma generate`) don't fail without it.

## Baseline (one-time, against the existing DB)

The legacy hand-written SQL in `/migrations/*.sql` is already applied to the running
Postgres and is left untouched. `prisma/migrations/0_init` captures that exact state.
Register the baseline with Prisma **once** so it knows the DB is already at `0_init`:

```bash
bun run prisma:migrate:resolve --applied 0_init
```

This only writes a row to `_prisma_migrations`; it does **not** re-run any SQL.

`0_init` was generated from `schema.prisma` and normalized (`DECIMAL(65,30)` → unbounded
`NUMERIC`, `CURRENT_TIMESTAMP` → `now()`) and its foreign-key actions set to `NO ACTION`
(except `session`/`account` `ON DELETE CASCADE`) so it matches the real DB and avoids
spurious drift on the first `migrate dev`.

## Making schema changes (going forward)

1. Edit `prisma/schema.prisma`.
2. Generate + apply a new migration locally:
   ```bash
   bun run prisma:migrate:dev --name <descriptive_name>
   ```
   This needs a **shadow database**. Prisma auto-creates one on the same server if the
   `DATABASE_URL` user has `CREATEDB` permission; otherwise set
   `datasource.shadowDatabaseUrl` in `prisma.config.ts`.
3. In production / CI, apply pending migrations without a shadow DB:
   ```bash
   bun run prisma:migrate:deploy
   ```
4. Regenerate the client (for types/tooling): `bun run prisma:generate`.

> Per `AGENTS.md`: never edit an existing migration. Always add a new one via
> `migrate dev` (or hand-authored under `prisma/migrations/<ts>_<name>/`).

## PowerSync side (don't forget)

Prisma only shapes the backend Postgres. When a change adds/alters a **synced** table
or column, you must also update the PowerSync layer so clients see it:

- `lib/powersync/AppSchema.ts` — local SQLite schema (column types, new tables).
- `powersync/sync-config.yaml` — sync rules / `SELECT` queries for the new table/column.

(Do **not** modify `powersync/docker/`.)

## Other commands

| Script | What it does |
| --- | --- |
| `bun run prisma:generate` | Generate the Prisma Client (types/tooling). |
| `bun run prisma:studio` | Open Prisma Studio (DB browser). |
| `bun run prisma:db:pull` | Introspect the DB into `schema.prisma` (re-sync after manual SQL). |
| `bun run prisma:diff` | Print pending SQL between `prisma/migrations` and `schema.prisma` (needs shadow DB). |

## Notes on the legacy migrations

- `migrations/004_*.sql` has stray trailing text and `migrations/005_*.sql` drops
  `callsign` from `users` (the table is `"user"`), so that statement is a no-op.
  Both are left as-is; `0_init` reflects the **effective** final state (callsign present
  on `"user"`), which matches `lib/powersync/AppSchema.ts` and `lib/db-types.ts`.
