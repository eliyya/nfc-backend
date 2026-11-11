import { DatabaseService } from '../src/keys/database.service.js'
import { generateKeyPairSync, verify } from 'node:crypto'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import { AppModule } from './../src/app.module.js'

describe('AppController (e2e)', () => {
    let app: INestApplication<App>
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(DatabaseService)
            .useValue({
                getIssuerKey: async () => privateKey.export({ type: 'pkcs8', format: 'pem' }),
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

    afterEach(async () => {
        await app.close()
    })
})
