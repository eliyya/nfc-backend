import { DatabaseService } from '../src/keys/database.service.js'
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import { AppModule } from './../src/app.module.js'

describe('AppController (e2e)', () => {
    let app: INestApplication<App>
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')

    const root = generateKeyPairSync('ed25519')

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(DatabaseService)
            .useValue({
                getIssuerKeys: async () => [
                    {
                        keyId: 1,
                        privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
                        status: 'ACTIVE',
                        createdAt: 1700000000,
                    },
                ],
                getRootKey: async () => root.privateKey.export({ type: 'pkcs8', format: 'pem' }),
            })
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    it('/ (GET)', () => {
        return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!')
    })

    it('/credentials (POST) firma una tarjeta con la llave de la base', async () => {
        const response = await request(app.getHttpServer())
            .post('/credentials')
            .send({ userId: '00123456' })
            .expect(201)
        const card = Buffer.from(response.body.credential, 'base64')
        expect(card.length).toBe(70)
        expect(card.subarray(0, 6)).toEqual(Buffer.from([1, 1, 0, 1, 226, 64]))
        expect(verify(null, card.subarray(0, 6), publicKey, card.subarray(6))).toBe(true)
    })

    it('/keys (GET) devuelve un manifiesto firmado por la raíz con la llave emisora', async () => {
        const response = await request(app.getHttpServer()).get('/keys').expect(200)
        const bytes = Buffer.from(response.body.manifest, 'base64')
        expect(
            verify(null, bytes, root.publicKey, Buffer.from(response.body.signature, 'base64')),
        ).toBe(true)
        const manifest = JSON.parse(bytes.toString('utf8'))
        expect(manifest.version).toBe(1)
        expect(manifest.keys[0]).toMatchObject({
            key_id: 1,
            status: 'ACTIVE',
            created_at: 1700000000,
        })
        const published = createPublicKey({
            key: Buffer.from(manifest.keys[0].public_key, 'base64'),
            type: 'spki',
            format: 'der',
        })
        expect(published.equals(publicKey)).toBe(true)
        expect(bytes.toString()).not.toContain('PRIVATE')
    })

    afterEach(async () => {
        await app.close()
    })
})
