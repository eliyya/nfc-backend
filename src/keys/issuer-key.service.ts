import { Injectable } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import issuers from '../../keys/issuers.json' with { type: 'json' }
import { KeyStatus } from './key-manifest.js'

@Injectable()
export class IssuerKeyService {
    private readonly keyId = issuers.current_key_id

    private readonly privateKey: KeyObject
    private readonly publicKey: KeyObject

    constructor() {
        const privateKeyPem = readFileSync(
            join(process.cwd(), 'keys', `issuer-${this.keyId}-private.pem`),
            'utf8',
        )

        const publicKeyPem = readFileSync(
            join(process.cwd(), 'keys', `issuer-${this.keyId}-public.pem`),
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

    getPublicKeyBase64(key: number): string {
        const publicKeyPem = readFileSync(
            join(process.cwd(), 'keys', `issuer-${key}-public.pem`),
            'utf8',
        )
        return createPublicKey(publicKeyPem)
            .export({
                type: 'spki',
                format: 'der',
            })
            .toString('base64')
    }

    getKeys(): Array<{
        key_id: number
        status: KeyStatus
        created_at: number
    }> {
        return issuers.keys.map((k) => ({
            ...k,
            status: k.status as KeyStatus,
        }))
    }
}
