/**
 * ServerCredential Model
 *
 * Stores sensitive API credentials (OAuth tokens, API keys) in MongoDB
 * with AES-256-CBC encryption at rest.
 *
 * WARNING: This model stores credentials encrypted, but the encryption key
 * (CREDENTIAL_ENCRYPTION_KEY) must be set as an environment variable.
 * If the key is lost, stored credentials cannot be decrypted.
 */

import mongoose from "mongoose"
import crypto from "crypto"

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-CBC)
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-cbc"
const IV_LENGTH = 16

/**
 * Derive a 32-byte key from the environment variable using SHA-256.
 * This ensures we always have a valid-length key regardless of input.
 */
function getEncryptionKey() {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY environment variable is not set. " +
      "Run: openssl rand -hex 32 and set it in .env"
    )
  }
  // Hash to guarantee 32 bytes
  return crypto.createHash("sha256").update(raw).digest()
}

/**
 * Encrypt a plaintext string.
 * Returns hex-encoded "iv:ciphertext".
 */
function encrypt(text) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

/**
 * Decrypt a string previously encrypted with encrypt().
 */
function decrypt(encoded) {
  const key = getEncryptionKey()
  const parts = encoded.split(":")
  if (parts.length < 2) throw new Error("Invalid encrypted payload format")
  const iv = Buffer.from(parts.shift(), "hex")
  const encryptedText = parts.join(":")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const serverCredentialSchema = new mongoose.Schema(
  {
    // Unique identifier for the credential set, e.g. "youtube-oauth"
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Encrypted JSON blob containing tokens / secrets
    encryptedData: {
      type: String,
      required: true,
    },

    // Human-readable description of what this credential is used for
    description: { type: String, default: "" },

    // Timestamp of last successful refresh / use
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// ---------------------------------------------------------------------------
// Statics
// ---------------------------------------------------------------------------

/**
 * Safely store a credential object.
 * @param {string} name - Unique credential name (e.g. "youtube-oauth")
 * @param {object} data - The credential data to encrypt (e.g. OAuth tokens)
 * @param {string} [description] - Optional description
 */
serverCredentialSchema.statics.store = async function (name, data, description = "") {
  const encryptedData = encrypt(JSON.stringify(data))
  return this.findOneAndUpdate(
    { name },
    { name, encryptedData, description, lastUsedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

/**
 * Retrieve and decrypt a credential object.
 * @param {string} name - Unique credential name
 * @returns {object|null} Decrypted credential data, or null if not found.
 */
serverCredentialSchema.statics.retrieve = async function (name) {
  const doc = await this.findOne({ name }).lean()
  if (!doc) return null
  try {
    return JSON.parse(decrypt(doc.encryptedData))
  } catch {
    // If decryption fails (e.g. key changed), return null
    return null
  }
}

/**
 * Update the lastUsedAt timestamp without fetching the full document.
 */
serverCredentialSchema.statics.touch = async function (name) {
  return this.updateOne({ name }, { $set: { lastUsedAt: new Date() } })
}

/**
 * Delete a stored credential set.
 */
serverCredentialSchema.statics.remove = async function (name) {
  return this.deleteOne({ name })
}

const ServerCredential = mongoose.model("ServerCredential", serverCredentialSchema)

export default ServerCredential
