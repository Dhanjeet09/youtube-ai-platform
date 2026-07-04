import { log as logger } from "./logger.js"
import { isPermanent } from "./errorClassifier.js"

export const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000, name = "operation" } = options
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (isPermanent(error)) {
        logger("WARN", `[RETRY] ${name} permanent error, not retrying`, { error: error.message })
        throw error
      }
      if (attempt === maxRetries) throw error
      const delay = baseDelay * Math.pow(2, attempt - 1)
      logger("WARN", `[RETRY] ${name} attempt ${attempt}/${maxRetries} failed`, { delay, error: error.message })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
