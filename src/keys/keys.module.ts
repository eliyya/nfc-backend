import { DatabaseService } from './database.service.js'
import { Module } from '@nestjs/common'
import { IssuerKeyService } from './issuer-key.service.js'

@Module({
    providers: [DatabaseService, IssuerKeyService],
    exports: [IssuerKeyService],
})
export class KeysModule {}
