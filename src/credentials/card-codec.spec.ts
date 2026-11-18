import { decodeCard, encodeCard, type CardPayload } from './card-codec.js'

describe('card codec', () => {
    it.each<CardPayload>([
        { version: 1, keyId: 254, userId: '00000123' },
        { version: 2, keyId: 254, type: 'student', identifier: '00000123' },
        { version: 2, keyId: 254, type: 'teacher', identifier: 'GÑDE561231GR8' },
        { version: 2, keyId: 254, type: 'book', identifier: 'RES-001-0044-01' },
    ])('recupera los datos originales de la credencial %j', (card) => {
        expect(decodeCard(encodeCard(card))).toEqual(card)
    })

    it.each([
        '',
        '030101083030313233343536', // versión desconocida
        '01010001', // v1 truncada
        '0101ffffffff', // número de control v1 fuera del rango de 8 dígitos
        '020104083030313233343536', // tipo desconocido
        '020101073030313233343536', // bytes sobrantes
        '020101093030313233343536', // texto truncado
        '02010108ff30313233343536', // UTF-8 inválido
    ])('rechaza bytes de contenido inválidos (%s)', (hex) => {
        expect(() => decodeCard(Buffer.from(hex, 'hex'))).toThrow()
    })
})
