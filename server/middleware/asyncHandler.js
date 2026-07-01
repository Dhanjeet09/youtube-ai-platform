/**
 * Wraps async route handlers to catch rejected promises and forward to Express error middleware.
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
