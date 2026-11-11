import { Controller, Get } from '@nestjs/common'
import { KeyManifestService } from './key-manifest.service.js'

@Controller('keys')
export class KeysController {
    constructor(private readonly keyManifestService: KeyManifestService) {}

    @Get()
    getKeys() {
        return this.keyManifestService.create()
    }
}
