import { Injectable } from '@nestjs/common'
import { IssuerKeyService } from '../keys/issuer-key.service.js'
import { CardPayload, encodeCard } from './card-codec.js'

@Injectable()
export class CredentialsService {
    constructor(private readonly issuerKeyService: IssuerKeyService) {}

    issue(userId: string): Buffer {
        const payload: CardPayload = {
            version: 1,
            keyId: this.issuerKeyService.getKeyId(),
            userId,
        }

        const payloadBytes = encodeCard(payload)

        const signature = this.issuerKeyService.signData(payloadBytes)

        return Buffer.concat([payloadBytes, signature])
    }
}
