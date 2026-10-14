import { Module } from '@nestjs/common'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { CredentialsModule } from './credentials/credentials.module.js'

@Module({
    imports: [CredentialsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
