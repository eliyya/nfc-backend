import { Injectable } from '@nestjs/common'
import { createPrivateKey, createPublicKey, KeyObject, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

@Injectable()
export class RootKeyService {
    private readonly privateKey: KeyObject
    private readonly publicKey: KeyObject

    constructor() {
        const privateKeyPem = readFileSync(
            join(process.cwd(), 'keys', 'root-private.pem'),
            'utf8',
        )

        const publicKeyPem = readFileSync(
            join(process.cwd(), 'keys', 'root-public.pem'),
            'utf8',
        )

        this.privateKey = createPrivateKey(privateKeyPem)

        this.publicKey = createPublicKey(publicKeyPem)
    }

    sign(data: Buffer): Buffer {
        return sign(null, data, this.privateKey)
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
