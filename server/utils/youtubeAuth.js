/**
 * Shared YouTube authentication status utility.
 *
 * Provides a cached check for whether YouTube OAuth tokens exist in
 * MongoDB via the ServerCredential model. Used by multiple consumers
 * (poem routes, pipeline service, upload controller) to avoid duplicating
 * the DB lookup logic.
 *
 * Cache TTL: 60 seconds — short enough to reflect new token storage
 * quickly, long enough to avoid hammering MongoDB on hot paths.
 */

let _cache = null
let _cacheTime = 0
const CACHE_TTL = 60_000

/**
 * Check whether YouTube OAuth tokens are present in the credential store.
 * Results are cached for 60 seconds to reduce DB reads.
 *
 * @returns {Promise<boolean>} true if tokens exist, false otherwise
 */
export const isYouTubeAuthenticated = async () => {
  const now = Date.now()
  if (_cache !== null && now - _cacheTime < CACHE_TTL) {
    return _cache
  }

  try {
    const { default: ServerCredential } = await import(
      "../database/models/ServerCredential.js"
    )
    const tokens = await ServerCredential.retrieve("youtube-oauth")
    _cache = !!tokens
  } catch {
    // DB unavailable — treat as unauthenticated
    _cache = false
  }

  _cacheTime = now
  return _cache
}

/**
 * Force-invalidate the cached auth status.
 * Call after storing or deleting YouTube tokens to ensure immediate effect.
 */
export const clearYouTubeAuthCache = () => {
  _cache = null
  _cacheTime = 0
}
