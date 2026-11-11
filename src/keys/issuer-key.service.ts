import { Injectable, OnModuleInit } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { DatabaseService } from './database.service.js'
import type { KeyStatus } from './key-manifest.js'

@Injectable()
export class IssuerKeyService implements OnModuleInit {
    private keyId: number
    private privateKey: KeyObject
    private readonly keys = new Map<
        number,
        { publicKey: KeyObject; status: KeyStatus; created_at: number }
    >()

    constructor(private readonly database: DatabaseService) {}

    async onModuleInit(): Promise<void> {
        const issuers = await this.database.getIssuerKeys()
        const active = issuers
            .filter((key) => key.status === 'ACTIVE')
            .sort((a, b) => b.keyId - a.keyId)[0]
        if (!active) throw new Error('No hay una llave emisora activa')
        this.keyId = active.keyId
        this.privateKey = createPrivateKey(active.privateKeyPem)
        for (const key of issuers) {
            const privateKey = createPrivateKey(key.privateKeyPem)
            if (privateKey.asymmetricKeyType !== 'ed25519')
                throw new Error('La llave emisora debe ser Ed25519')
            if (!['ACTIVE', 'ROTATED', 'REVOKED'].includes(key.status))
                throw new Error('Estado de llave inválido')
            this.keys.set(key.keyId, {
                publicKey: createPublicKey(privateKey),
                status: key.status as KeyStatus,
                created_at: key.createdAt,
            })
        }
    }

    getKeyId(): number {
        return this.keyId
    }
    signData(data: Buffer): Buffer {
        return sign(null, data, this.privateKey)
    }
    getPublicKey(): KeyObject {
        return this.keys.get(this.keyId)!.publicKey
    }
    getPublicKeyBase64(keyId = this.keyId): string {
        const key = this.keys.get(keyId)
        if (!key) throw new Error(`No existe la llave emisora ${keyId}`)
        return key.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    }
    getKeys(): Array<{ key_id: number; status: KeyStatus; created_at: number }> {
        return [...this.keys].map(([key_id, key]) => ({
            key_id,
            status: key.status,
            created_at: key.created_at,
        }))
    }
}
