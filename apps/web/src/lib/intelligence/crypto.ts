import "server-only";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * AES-256-GCM encryption envelope for HotelVALORA's intelligence layer.
 *
 * Used by:
 *   - intelligence_source_credentials (T1.5 — login email + password)
 *   - intelligence_source_sessions    (T2  — Playwright storageState JSON)
 *
 * Contract:
 *   - 32-byte KEK loaded from INTELLIGENCE_SESSION_ENC_KEY env var (base64)
 *   - 12-byte random IV per encryption (unique within KEK's lifetime)
 *   - 16-byte GCM auth tag verified on decrypt
 *   - On tamper, decrypt throws — loud failure, never silent corruption
 *
 * `server-only` guards prevent any client-side bundling. The KEK is never
 * read from a NEXT_PUBLIC_* variable; if someone tries to call this from
 * a client component, the build fails.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEK_BYTES = 32;

export interface EncryptedEnvelope {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

function loadKek(): Buffer {
  const raw = process.env.INTELLIGENCE_SESSION_ENC_KEY;
  if (!raw) {
    throw new Error(
      "INTELLIGENCE_SESSION_ENC_KEY missing — generate with `openssl rand -base64 32` and set in Vercel (Production · Sensitive) + apps/web/.env.local.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEK_BYTES) {
    throw new Error(
      `INTELLIGENCE_SESSION_ENC_KEY must decode to ${KEK_BYTES} bytes (got ${key.length}). Regenerate with \`openssl rand -base64 32\`.`,
    );
  }
  return key;
}

/**
 * Encrypt a plaintext string. Returns ciphertext + iv + authTag as Buffers
 * suitable for direct insert into bytea columns via supabase-js.
 *
 * IMPORTANT: callers MUST overwrite the plaintext local after this returns.
 * V8 doesn't guarantee zeroization, but explicit reassignment is defence
 * in depth against heap-dump exfiltration.
 */
export function encryptString(plaintext: string): EncryptedEnvelope {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptString: plaintext must be a non-empty string");
  }
  const kek = loadKek();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, kek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error("encryptString: unexpected auth tag length");
  }
  return { ciphertext, iv, authTag };
}

/**
 * Decrypt. Throws on tamper detection (GCM auth-tag verification).
 *
 * Callers MUST immediately overwrite the returned plaintext after use —
 * pass it directly to the consumer (e.g., Playwright `fill()`) and discard.
 */
export function decryptString(envelope: {
  ciphertext: Buffer | Uint8Array;
  iv: Buffer | Uint8Array;
  authTag: Buffer | Uint8Array;
}): string {
  const ciphertext = toBuffer(envelope.ciphertext);
  const iv = toBuffer(envelope.iv);
  const authTag = toBuffer(envelope.authTag);
  if (iv.length !== IV_BYTES) {
    throw new Error(`decryptString: iv length must be ${IV_BYTES}`);
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(`decryptString: authTag length must be ${AUTH_TAG_BYTES}`);
  }
  const kek = loadKek();
  const decipher = createDecipheriv(ALGORITHM, kek, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

function toBuffer(input: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

/**
 * Active KEK identifier. Surfaced into the encryption envelope on writes
 * so future rotations can target old rows precisely (`WHERE enc_key_id =
 * 'v1'`). Defaults to "v1" — operator bumps via env var when rotating.
 */
export function activeKekId(): string {
  return process.env.INTELLIGENCE_SESSION_ENC_KEY_ID ?? "v1";
}
