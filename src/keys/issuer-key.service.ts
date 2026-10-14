import { Injectable } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

@Injectable()
export class IssuerKeyService {
    private readonly keyId = 1

    private readonly privateKey: KeyObject
    private readonly publicKey: KeyObject

    constructor() {
        const privateKeyPem = readFileSync(
            join(process.cwd(), 'keys', 'issuer-1-private.pem'),
            'utf8',
        )

        const publicKeyPem = readFileSync(
            join(process.cwd(), 'keys', 'issuer-1-public.pem'),
            'utf8',
        )

        this.privateKey = createPrivateKey(privateKeyPem)
        this.publicKey = createPublicKey(publicKeyPem)
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
        return this.publicKey
            .export({
                type: 'spki',
                format: 'der',
            })
            .toString('base64')
    }
}
