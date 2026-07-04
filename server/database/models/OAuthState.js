/**
 * OAuthState Model
 *
 * Stores OAuth state nonces in MongoDB with a TTL index for automatic
 * expiration. This replaces the previous in-memory Map that did not
 * scale across multiple server instances.
 *
 * Security:
 *  - States are one-time use (deleted after validation)
 *  - TTL index automatically cleans up expired entries
 *  - No sensitive data stored — only state/verifier pairs
 */

import mongoose from "mongoose"

const oauthStateSchema = new mongoose.Schema(
  {
    // Cryptographically random state nonce (unique constraint creates an index)
    state: {
      type: String,
      required: true,
      unique: true,
    },

    // PKCE verifier (if used)
    verifier: {
      type: String,
      required: true,
    },

    // TTL index — MongoDB automatically deletes documents when they expire
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: doc removed when expiresAt is reached
    },
  },
  { timestamps: true }
)

/**
 * Store an OAuth state nonce.
 * @param {string} state - The random state nonce
 * @param {string} verifier - PKCE verifier
 * @param {number} ttlMs - Time-to-live in milliseconds (default: 10 min)
 */
oauthStateSchema.statics.store = async function (state, verifier, ttlMs = 10 * 60 * 1000) {
  return this.create({
    state,
    verifier,
    expiresAt: new Date(Date.now() + ttlMs),
  })
}

/**
 * Validate and consume an OAuth state nonce (one-time use).
 * @param {string} state - The state nonce to validate
 * @returns {Promise<boolean>} Whether the state is valid
 */
oauthStateSchema.statics.validateAndConsume = async function (state) {
  if (!state || typeof state !== "string") return false

  const doc = await this.findOneAndDelete({ state }).lean()
  if (!doc) return false

  // Check expiration server-side as well (belt-and-suspenders with TTL)
  if (doc.expiresAt < new Date()) {
    return false
  }

  return true
}

/**
 * Clean up all expired states (manual cleanup, though TTL handles it).
 */
oauthStateSchema.statics.cleanup = async function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } })
}

const OAuthState = mongoose.model("OAuthState", oauthStateSchema)

export default OAuthState
