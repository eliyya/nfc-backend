import { Injectable, OnModuleInit } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { DatabaseService } from './database.service.js'

@Injectable()
export class RootKeyService implements OnModuleInit {
    private privateKey: KeyObject
    private publicKey: KeyObject

    constructor(private readonly database: DatabaseService) {}

    async onModuleInit(): Promise<void> {
        this.privateKey = createPrivateKey(await this.database.getRootKey())
        if (this.privateKey.asymmetricKeyType !== 'ed25519')
            throw new Error('La llave raíz debe ser Ed25519')
        this.publicKey = createPublicKey(this.privateKey)
    }

    sign(data: Buffer): Buffer {
        return sign(null, data, this.privateKey)
    }
    getPublicKeyBase64(): string {
        return this.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    }
}
