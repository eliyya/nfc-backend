#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/96ed735ec5a9b8f8f1c9a6ec357ccdb0c150c59d1876646149478212cd9166f5/contract';
import startContract from '../../snapshots/96ed735ec5a9b8f8f1c9a6ec357ccdb0c150c59d1876646149478212cd9166f5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/eeab4a7b951da4f61283666b3f6949e942e5b928ee0d8fb4727a45f7a8729b30/contract';
import endContract from '../../snapshots/eeab4a7b951da4f61283666b3f6949e942e5b928ee0d8fb4727a45f7a8729b30/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'root_keys',
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
      this.addColumn({
        schema: 'public',
        table: 'issuer_keys',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
