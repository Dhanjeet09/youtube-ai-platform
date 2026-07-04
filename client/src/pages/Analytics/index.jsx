/**
 * Analytics - YouTube video analytics viewer
 * Kinetic Glass design: search, results card with metrics grid, empty state
 */
import { useState } from 'react'
import { getAnalytics, addToDashboard } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ErrorMessage from '../../components/ErrorMessage'
import EmptyState from '../../components/EmptyState'

function Analytics() {
  const [videoId, setVideoId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [dashboardAdded, setDashboardAdded] = useState(false)

  const fetchAnalytics = async () => {
    if (!videoId.trim()) { setError('Please enter a video ID'); return }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await getAnalytics(videoId)
      const result = res.data.data
      setData(result)
      setDashboardAdded(false)
      setHistory(prev => [{ videoId, ...result, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
    } finally { setLoading(false) }
  }

  const handleAddToDashboard = async () => {
    if (!videoId.trim()) return
    try {
      await addToDashboard(videoId.trim())
      setDashboardAdded(true)
      setTimeout(() => setDashboardAdded(false), 2000)
    } catch { /* silent */ }
  }

  return (
    <div>
      <PageHeader title="YouTube Analytics" subtitle="Video performance data and insights" />

      {/* ═══ Search Section ═══ */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
        <label htmlFor="video-id-input" className="text-label-caps text-gray-500 uppercase tracking-wider mb-3 block">Enter YouTube Video ID</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>link</span>
            <input
              id="video-id-input" type="text"
              className="w-full pl-12 pr-5 py-3.5 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition"
              placeholder="e.g., dQw4w9WgXcQ"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
            />
          </div>
          <button
            className="w-full sm:w-auto px-6 py-3.5 gradient-primary rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 touch-target"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Fetching...</>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>analytics</span>
                Fetch Analytics
              </>
            )}
          </button>
        </div>
        {error && <div className="mt-4"><ErrorMessage message={error} dismissible onDismiss={() => setError('')} /></div>}
      </div>

      {/* ═══ Results Card ═══ */}
      {data && (
        <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
          {/* Thumbnail + Title */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-48 h-28 bg-white/[0.03] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-5xl text-gray-600" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>smart_display</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-title-md font-semibold mb-1 truncate">{data.title || 'N/A'}</h3>
              <p className="text-body-sm text-gray-400">Published: {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : 'N/A'}</p>
              <div className="mt-2"><StatusBadge grade={data.grade} /></div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Views', value: data.views?.toLocaleString() || '0', icon: 'visibility', color: 'text-secondary' },
              { label: 'Likes', value: data.likes?.toLocaleString() || '0', icon: 'favorite', color: 'text-primary-container' },
              { label: 'Comments', value: data.comments?.toLocaleString() || '0', icon: 'comment', color: 'text-tertiary' },
              { label: 'Engagement Rate', value: data.views ? `${((data.likes + data.comments) / data.views * 100).toFixed(2)}%` : '0%', icon: 'trending_up', color: 'text-yellow-400' },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.03] rounded-xl p-4 text-center">
                <span className={`material-symbols-outlined text-2xl ${m.color} mb-2 block`} style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{m.icon}</span>
                <div className="text-xl font-bold">{m.value}</div>
                <div className="text-body-sm text-gray-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Viral Score */}
          <div className="mt-4 bg-primary-container/10 rounded-xl p-4 border border-primary-container/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-2xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>local_fire_department</span>
                <div>
                  <div className="text-body-sm text-gray-400">Viral Score</div>
                  <div className="text-2xl font-bold">{data.viralScore || 0}</div>
                </div>
              </div>
              <StatusBadge grade={data.grade} />
            </div>
          </div>

          {/* Add to Dashboard */}
          <button onClick={handleAddToDashboard}
            className="w-full mt-4 px-4 py-3 glass rounded-xl hover:bg-white/[0.08] transition flex items-center justify-center gap-2 text-body-sm font-medium touch-target">
            <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{dashboardAdded ? 'check_circle' : 'add_to_home_screen'}</span>
            {dashboardAdded ? 'Added to Dashboard!' : 'Add to Dashboard'}
          </button>
        </div>
      )}

      {/* ═══ History ═══ */}
      {history.length > 0 && (
        <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
          <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} onClick={() => setVideoId(h.videoId)}
                className="bg-white/[0.03] hover:bg-white/[0.06] rounded-xl p-3 sm:p-4 cursor-pointer transition-all border border-transparent hover:border-glass-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary-container/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_arrow</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs sm:text-sm truncate">{h.videoId}</div>
                      <div className="text-xs text-gray-500">{h.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Views</div>
                      <div className="font-medium text-body-sm">{h.views?.toLocaleString() || 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="font-bold text-body-sm">{h.viralScore || 0}</div>
                    </div>
                    <StatusBadge grade={h.grade} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {!data && history.length === 0 && (
        <EmptyState
          icon={<span className="material-symbols-outlined text-5xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>analytics</span>}
          title="No Analytics Yet"
          description="Enter a YouTube video ID above to fetch analytics"
        />
      )}
    </div>
  )
}

export default Analytics
