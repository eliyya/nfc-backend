export interface CardPayload {
    version: number
    keyId: number
    userId: string
}

export function encodeCard(payload: CardPayload): Buffer {
    if (!/^\d{8}$/.test(payload.userId)) {
        throw new Error('userId debe contener exactamente 8 dígitos')
    }

    if (payload.version < 0 || payload.version > 255) {
        throw new Error('version debe caber en un byte')
    }

    if (payload.keyId < 0 || payload.keyId > 255) {
        throw new Error('keyId debe caber en un byte')
    }

    const userId = Number(payload.userId)

    const buffer = Buffer.alloc(6)

    buffer[0] = payload.version
    buffer[1] = payload.keyId

    buffer.writeUInt32BE(userId, 2)

    return buffer
}

export function decodeCard(data: Buffer): CardPayload {
    if (data.length !== 6) {
        throw new Error('CardPayload debe contener exactamente 6 bytes')
    }

    const version = data[0]
    const keyId = data[1]

    const userId = data.readUInt32BE(2)

    return {
        version,
        keyId,
        userId: userId.toString().padStart(8, '0'),
    }
}
