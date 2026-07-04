export const isTransient = (error) => {
  const transientPatterns = [
    "timeout", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET",
    "rate limit", "429", "503", "502", "too many requests",
    "socket hang up", "network"
  ]
  return transientPatterns.some(p =>
    error?.message?.toLowerCase().includes(p)
  )
}

export const isPermanent = (error) => {
  const permanentPatterns = [
    "invalid", "not found", "not available", "missing",
    "authentication", "authorization", "forbidden", "401", "403",
    "validation", "required"
  ]
  return permanentPatterns.some(p =>
    error?.message?.toLowerCase().includes(p)
  )
}
