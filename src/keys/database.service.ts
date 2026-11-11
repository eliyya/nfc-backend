import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { generateKeyPairSync } from 'node:crypto'
import { createDatabase } from '../database.js'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
    private readonly database = createDatabase()

    async getIssuerKey(keyId: number): Promise<string> {
        const keys = this.database.orm.public.IssuerKey
        const existing = await keys.whereUnique({ keyId }).first()
        if (existing) return existing.privateKeyPem

        const { privateKey } = generateKeyPairSync('ed25519')
        // PostgreSQL decides which instance wins; never overwrite an existing key.
        await keys.createAndCount(
            [
                {
                    keyId,
                    privateKeyPem: privateKey
                        .export({
                            type: 'pkcs8',
                            format: 'pem',
                        })
                        .toString(),
                },
            ],
            { onConflict: 'skip', conflictOn: ['keyId'] },
        )
        // Always use the persisted key, including when another instance inserted it.
        const persisted = await keys.whereUnique({ keyId }).first()
        if (!persisted) throw new Error(`No se pudo inicializar la llave emisora ${keyId}`)
        return persisted.privateKeyPem
    }

    async getIssuerKeys(): Promise<
        Array<{ keyId: number; privateKeyPem: string; status: string; createdAt: number }>
    > {
        const keys = this.database.orm.public.IssuerKey
        let rows = await keys.all()
        if (!rows.length) {
            await this.getIssuerKey(1)
            rows = await keys.all()
        }
        return rows.map((row) => ({
            keyId: row.keyId,
            privateKeyPem: row.privateKeyPem,
            status: row.status,
            createdAt: Math.floor(
                new Date(
                    row.createdAt.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'),
                ).getTime() / 1000,
            ),
        }))
    }

    async getRootKey(): Promise<string> {
        const keys = this.database.orm.public.RootKey
        const existing = await keys.whereUnique({ keyId: 1 }).first()
        if (existing) return existing.privateKeyPem
        const { privateKey } = generateKeyPairSync('ed25519')
        await keys.createAndCount(
            [
                {
                    keyId: 1,
                    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
                },
            ],
            { onConflict: 'skip', conflictOn: ['keyId'] },
        )
        const persisted = await keys.whereUnique({ keyId: 1 }).first()
        if (!persisted) throw new Error('No se pudo inicializar la llave raíz')
        return persisted.privateKeyPem
    }

    async onModuleDestroy(): Promise<void> {
        await this.database.close()
    }
}
