import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (keyEnv) {
    const buffer = Buffer.from(keyEnv, "base64");
    if (buffer.length !== 32) {
      throw new Error("CREDENTIALS_ENCRYPTION_KEY musi być 32 bajtami zakodowanymi w base64.");
    }
    return buffer;
  }

  const fallbackSecret = process.env.CLIENTS_API_SECRET?.trim();
  if (!fallbackSecret && process.env.NODE_ENV === "production") {
    throw new Error("Ustaw CREDENTIALS_ENCRYPTION_KEY w środowisku produkcyjnym.");
  }

  return scryptSync(fallbackSecret ?? "dev-credentials-key", "rentgen-system-credentials", 32);
}

export function encryptCredentialSecret(plaintext: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptCredentialSecret(ciphertext: string, iv: string, tag: string) {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
