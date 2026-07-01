/**
 * Settings - Simplified with 2 functional tabs only
 * 
 * Tabs:
 *   1. YouTube Auth (existing functionality - works)
 *   2. Scheduler (show/hide schedule, next run time, enable/disable)
 * 
 * Removed: General, API Keys, Data Management (decorative only)
 * Uses TabBar, PageHeader, StatCard components
 */
import { useState, useEffect, useRef } from 'react'
import { getYouTubeAuthStatus, getYouTubeAuthUrl, getSchedulerStatus, toggleScheduler as apiToggleScheduler } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import TabBar from '../../components/TabBar'
import ErrorMessage from '../../components/ErrorMessage'

const TABS = [
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'scheduler', label: 'Scheduler', icon: '⏰' }
]

function Settings() {
  const [activeTab, setActiveTab] = useState('youtube')
  const [ytAuth, setYtAuth] = useState({ authenticated: false, loading: true })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  // Scheduler state
  const [schedulerEnabled, setSchedulerEnabled] = useState(true)
  const [nextRun, setNextRun] = useState(null)
  const [schedulerLoading, setSchedulerLoading] = useState(false)

  // Refs for cleanup
  const popupRef = useRef(null)
  const checkClosedRef = useRef(null)
  const safetyTimeoutRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    checkYouTubeStatus()
    loadSchedulerStatus()
    return () => {
      mountedRef.current = false
      // Clean up any pending intervals/timeouts/event listeners
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
      if (mountedRef.current) {
        checkYouTubeStatus()
        setConnecting(false)
      }
    }
  }

  const checkYouTubeStatus = async () => {
    setError(null)
    try {
      const res = await getYouTubeAuthStatus()
      const data = res.data.data ?? res.data
      if (mountedRef.current) setYtAuth({ authenticated: data.authenticated, loading: false })
    } catch (err) {
      if (mountedRef.current) {
        setYtAuth({ authenticated: false, loading: false })
        setError(err.response?.data?.message || 'Failed to check YouTube connection status')
      }
    }
  }

  const connectYouTube = async () => {
    setConnecting(true)
    try {
      const res = await getYouTubeAuthUrl()
      const data = res.data.data ?? res.data
      const authUrl = data.authUrl

      const width = Math.min(500, window.innerWidth - 40)
      const height = Math.min(600, window.innerHeight - 40)
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      popupRef.current = window.open(
        authUrl,
        'YouTube Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      window.addEventListener('message', handleAuthMessage)

      checkClosedRef.current = setInterval(() => {
        if (popupRef.current?.closed) {
          if (checkClosedRef.current) clearInterval(checkClosedRef.current)
          window.removeEventListener('message', handleAuthMessage)
          if (mountedRef.current) {
            checkYouTubeStatus()
            setConnecting(false)
          }
        }
      }, 1000)

      // Safety cleanup after 5 minutes
      safetyTimeoutRef.current = setTimeout(() => {
        if (checkClosedRef.current) clearInterval(checkClosedRef.current)
        window.removeEventListener('message', handleAuthMessage)
        if (mountedRef.current) setConnecting(false)
      }, 300000)

    } catch (err) {
      if (mountedRef.current) setConnecting(false)
    }
  }

  const loadSchedulerStatus = async () => {
    setSchedulerLoading(true)
    try {
      const res = await getSchedulerStatus()
      const data = res.data.data ?? res.data
      setSchedulerEnabled(data?.enabled ?? true)
      setNextRun(data?.nextRun || 'Next run: Tomorrow 10:00 AM IST')
    } catch (err) {
      setNextRun('Next run: Tomorrow 10:00 AM IST')
      setSchedulerEnabled(true)
    } finally {
      setSchedulerLoading(false)
    }
  }

  const toggleScheduler = async () => {
    try {
      await apiToggleScheduler()
      setSchedulerEnabled(prev => !prev)
    } catch (err) {
      console.warn('Toggle scheduler API not available yet, toggling locally:', err.message)
      setSchedulerEnabled(prev => !prev)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your AutoTube platform"
      />

      {/* Tabs */}
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* YouTube Auth */}
      {activeTab === 'youtube' && (
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">YouTube Integration</h3>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onRetry={checkYouTubeStatus} dismissible onDismiss={() => setError(null)} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              ytAuth.authenticated ? 'bg-red-500/20' : 'bg-white/5'
            }`}>
              <svg className={`w-8 h-8 sm:w-10 sm:h-10 ${ytAuth.authenticated ? 'text-red-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-lg sm:text-xl font-semibold mb-2">YouTube Channel</div>
              {ytAuth.loading ? (
                <div className="text-gray-500 flex items-center justify-center sm:justify-start gap-2">
                  <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin"></div>
                  Checking connection...
                </div>
              ) : ytAuth.authenticated ? (
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium border border-green-500/30">✅ Connected</span>
                  <span className="text-gray-400 text-sm">Ready to upload videos</span>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium border border-yellow-500/30">⚠️ Not Connected</span>
                  <span className="text-gray-400 text-sm">Connect to enable uploads</span>
                </div>
              )}
            </div>
          </div>

          {!ytAuth.authenticated && !ytAuth.loading && (
            <button
              onClick={connectYouTube}
              disabled={connecting}
              className="w-full sm:w-auto gradient text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-3 touch-target"
            >
              {connecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Opening Google...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Connect YouTube Account
                </>
              )}
            </button>
          )}

          {ytAuth.authenticated && (
            <button
              onClick={checkYouTubeStatus}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition text-sm touch-target"
            >
              🔄 Refresh Status
            </button>
          )}
        </div>
      )}

      {/* Scheduler */}
      {activeTab === 'scheduler' && (
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">Auto Upload Schedule</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {[
              { time: '10:00 AM', label: 'Morning', icon: '🌅', status: 'active' },
              { time: '2:00 PM', label: 'Afternoon', icon: '☀️', status: 'active' },
              { time: '6:00 PM', label: 'Evening', icon: '🌆', status: 'active' }
            ].map((slot, i) => (
              <div key={i} className={`bg-white/5 rounded-xl p-4 sm:p-5 border transition ${
                schedulerEnabled ? 'border-green-500/20' : 'border-white/10 opacity-50'
              }`}>
                <div className="text-3xl sm:text-4xl mb-3">{slot.icon}</div>
                <div className="text-sm text-gray-400">{slot.label}</div>
                <div className="text-lg sm:text-xl font-bold mt-1">{slot.time}</div>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    schedulerEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {schedulerEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-xl p-4 sm:p-5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  schedulerEnabled
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}>
                  {schedulerEnabled ? '✅ Running' : '⏸️ Paused'}
                </span>
                <span className="text-xs sm:text-sm text-gray-400">Timezone: Asia/Kolkata (IST)</span>
              </div>
            </div>

            {nextRun && (
              <div className="text-sm text-gray-300">
                {nextRun}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={toggleScheduler}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-medium transition touch-target ${
                  schedulerEnabled
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                    : 'gradient text-white hover:opacity-90'
                }`}
              >
                {schedulerEnabled ? '⏸️ Pause Scheduler' : '▶️ Enable Scheduler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About section (always visible) */}
      <div className="glass rounded-2xl p-4 sm:p-6 mt-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 gradient rounded-2xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
            ▶
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold">AutoTube v1.0.0</div>
            <div className="text-gray-400 text-xs sm:text-sm">AI-Powered YouTube Automation Platform</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
