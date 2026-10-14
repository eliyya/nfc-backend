import { Module } from '@nestjs/common'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { KeysModule } from './keys/keys.module.js'
import { CredentialsModule } from './credentials/credentials.module.js'

@Module({
    imports: [KeysModule, CredentialsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
