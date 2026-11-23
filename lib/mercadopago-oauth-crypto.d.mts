export type OAuthStateData = { negocioId: string; userId: string; state: string; verifier: string; expiresAt: number }
export function encryptCredentialValue(value: string, encodedKey: string, iv?: Buffer): string
export function decryptCredentialValue(value: string, encodedKey: string): string
export function createSignedOAuthState(negocioId: string, userId: string, secret: string, now?: number): { cookie: string; state: string; challenge: string }
export function readSignedOAuthState(cookie: string, suppliedState: string, secret: string, now?: number): OAuthStateData | null
