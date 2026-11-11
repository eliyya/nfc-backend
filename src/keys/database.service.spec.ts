import { createPrivateKey } from 'node:crypto'
import { DatabaseService } from './database.service.js'

const { first, createAndCount, close, all, rootFirst, rootCreate } = vi.hoisted(() => ({
    first: vi.fn(),
    createAndCount: vi.fn(),
    close: vi.fn(),
    all: vi.fn(),
    rootFirst: vi.fn(),
    rootCreate: vi.fn(),
}))
vi.mock('../database.js', () => ({
    createDatabase: () => ({
        orm: {
            public: {
                RootKey: { whereUnique: () => ({ first: rootFirst }), createAndCount: rootCreate },
                IssuerKey: {
                    whereUnique: () => ({ first }),
                    createAndCount,
                    all,
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

describe('DatabaseService manifest keys', () => {
    beforeEach(() => vi.resetAllMocks())

    it('inicializa la llave emisora cuando no hay ninguna y publica su fecha', async () => {
        all.mockResolvedValueOnce([]).mockResolvedValueOnce([
            {
                keyId: 1,
                privateKeyPem: 'pem',
                status: 'ACTIVE',
                createdAt: '2026-11-11 00:00:00+00',
            },
        ])
        first.mockResolvedValueOnce(null).mockResolvedValueOnce({ privateKeyPem: 'pem' })
        const rows = await new DatabaseService().getIssuerKeys()
        expect(createAndCount).toHaveBeenCalledOnce()
        expect(rows[0].createdAt).toBe(1794355200)
    })

    it('reutiliza la raíz existente', async () => {
        rootFirst.mockResolvedValue({ privateKeyPem: 'existing-root' })
        expect(await new DatabaseService().getRootKey()).toBe('existing-root')
        expect(rootCreate).not.toHaveBeenCalled()
    })

    it('usa la raíz persistida por otra instancia durante la inicialización', async () => {
        rootFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ privateKeyPem: 'winning-root' })
        rootCreate.mockResolvedValue(0)
        expect(await new DatabaseService().getRootKey()).toBe('winning-root')
        expect(
            createPrivateKey(rootCreate.mock.calls[0][0][0].privateKeyPem).asymmetricKeyType,
        ).toBe('ed25519')
        expect(rootCreate.mock.calls[0][1]).toEqual({ onConflict: 'skip', conflictOn: ['keyId'] })
    })
})
