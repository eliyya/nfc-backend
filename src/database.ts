import 'dotenv/config'
import postgres, { type PostgresClient } from '@prisma/orm-postgres/runtime'
import { contractFromJson } from '@prisma/orm-postgres/static'
import type { Contract } from './prisma/contract.d.js'
import contractJson from './prisma/contract.json' with { type: 'json' }

export function createDatabase(): PostgresClient<Contract> {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria')
    return postgres({
        contract: contractFromJson<Contract>(contractJson),
        url: process.env.DATABASE_URL,
        poolOptions: {
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 10000,
        },
    })
}
