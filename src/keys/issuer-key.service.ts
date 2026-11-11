import { Injectable, OnModuleInit } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { DatabaseService } from './database.service.js'

@Injectable()
export class IssuerKeyService implements OnModuleInit {
    private readonly keyId = 1
    private privateKey: KeyObject
    private publicKey: KeyObject

    constructor(private readonly database: DatabaseService) {}

    async onModuleInit(): Promise<void> {
        const pem = await this.database.getIssuerKey(this.keyId)
        this.privateKey = createPrivateKey(pem)
        if (this.privateKey.asymmetricKeyType !== 'ed25519') {
            throw new Error('La llave emisora debe ser Ed25519')
        }
        this.publicKey = createPublicKey(this.privateKey)
    }

    getKeyId(): number {
        return this.keyId
    }

    signData(data: Buffer): Buffer {
        return sign(null, data, this.privateKey)
    }

    getPublicKey(): KeyObject {
        return this.publicKey
    }

    getPublicKeyBase64(): string {
        return this.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    }
}
