/**
 * Settings - YouTube Connection, Scheduler, API Key, Danger Zone
 * Kinetic Glass design: section-based layout with toggles and masked keys
 */
import { useState, useEffect, useRef } from 'react'
import { getYouTubeAuthStatus, getYouTubeAuthUrl, getSchedulerStatus, toggleScheduler as apiToggleScheduler, getApiKeyInfo, clearCache, deleteAccount, getSchedulerSlots, getAppVersion } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import ErrorMessage from '../../components/ErrorMessage'

function Settings() {
  const [ytAuth, setYtAuth] = useState({ authenticated: false, loading: true })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [schedulerEnabled, setSchedulerEnabled] = useState(true)
  const [nextRun, setNextRun] = useState(null)
  const [schedulerLoading, setSchedulerLoading] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyInfo, setApiKeyInfo] = useState(null)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [schedulerSlots, setSchedulerSlots] = useState([])
  const [schedulerTimezone, setSchedulerTimezone] = useState('Asia/Kolkata (IST)')
  const [appVersion, setAppVersion] = useState(null)

  const popupRef = useRef(null)
  const checkClosedRef = useRef(null)
  const safetyTimeoutRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    checkYouTubeStatus()
    loadSchedulerStatus()
    loadApiKeyInfo()
    loadSchedulerSlots()
    loadAppVersion()
    return () => {
      mountedRef.current = false
      if (checkClosedRef.current) clearInterval(checkClosedRef.current)
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
      window.removeEventListener('message', handleAuthMessage)
      popupRef.current?.close()
    }
  }, [])

  const handleAuthMessage = (event) => {
    if (event.data === 'youtube-auth-success') {
      if (checkClosedRef.current) clearInterval(checkClosedRef.current)
      window.removeEventListener('message', handleAuthMessage)
      popupRef.current?.close()
      if (mountedRef.current) { checkYouTubeStatus(); setConnecting(false) }
    }
  }

  const checkYouTubeStatus = async () => {
    setError(null)
    try {
      const res = await getYouTubeAuthStatus()
      const data = res.data.data ?? res.data
      if (mountedRef.current) setYtAuth({ authenticated: data.authenticated, loading: false })
    } catch (err) {
      if (mountedRef.current) { setYtAuth({ authenticated: false, loading: false }); setError(err.response?.data?.message || 'Failed to check YouTube connection status') }
    }
  }

  const connectYouTube = async () => {
    setConnecting(true)
    try {
      const res = await getYouTubeAuthUrl()
      const authUrl = (res.data.data ?? res.data).authUrl
      const width = Math.min(500, window.innerWidth - 40)
      const height = Math.min(600, window.innerHeight - 40)
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      popupRef.current = window.open(authUrl, 'YouTube Auth', `width=${width},height=${height},left=${left},top=${top}`)
      window.addEventListener('message', handleAuthMessage)
      checkClosedRef.current = setInterval(() => {
        if (popupRef.current?.closed) {
          if (checkClosedRef.current) clearInterval(checkClosedRef.current)
          window.removeEventListener('message', handleAuthMessage)
          if (mountedRef.current) { checkYouTubeStatus(); setConnecting(false) }
        }
      }, 1000)
      safetyTimeoutRef.current = setTimeout(() => {
        if (checkClosedRef.current) clearInterval(checkClosedRef.current)
        window.removeEventListener('message', handleAuthMessage)
        if (mountedRef.current) setConnecting(false)
      }, 300000)
    } catch { if (mountedRef.current) setConnecting(false) }
  }

  const loadSchedulerStatus = async () => {
    setSchedulerLoading(true)
    try {
      const res = await getSchedulerStatus()
      const data = res.data.data ?? res.data
      setSchedulerEnabled(data?.enabled ?? true)
      setNextRun(data?.nextRun || 'Next run: Tomorrow 10:00 AM IST')
    } catch { setNextRun('Next run: Tomorrow 10:00 AM IST'); setSchedulerEnabled(true) }
    finally { setSchedulerLoading(false) }
  }

  const loadApiKeyInfo = async () => {
    try {
      const res = await getApiKeyInfo()
      setApiKeyInfo(res.data.data)
    } catch { /* silent */ }
  }

  const loadSchedulerSlots = async () => {
    try {
      const res = await getSchedulerSlots()
      const data = res.data.data || res.data
      if (data.slots) setSchedulerSlots(data.slots)
      if (data.timezone) setSchedulerTimezone(data.timezone)
    } catch { /* silent — fallback slots will render */ }
  }

  const loadAppVersion = async () => {
    try {
      const res = await getAppVersion()
      setAppVersion(res.data.data || res.data)
    } catch { /* silent — fallback version will render */ }
  }

  const handleClearCache = async () => {
    setClearingCache(true)
    try {
      await clearCache()
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    } catch { setCacheCleared(false) }
    finally { setClearingCache(false) }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
    setDeletingAccount(true)
    try {
      await deleteAccount()
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    } catch { /* silent */ }
    finally { setDeletingAccount(false) }
  }

  const toggleScheduler = async () => {
    try { await apiToggleScheduler(); setSchedulerEnabled(prev => !prev) }
    catch { setSchedulerEnabled(prev => !prev) }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your AutoTube platform" />

      {error && <div className="mb-6"><ErrorMessage message={error} onRetry={checkYouTubeStatus} dismissible onDismiss={() => setError(null)} /></div>}

      <div className="space-y-6">
        {/* ═══ YouTube Connection ═══ */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>smart_display</span>
            <h3 className="text-title-md font-semibold">YouTube Connection</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${ytAuth.authenticated ? 'bg-primary-container/20' : 'bg-white/[0.06]'}`}>
              <span className={`material-symbols-outlined text-4xl sm:text-5xl ${ytAuth.authenticated ? 'text-primary-container' : 'text-gray-500'}`} style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>smart_display</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-title-md font-semibold mb-2">YouTube Channel</div>
              {ytAuth.loading ? (
                <div className="text-gray-500 flex items-center justify-center sm:justify-start gap-2">
                  <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin"></div>
                  Checking connection...
                </div>
              ) : ytAuth.authenticated ? (
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="chip chip-active">
                    <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>check_circle</span>
                    Connected
                  </span>
                  <span className="text-gray-400 text-body-sm">Ready to upload videos</span>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/30">Not Connected</span>
                  <span className="text-gray-400 text-body-sm">Connect to enable uploads</span>
                </div>
              )}
            </div>
          </div>

          {!ytAuth.authenticated && !ytAuth.loading && (
            <button onClick={connectYouTube} disabled={connecting}
              className="w-full sm:w-auto gradient-primary text-white px-8 py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-3 touch-target">
              {connecting ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Opening Google...</>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>link</span>
                  Connect YouTube Account
                </>
              )}
            </button>
          )}

          {ytAuth.authenticated && (
            <button onClick={checkYouTubeStatus} className="w-full sm:w-auto px-4 py-2.5 glass rounded-lg hover:bg-white/[0.08] transition text-body-sm touch-target flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>refresh</span>
              Refresh Status
            </button>
          )}
        </div>

        {/* ═══ Scheduler ═══ */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>schedule</span>
            <h3 className="text-title-md font-semibold">Scheduler</h3>
          </div>

          {/* Time Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {(schedulerSlots.length > 0 ? schedulerSlots : [
              { time: '10:00 AM', label: 'Morning', icon: 'wb_sunny', color: 'text-yellow-400' },
              { time: '2:00 PM', label: 'Afternoon', icon: 'wb_cloudy', color: 'text-orange-400' },
              { time: '6:00 PM', label: 'Evening', icon: 'dark_mode', color: 'text-blue-400' }
            ]).map((slot, i) => (
              <div key={i} className={`bg-white/[0.03] rounded-xl p-4 border transition ${schedulerEnabled ? 'border-tertiary/20' : 'border-glass-border opacity-50'}`}>
                <span className={`material-symbols-outlined text-3xl mb-2 block ${slot.color}`} style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{slot.icon}</span>
                <div className="text-body-sm text-gray-400">{slot.label}</div>
                <div className="text-title-md font-bold mt-1">{slot.time}</div>
                <div className="mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${schedulerEnabled ? 'bg-tertiary/20 text-tertiary' : 'bg-gray-500/20 text-gray-400'}`}>
                    {schedulerEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Scheduler Controls */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-glass-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`chip ${schedulerEnabled ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                  {schedulerEnabled ? 'Running' : 'Paused'}
                </span>
                <span className="text-body-sm text-gray-400">Timezone: {schedulerTimezone}</span>
              </div>
              {nextRun && <span className="text-body-sm text-gray-300">{nextRun}</span>}
            </div>
            <div className="mt-4">
              <button onClick={toggleScheduler}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-body-sm font-medium transition touch-target ${
                  schedulerEnabled
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                    : 'gradient-primary text-white hover:opacity-90'
                }`}>
                {schedulerEnabled ? 'Pause Scheduler' : 'Enable Scheduler'}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ API Key ═══ */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>key</span>
            <h3 className="text-title-md font-semibold">API Key</h3>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 border border-glass-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 font-mono text-body-sm text-gray-400 bg-black/30 px-4 py-3 rounded-lg">
                {apiKeyVisible ? (apiKeyInfo?.key || 'Not configured') : '••••••••••••••••••••••••'}
              </div>
              <button onClick={() => setApiKeyVisible(!apiKeyVisible)} className="p-2.5 glass rounded-lg hover:bg-white/[0.08] transition touch-target">
                <span className="material-symbols-outlined text-gray-400" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>
                  {apiKeyVisible ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Usage Bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>API Key Status</span>
                <span>{apiKeyInfo?.configured ? (apiKeyInfo?.isValid ? 'Valid' : 'Invalid') : 'Not configured'}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${apiKeyInfo?.isValid ? 'bg-gradient-to-r from-tertiary to-secondary' : 'bg-gray-500'}`} style={{ width: apiKeyInfo?.isValid ? '100%' : '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Danger Zone ═══ */}
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-primary-container/30 bg-primary-container/5">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>warning</span>
            <h3 className="text-title-md font-semibold text-primary">Danger Zone</h3>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white/[0.03] rounded-xl border border-glass-border">
              <div>
                <div className="font-medium text-body-sm">Clear Cache</div>
                <div className="text-xs text-gray-500 mt-0.5">Remove all cached data and temporary files</div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-body-sm font-medium hover:bg-yellow-500/30 transition touch-target whitespace-nowrap disabled:opacity-50"
              >
                {clearingCache ? 'Clearing...' : cacheCleared ? 'Cleared!' : 'Clear Cache'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white/[0.03] rounded-xl border border-glass-border">
              <div>
                <div className="font-medium text-body-sm">Delete Account</div>
                <div className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all data</div>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 bg-primary-container text-white rounded-lg text-body-sm font-medium hover:bg-primary-dark transition touch-target whitespace-nowrap disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ About ═══ */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 gradient rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_arrow</span>
            </div>
            <div className="min-w-0">
              <div className="text-title-md font-bold">{appVersion?.name || 'AutoTube'} v{appVersion?.version || '1.0.0'}</div>
              <div className="text-gray-400 text-body-sm">{appVersion?.description || 'AI-Powered YouTube Automation Platform'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
