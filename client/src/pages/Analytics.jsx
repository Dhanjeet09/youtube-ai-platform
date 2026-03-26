import { useState } from 'react'
import { getAnalytics } from '../services/api'

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
      setData(res.data.data)
      setHistory(prev => [{
        videoId,
        ...res.data.data,
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const getGradeClass = (grade) => {
    switch (grade) {
      case 'VIRAL': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'HIGH': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'MEDIUM': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400">
          📊 YouTube Data API
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Enter YouTube Video ID</h3>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
              placeholder="e.g., dQw4w9WgXcQ"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
            />
          </div>
          <button 
            className="px-8 py-5 gradient rounded-2xl hover:opacity-90 transition font-semibold flex items-center gap-2 disabled:opacity-50"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Fetching...
              </>
            ) : (
              <>
                📊 Fetch Analytics
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Stats */}
      {data && (
        <>
          <div className="grid grid-cols-4 gap-5 mb-6">
            <div className="glass rounded-2xl p-6">
              <div className="text-4xl mb-2">👁️</div>
              <div className="text-sm text-gray-400">Views</div>
              <div className="text-2xl font-bold mt-1">{data.views?.toLocaleString() || 0}</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="text-4xl mb-2">❤️</div>
              <div className="text-sm text-gray-400">Likes</div>
              <div className="text-2xl font-bold mt-1">{data.likes?.toLocaleString() || 0}</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm text-gray-400">Comments</div>
              <div className="text-2xl font-bold mt-1">{data.comments?.toLocaleString() || 0}</div>
            </div>
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-sm text-gray-400">Viral Score</div>
              <div className="text-2xl font-bold mt-1">{data.viralScore || 0}</div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border ${getGradeClass(data.grade)}`}>
                {data.grade || 'N/A'}
              </span>
            </div>
          </div>

          {/* Video Details */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Video Details</h3>
            <div className="grid grid-cols-2 gap-4">
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
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div 
                key={i} 
                onClick={() => setVideoId(h.videoId)}
                className="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all border border-transparent hover:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">▶</div>
                    <div>
                      <div className="font-mono text-sm">{h.videoId}</div>
                      <div className="text-xs text-gray-500">{h.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Views</div>
                      <div className="font-medium">{h.views?.toLocaleString() || 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="font-bold">{h.viralScore || 0}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getGradeClass(h.grade)}`}>
                      {h.grade || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && history.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Analytics Yet</h3>
          <p className="text-gray-400">Enter a YouTube video ID above to fetch analytics</p>
        </div>
      )}
    </div>
  )
}

export default Analytics
