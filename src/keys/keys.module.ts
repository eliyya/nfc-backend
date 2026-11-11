import { Module } from '@nestjs/common'
import { DatabaseService } from './database.service.js'
import { IssuerKeyService } from './issuer-key.service.js'
import { KeysController } from './keys.controller.js'
import { RootKeyService } from './root-key.service.js'
import { KeyManifestService } from './key-manifest.service.js'

@Module({
    controllers: [KeysController],
    providers: [DatabaseService, IssuerKeyService, RootKeyService, KeyManifestService],
    exports: [IssuerKeyService],
})
export class KeysModule {}
