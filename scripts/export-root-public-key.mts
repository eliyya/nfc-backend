import { createHash, createPrivateKey, createPublicKey } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

async function main() {
    const { values } = parseArgs({
        options: {
            out: { type: 'string', default: 'keys/root-public.pem' },
            format: { type: 'string', default: 'pem' },
            force: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    })

    if (values.help) {
        console.log(`Exporta la raíz pública existente usando DATABASE_URL.

pnpm keys:export-root [--out keys/root-public.pem] [--format pem|base64] [--force]

--out -       Escribe únicamente la clave pública en la salida estándar.
--force       Permite reemplazar un archivo que contiene otra clave.
--format      PEM por defecto; base64 devuelve SPKI DER como en Android y Go.

No crea ni rota claves. Configura la conexión a Neon para exportar la raíz de producción.`)
        return
    }

    if (values.format !== 'pem' && values.format !== 'base64') {
        throw new Error('--format debe ser pem o base64')
    }
    if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en tu .env')

    // Read directly: RootKeyService.getRootKey() can generate a missing root.
    const { createDatabase } = await import('../src/database.ts')
    const database = createDatabase()
    try {
        const row = await database.orm.public.RootKey.whereUnique({ keyId: 1 }).first()
        if (!row) throw new Error('La base configurada no contiene una raíz. No se creó ninguna')

        const privateKey = createPrivateKey(row.privateKeyPem)
        if (privateKey.asymmetricKeyType !== 'ed25519') {
            throw new Error('La raíz almacenada no es Ed25519')
        }
        const publicKey = createPublicKey(privateKey)
        const der = publicKey.export({ type: 'spki', format: 'der' })
        const content =
            values.format === 'pem'
                ? publicKey.export({ type: 'spki', format: 'pem' }).toString()
                : `${der.toString('base64')}\n`

        if (values.out === '-') {
            process.stdout.write(content)
        } else {
            const output = resolve(values.out)
            await mkdir(dirname(output), { recursive: true })
            try {
                await writeFile(output, content, { flag: 'wx' })
            } catch (error: unknown) {
                if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') {
                    throw error
                }
                const existing = await readFile(output, 'utf8')
                if (existing !== content) {
                    if (!values.force) {
                        throw new Error('El archivo contiene otra clave. Usa otro --out o --force')
                    }
                    await writeFile(output, content)
                }
            }
            console.error(`Clave pública exportada: ${output}`)
        }
        console.error(`SHA-256 (SPKI DER): ${createHash('sha256').update(der).digest('hex')}`)
    } finally {
        await database.close()
    }
}

main().catch((error: unknown) => {
    // The message may originate from a driver. Redact URLs and any PEM material.
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error(
        message
            .replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, '[conexión PostgreSQL]')
            .replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, '[clave omitida]'),
    )
    process.exitCode = 1
})
