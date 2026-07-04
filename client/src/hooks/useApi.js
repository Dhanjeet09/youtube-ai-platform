/**
 * useApi - Custom hook that wraps API calls with consistent loading/error handling
 * 
 * Usage:
 *   const { data, loading, error, execute } = useApi(getBestNiche)
 *   // auto-fetches on mount
 *   // call execute() to re-fetch
 * 
 *   const { data, loading, error, execute } = useApi(getAnalytics, false)
 *   // does NOT auto-fetch on mount
 *   // call execute(videoId) to fetch
 */
import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(apiFunc, autoFetch = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFunc(...args)
      if (mountedRef.current) {
        setData(res.data.data ?? res.data)
        setLoading(false)
      }
      return res.data.data ?? res.data
    } catch (err) {
      if (mountedRef.current) {
        const msg = err.response?.data?.message || err.message || 'An error occurred'
        setError(msg)
        setLoading(false)
      }
      throw err
    }
  }, [apiFunc])

  useEffect(() => {
    if (autoFetch) {
      execute()
    }
  }, [autoFetch, execute])

  return { data, loading, error, execute }
}
