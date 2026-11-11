#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/96ed735ec5a9b8f8f1c9a6ec357ccdb0c150c59d1876646149478212cd9166f5/contract';
import endContract from '../../snapshots/96ed735ec5a9b8f8f1c9a6ec357ccdb0c150c59d1876646149478212cd9166f5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'issuer_keys',
        columns: [
          col('created_at', 'timestamptz(6)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 6 } },
          }),
          col('key_id', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('private_key_pem', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['key_id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
