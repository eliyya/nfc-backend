export type KeyStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED'

export interface IssuerPublicKey {
    key_id: number
    public_key: string
    status: KeyStatus
    created_at: number
}

export interface KeyManifest {
    version: number
    keys: IssuerPublicKey[]
}

export interface SignedKeyManifest {
    manifest: string
    signature: string
}
