import { Injectable } from '@nestjs/common'
import { RootKeyService } from './root-key.service.js'
import { IssuerKeyService } from './issuer-key.service.js'
import { KeyManifest, SignedKeyManifest } from './key-manifest.js'

@Injectable()
export class KeyManifestService {
    constructor(
        private readonly rootKeyService: RootKeyService,
        private readonly issuerKeyService: IssuerKeyService,
    ) {}

    create(): SignedKeyManifest {
        const manifest: KeyManifest = {
            version: 1,
            keys: this.issuerKeyService.getKeys().map((key) => ({
                key_id: key.key_id,
                public_key: this.issuerKeyService.getPublicKeyBase64(
                    key.key_id,
                ),

                status: key.status,
                created_at: key.created_at,
            })),
        }

        const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8')

        const signature = this.rootKeyService.sign(manifestBytes)

        return {
            manifest: manifestBytes.toString('base64'),

            signature: signature.toString('base64'),
        }
    }
}
