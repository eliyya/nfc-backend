import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import { InvalidIdentifierError, isCredentialType } from './card-codec.js'
import { CredentialsService } from './credentials.service.js'

interface IssueRequest {
    userId?: unknown
    type?: unknown
    identifier?: unknown
}

function parseRequest(body: IssueRequest | null) {
    const { userId, type, identifier } = body ?? {}
    if (typeof userId === 'string' && type === undefined && identifier === undefined) {
        return userId
    }
    if (userId === undefined && isCredentialType(type) && typeof identifier === 'string') {
        return { type, identifier }
    }
    throw new BadRequestException('Envía type e identifier para v2, o userId para v1')
}

@Controller('credentials')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) {}

    @Post()
    issue(@Body() body: IssueRequest | null) {
        const request = parseRequest(body)
        try {
            const credential = this.credentialsService.issue(request)
            return { credential: credential.toString('base64') }
        } catch (error) {
            if (error instanceof InvalidIdentifierError)
                throw new BadRequestException(error.message)
            throw error
        }
    }
}
