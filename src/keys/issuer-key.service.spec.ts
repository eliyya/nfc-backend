import { generateKeyPairSync, verify } from 'node:crypto'
import { IssuerKeyService } from './issuer-key.service.js'
import { DatabaseService } from './database.service.js'

const issuer = (privateKeyPem: string, keyId = 1, status = 'ACTIVE') => ({
    privateKeyPem,
    keyId,
    status,
    createdAt: 1700000000,
})

describe('IssuerKeyService', () => {
    it('firma con la llave persistida y conserva el formato', async () => {
        const { privateKey, publicKey } = generateKeyPairSync('ed25519')
        const getIssuerKeys = vi
            .fn()
            .mockResolvedValue([
                issuer(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()),
            ])
        const service = new IssuerKeyService({ getIssuerKeys } as unknown as DatabaseService)
        await service.onModuleInit()
        expect(getIssuerKeys).toHaveBeenCalledOnce()
        const payload = Buffer.from([1, 1, 0, 0, 0, 1])
        expect(verify(null, payload, publicKey, service.signData(payload))).toBe(true)
        expect(service.getPublicKeyBase64()).toBe(
            publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
        )
    })

    it('publica llaves anteriores y firma con la activa más reciente', async () => {
        const pem = generateKeyPairSync('ed25519')
            .privateKey.export({ type: 'pkcs8', format: 'pem' })
            .toString()
        const service = new IssuerKeyService({
            getIssuerKeys: async () => [issuer(pem, 1, 'ROTATED'), issuer(pem, 2)],
        } as unknown as DatabaseService)
        await service.onModuleInit()
        expect(service.getKeyId()).toBe(2)
        expect(service.getKeys()).toEqual([
            { key_id: 1, status: 'ROTATED', created_at: 1700000000 },
            { key_id: 2, status: 'ACTIVE', created_at: 1700000000 },
        ])
        expect(service.getPublicKeyBase64(1)).toBe(service.getPublicKeyBase64(2))
    })

    it('rechaza llaves que no sean Ed25519', async () => {
        const pem = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
            .privateKey.export({ type: 'pkcs8', format: 'pem' })
            .toString()
        const service = new IssuerKeyService({
            getIssuerKeys: async () => [issuer(pem)],
        } as unknown as DatabaseService)
        await expect(service.onModuleInit()).rejects.toThrow('Ed25519')
    })

    it('no firma con una llave revocada', async () => {
        const service = new IssuerKeyService({
            getIssuerKeys: async () => [issuer('', 1, 'REVOKED')],
        } as unknown as DatabaseService)
        await expect(service.onModuleInit()).rejects.toThrow('activa')
    })
})
