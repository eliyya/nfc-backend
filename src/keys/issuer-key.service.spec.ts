import { generateKeyPairSync, verify } from 'node:crypto'
import { IssuerKeyService } from './issuer-key.service.js'
import { DatabaseService } from './database.service.js'

describe('IssuerKeyService', () => {
    it('firma con la llave persistida y conserva el formato de credenciales', async () => {
        const { privateKey, publicKey } = generateKeyPairSync('ed25519')
        const getIssuerKey = vi
            .fn()
            .mockResolvedValue(privateKey.export({ type: 'pkcs8', format: 'pem' }))
        const service = new IssuerKeyService({
            getIssuerKey,
        } as unknown as DatabaseService)
        await service.onModuleInit()
        const payload = Buffer.from([1, 1, 0, 0, 0, 1])
        expect(getIssuerKey).toHaveBeenCalledWith(1)
        expect(verify(null, payload, publicKey, service.signData(payload))).toBe(true)
        expect(service.getPublicKeyBase64()).toBe(
            publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
        )
    })

    it('rechaza llaves que no sean Ed25519', async () => {
        const { privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
        })
        const service = new IssuerKeyService({
            getIssuerKey: async () => privateKey.export({ type: 'pkcs8', format: 'pem' }),
        } as unknown as DatabaseService)
        await expect(service.onModuleInit()).rejects.toThrow('Ed25519')
    })
})
