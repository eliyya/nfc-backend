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

    async onModuleDestroy(): Promise<void> {
        await this.database.close()
    }
}
