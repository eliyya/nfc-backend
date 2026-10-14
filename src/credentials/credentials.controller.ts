import { Body, Controller, Post } from '@nestjs/common'
import { CredentialsService } from './credentials.service.js'

@Controller('credentials')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) {}

    @Post()
    issue(@Body('userId') userId: string) {
        const credential = this.credentialsService.issue(userId)

        return {
            credential: credential.toString('base64'),
        }
    }
}
