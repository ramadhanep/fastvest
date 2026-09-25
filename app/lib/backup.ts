export type BackupErrorCode = 'weakPass' | 'wrongPass' | 'corrupt' | 'format'

export class BackupError extends Error {
  code: BackupErrorCode
  constructor(code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

const MAGIC = 'FV1B1-'
const SALT_BYTES = 16
const IV_BYTES = 12
const PBKDF2_ITERATIONS = 250_000
export const MIN_PASSPHRASE = 4

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([asArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize('NFKC')
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizePassphrase(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: asArrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Strips whitespace, punctuation and zero-width chars that chat apps inject while copying. */
export function normalizeCode(input: string): string {
  return input.replace(/[^\w-]/g, '')
}

export function isBackupCode(input: string): boolean {
  return normalizeCode(input).startsWith(MAGIC)
}

export async function encodeBackup(payload: unknown, passphrase: string): Promise<string> {
  if (normalizePassphrase(passphrase).trim().length < MIN_PASSPHRASE) {
    throw new BackupError('weakPass', `Passphrase must be at least ${MIN_PASSPHRASE} characters.`)
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt)
  const compressed = await gzip(JSON.stringify(payload))
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asArrayBuffer(iv) }, key, asArrayBuffer(compressed)),
  )
  const packed = new Uint8Array(SALT_BYTES + IV_BYTES + sealed.length)
  packed.set(salt, 0)
  packed.set(iv, SALT_BYTES)
  packed.set(sealed, SALT_BYTES + IV_BYTES)
  return MAGIC + b64urlEncode(packed)
}

export async function decodeBackup<T>(code: string, passphrase: string): Promise<T> {
  const normalized = normalizeCode(code)
  if (!normalized.startsWith(MAGIC)) throw new BackupError('format', 'Not a Fastvest backup code.')
  const packed = b64urlDecode(normalized.slice(MAGIC.length))
  if (packed.length <= SALT_BYTES + IV_BYTES + 16) throw new BackupError('corrupt', 'Backup code is truncated.')

  const key = await deriveKey(passphrase, packed.subarray(0, SALT_BYTES))
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(packed.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES)) },
      key,
      asArrayBuffer(packed.subarray(SALT_BYTES + IV_BYTES)),
    )
  } catch {
    throw new BackupError('wrongPass', 'Wrong passphrase, or the code was altered in transit.')
  }

  try {
    return JSON.parse(await gunzip(new Uint8Array(plain))) as T
  } catch {
    throw new BackupError('corrupt', 'Backup code is damaged.')
  }
}
