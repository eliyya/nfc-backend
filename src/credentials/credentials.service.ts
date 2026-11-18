import { Injectable } from '@nestjs/common'
import { IssuerKeyService } from '../keys/issuer-key.service.js'
import { encodeCard, type CredentialIdentifier } from './card-codec.js'

@Injectable()
export class CredentialsService {
    constructor(private readonly issuerKeyService: IssuerKeyService) {}

    issue(credential: string | CredentialIdentifier): Buffer {
        const keyId = this.issuerKeyService.getKeyId()
        const payload = encodeCard(
            typeof credential === 'string'
                ? { version: 1, keyId, userId: credential }
                : { version: 2, keyId, type: credential.type, identifier: credential.identifier },
        )
        return Buffer.concat([payload, this.issuerKeyService.signData(payload)])
    }
}
