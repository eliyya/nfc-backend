import { readFile } from 'node:fs/promises'
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto'
import postgres from '@prisma/orm-postgres/runtime'
import { contractFromJson } from '@prisma/orm-postgres/static'
import contract from '../src/prisma/contract.json' with { type: 'json' }

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria')
const database = postgres({
    contract: contractFromJson(contract),
    url: process.env.DATABASE_URL,
})
try {
    const existing = await database.orm.public.IssuerKey.whereUnique({
        keyId: 1,
    }).first()
    if (existing) {
        console.log('La llave #1 ya existe; no se modificó.')
    } else {
        let privateKey
        if (process.argv.includes('--generate')) {
            privateKey = generateKeyPairSync('ed25519').privateKey
        } else {
            privateKey = createPrivateKey(
                await readFile(new URL('../keys/issuer-1-private.pem', import.meta.url), 'utf8'),
            )
            const publicKey = createPublicKey(
                await readFile(new URL('../keys/issuer-1-public.pem', import.meta.url), 'utf8'),
            )
            if (!createPublicKey(privateKey).equals(publicKey))
                throw new Error('Las llaves locales no coinciden')
        }
        if (privateKey.asymmetricKeyType !== 'ed25519')
            throw new Error('Se requiere una llave Ed25519')
        await database.orm.public.IssuerKey.create({
            keyId: 1,
            privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        })
        console.log('Llave #1 guardada en PostgreSQL.')
    }
} finally {
    await database.close()
}
