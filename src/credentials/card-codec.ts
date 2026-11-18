import { isUtf8 } from 'node:buffer'

// The index plus one is the type code on the card.
const credentialTypes = ['student', 'teacher', 'book'] as const

export type CredentialType = (typeof credentialTypes)[number]

export interface CredentialIdentifier {
    type: CredentialType
    identifier: string
}

export type CardPayload =
    | { version: 1; keyId: number; userId: string }
    | ({ version: 2; keyId: number } & CredentialIdentifier)

export function isCredentialType(value: unknown): value is CredentialType {
    return credentialTypes.some((type) => type === value)
}

export class InvalidIdentifierError extends Error {}

const identifierFormats = {
    student: /^[0-9]{8}$/u,
    teacher: /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/u,
    book: /^[A-Z0-9]{3}-[0-9]{3}-[0-9]{4}-[0-9]{2}$/u,
}

function validateIdentifier(type: CredentialType, identifier: string): void {
    if (!identifierFormats[type].test(identifier)) {
        throw new InvalidIdentifierError('El identificador no corresponde al tipo de credencial')
    }
}

export function encodeCard(payload: CardPayload): Buffer {
    const { keyId } = payload
    if (!Number.isInteger(keyId) || keyId < 0 || keyId > 255) {
        throw new Error('keyId debe caber en un byte')
    }

    if (payload.version === 1) {
        validateIdentifier('student', payload.userId)
        const bytes = Buffer.alloc(6)
        bytes[0] = 1
        bytes[1] = keyId
        bytes.writeUInt32BE(Number(payload.userId), 2)
        return bytes
    }

    if (payload.version !== 2 || !isCredentialType(payload.type)) {
        throw new Error('Versión o tipo de credencial desconocido')
    }
    validateIdentifier(payload.type, payload.identifier)
    const text = Buffer.from(payload.identifier, 'utf8')
    const typeCode = credentialTypes.indexOf(payload.type) + 1
    return Buffer.concat([Buffer.from([2, keyId, typeCode, text.length]), text])
}

export function decodeCard(data: Buffer): CardPayload {
    const [version, keyId, typeCode, length] = data
    if (version === 1) {
        if (data.length !== 6) throw new Error('La versión 1 debe contener 6 bytes')
        const userId = data.readUInt32BE(2).toString().padStart(8, '0')
        validateIdentifier('student', userId)
        return { version, keyId, userId }
    }

    if (version !== 2) throw new Error('Versión de credencial desconocida')
    if (data.length !== 4 + length) throw new Error('Longitud de credencial inválida')
    const type = credentialTypes[typeCode - 1]
    if (!type) throw new Error('Tipo de credencial desconocido')
    const text = data.subarray(4)
    if (!isUtf8(text)) throw new Error('Identificador UTF-8 inválido')
    const identifier = text.toString('utf8')
    validateIdentifier(type, identifier)
    return { version, keyId, type, identifier }
}
