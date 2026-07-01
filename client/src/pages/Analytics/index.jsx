/**
 * Analytics - YouTube video analytics viewer
 * 
 * Uses StatusBadge for viral score grade (replacing duplicated getGradeClass).
 * Uses shared components: PageHeader, StatCard, LoadingSpinner, ErrorMessage, EmptyState, StatusBadge
 */
import { useState } from 'react'
import { getAnalytics } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import ErrorMessage from '../../components/ErrorMessage'
import EmptyState from '../../components/EmptyState'

function Analytics() {
  const [videoId, setVideoId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const fetchAnalytics = async () => {
    if (!videoId.trim()) {
      setError('Please enter a video ID')
      return
    }
    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await getAnalytics(videoId)
      const result = res.data.data
      setData(result)
      setHistory(prev => [{
        videoId,
        ...result,
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="YouTube Data API analytics for your videos"
      />

      {/* Search */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        <label htmlFor="video-id-input" className="text-sm text-gray-400 uppercase tracking-wider mb-4 block">
          Enter YouTube Video ID
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              id="video-id-input"
              type="text"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
              placeholder="e.g., dQw4w9WgXcQ"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
            />
          </div>
          <button
            className="w-full sm:w-auto px-6 py-4 gradient rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 touch-target"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Fetching...
              </>
            ) : (
              <>📊 Fetch Analytics</>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} dismissible onDismiss={() => setError('')} />
          </div>
        )}
      </div>

      {/* Stats */}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <StatCard icon="👁️" label="Views" value={data.views?.toLocaleString() || 0} />
            <StatCard icon="❤️" label="Likes" value={data.likes?.toLocaleString() || 0} />
            <StatCard icon="💬" label="Comments" value={data.comments?.toLocaleString() || 0} />
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-sm text-gray-400">Viral Score</div>
              <div className="text-2xl font-bold mt-1">{data.viralScore || 0}</div>
              <div className="mt-2">
                <StatusBadge grade={data.grade} />
              </div>
            </div>
          </div>

          {/* Video Details */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Video Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Title</div>
                <div className="text-lg">{data.title || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Published</div>
                <div className="text-lg">{data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* History */}
          {history.length > 0 && (
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => setVideoId(h.videoId)}
                className="bg-white/5 hover:bg-white/10 rounded-xl p-3 sm:p-4 cursor-pointer transition-all border border-transparent hover:border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 text-sm sm:text-base">▶</div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs sm:text-sm truncate">{h.videoId}</div>
                      <div className="text-xs text-gray-500">{h.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Views</div>
                      <div className="font-medium text-sm">{h.views?.toLocaleString() || 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="font-bold text-sm">{h.viralScore || 0}</div>
                    </div>
                    <StatusBadge grade={h.grade} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && history.length === 0 && (
        <EmptyState
          icon="📊"
          title="No Analytics Yet"
          description="Enter a YouTube video ID above to fetch analytics"
        />
      )}
    </div>
  )
}

export default Analytics
