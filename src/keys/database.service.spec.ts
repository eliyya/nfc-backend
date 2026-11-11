import { createPrivateKey } from 'node:crypto'
import { DatabaseService } from './database.service.js'

const { first, createAndCount, close } = vi.hoisted(() => ({
    first: vi.fn(),
    createAndCount: vi.fn(),
    close: vi.fn(),
}))
vi.mock('../database.js', () => ({
    createDatabase: () => ({
        orm: {
            public: {
                IssuerKey: {
                    whereUnique: () => ({ first }),
                    createAndCount,
                },
            },
        },
        close,
    }),
}))

describe('DatabaseService issuer keys', () => {
    beforeEach(() => vi.resetAllMocks())

    it('reutiliza una llave existente sin generar ni escribir otra', async () => {
        first.mockResolvedValue({ privateKeyPem: 'existing-key' })
        expect(await new DatabaseService().getIssuerKey(1)).toBe('existing-key')
        expect(createAndCount).not.toHaveBeenCalled()
    })

    it('genera Ed25519 y devuelve la llave persistida', async () => {
        first.mockResolvedValueOnce(null).mockImplementationOnce(async () => ({
            privateKeyPem: createAndCount.mock.calls[0][0][0].privateKeyPem,
        }))
        createAndCount.mockResolvedValue(1)
        const pem = await new DatabaseService().getIssuerKey(1)
        expect(createPrivateKey(pem).asymmetricKeyType).toBe('ed25519')
        expect(createAndCount).toHaveBeenCalledWith([{ keyId: 1, privateKeyPem: pem }], {
            onConflict: 'skip',
            conflictOn: ['keyId'],
        })
    })

    it('usa la llave ganadora de otra instancia cuando hay conflicto', async () => {
        first.mockResolvedValueOnce(null).mockResolvedValueOnce({ privateKeyPem: 'winner' })
        createAndCount.mockResolvedValue(0)
        expect(await new DatabaseService().getIssuerKey(1)).toBe('winner')
    })

    it('propaga errores de escritura sin firmar con una llave temporal', async () => {
        first.mockResolvedValueOnce(null)
        createAndCount.mockRejectedValue(new Error('database unavailable'))
        await expect(new DatabaseService().getIssuerKey(1)).rejects.toThrow('database unavailable')
        expect(first).toHaveBeenCalledTimes(1)
    })
})
