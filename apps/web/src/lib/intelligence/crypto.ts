import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM authenticated-encryption primitives for the institutional
 * credential + session storage layer. Server-only — never importable from
 * a client component (the `import "server-only"` directive enforces this
 * at build time).
 *
 * Contract
 *   - 256-bit (32-byte) KEK read from INTELLIGENCE_SESSION_ENC_KEY env
 *   - 96-bit (12-byte) random nonce per encryption — never reused
 *   - 128-bit (16-byte) GCM authentication tag — verified on decrypt
 *   - enc_key_id tracks which KEK wrapped the row (rotation support)
 *
 * IMPORTANT — KEK lifecycle
 *   The KEK is generated once per environment with `openssl rand -base64 32`
 *   and stored in Vercel + .env.local. Lose it and every encrypted row
 *   is unrecoverable (but T1 plaintext is intact in the operator's mind;
 *   they re-provision via the admin UI).
 *
 *   Rotation: introduce INTELLIGENCE_SESSION_ENC_KEY_V2, set
 *   INTELLIGENCE_SESSION_ENC_KEY_ID=v2. New encryptions wrap with v2;
 *   old v1 rows decrypt with the legacy key (kept in
 *   INTELLIGENCE_SESSION_ENC_KEY_V1 until they're rotated out).
 */

const ALG = "aes-256-gcm" as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface EncryptedField {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encKeyId: string;
}

/**
 * Resolve the KEK for a given enc_key_id. Defaults to the active KEK
 * when no specific id requested (encrypt path). On decrypt, callers pass
 * the row's enc_key_id so legacy rows continue to decrypt during rotation.
 */
function resolveKek(encKeyId: string): Buffer {
  // Active KEK lives in INTELLIGENCE_SESSION_ENC_KEY when its id matches
  // INTELLIGENCE_SESSION_ENC_KEY_ID; legacy keys live in
  // INTELLIGENCE_SESSION_ENC_KEY_<UPPERCASE_ID>.
  const activeId = process.env.INTELLIGENCE_SESSION_ENC_KEY_ID ?? "v1";
  const raw =
    encKeyId === activeId
      ? process.env.INTELLIGENCE_SESSION_ENC_KEY
      : process.env[`INTELLIGENCE_SESSION_ENC_KEY_${encKeyId.toUpperCase()}`];
  if (!raw) {
    // Intentionally vague — the error message must not let a caller probe
    // which key ids exist by error-message timing/content.
    throw new Error("intelligence: encryption key unavailable");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `intelligence: KEK must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

/** Return the active key id used for new encryptions. */
export function getActiveEncKeyId(): string {
  return process.env.INTELLIGENCE_SESSION_ENC_KEY_ID ?? "v1";
}

/** Verify that the active KEK is configured. Throws when not. */
export function assertCryptoConfigured(): void {
  resolveKek(getActiveEncKeyId());
}

/**
 * Encrypt a UTF-8 string with the active KEK. Returns ciphertext + IV +
 * auth tag + the key id used (for storage alongside the ciphertext).
 */
export function encryptSecret(plaintext: string): EncryptedField {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("intelligence: encryptSecret requires non-empty plaintext");
  }
  const encKeyId = getActiveEncKeyId();
  const kek = resolveKek(encKeyId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, kek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  if (authTag.length !== TAG_BYTES) {
    throw new Error("intelligence: unexpected GCM auth tag length");
  }
  return { ciphertext, iv, authTag, encKeyId };
}

/**
 * Decrypt an EncryptedField back to UTF-8. Throws on auth-tag mismatch
 * (tampering signal) or wrong KEK. Callers must surface "decryption_error"
 * to the audit log when this throws.
 */
export function decryptSecret(field: {
  ciphertext: Buffer | Uint8Array;
  iv: Buffer | Uint8Array;
  authTag: Buffer | Uint8Array;
  encKeyId: string;
}): string {
  const kek = resolveKek(field.encKeyId);
  const iv = Buffer.from(field.iv);
  const authTag = Buffer.from(field.authTag);
  const ciphertext = Buffer.from(field.ciphertext);
  if (iv.length !== IV_BYTES) {
    throw new Error("intelligence: invalid IV length");
  }
  if (authTag.length !== TAG_BYTES) {
    throw new Error("intelligence: invalid auth tag length");
  }
  const decipher = createDecipheriv(ALG, kek, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
