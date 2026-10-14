import { Module } from '@nestjs/common'
import { KeysModule } from '../keys/keys.module.js'
import { CredentialsService } from './credentials.service.js'
import { CredentialsController } from './credentials.controller.js'

@Module({
    imports: [KeysModule],
    providers: [CredentialsService],
    exports: [CredentialsService],
    controllers: [CredentialsController],
})
export class CredentialsModule {}
