import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')

mkdirSync('keys', {
    recursive: true,
})

writeFileSync(
    'keys/root-private.pem',
    privateKey.export({
        type: 'pkcs8',
        format: 'pem',
    }),
)

writeFileSync(
    'keys/root-public.pem',
    publicKey.export({
        type: 'spki',
        format: 'pem',
    }),
)

console.log('Par Ed25519 root generado')
