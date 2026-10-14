import { Module } from '@nestjs/common'
import { IssuerKeyService } from './issuer-key.service.js'

@Module({
    providers: [IssuerKeyService],
    exports: [IssuerKeyService],
})
export class KeysModule {}
