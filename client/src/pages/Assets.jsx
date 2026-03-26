import { useState, useEffect } from 'react'
import { getAssets, getAssetStats, deleteAsset, deleteAllAssets } from '../services/api'

const TABS = [
  { id: 'all', label: 'All', icon: '📁' },
  { id: 'final', label: 'Final', icon: '▶️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'subtitles', label: 'Subs', icon: '📝' }
]

function Assets() {
  const [activeTab, setActiveTab] = useState('all')
  const [assets, setAssets] = useState({ audio: [], videos: [], final: [], subtitles: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const [assetsRes, statsRes] = await Promise.all([
        getAssets(),
        getAssetStats()
      ])
      setAssets(assetsRes.data.data)
      setStats(statsRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (filePath) => {
    if (!confirm('Delete this file?')) return
    try {
      await deleteAsset(filePath)
      loadAssets()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const handleDeleteAll = async (type) => {
    if (!confirm(`Delete all ${type} assets? This cannot be undone.`)) return
    try {
      await deleteAllAssets(type)
      loadAssets()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'audio': return '🎵'
      case 'videos': return '🎬'
      case 'final': return '▶️'
      case 'subtitles': return '📝'
      default: return '📄'
    }
  }

  const getAssetsForTab = () => {
    if (activeTab === 'all') {
      return [
        ...(assets.final || []).map(f => ({ type: 'final', ...f })),
        ...(assets.audio || []).map(f => ({ type: 'audio', ...f })),
        ...(assets.videos || []).map(f => ({ type: 'videos', ...f }))
      ]
    }
    return (assets[activeTab] || []).map(f => ({ type: activeTab, ...f }))
  }

  const displayAssets = getAssetsForTab()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Assets</h1>
        <button onClick={loadAssets} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center gap-2">
          ↻ Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
          <div className="text-3xl font-bold">{stats?.audio || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Audio Files</div>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          <div className="text-3xl font-bold">{stats?.videos || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Stock Videos</div>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
          <div className="text-3xl font-bold">{stats?.final || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Final Videos</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-3xl font-bold">{stats?.totalSize || '0 MB'}</div>
          <div className="text-sm text-gray-400 mt-1">Total Size</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-2 mb-6 flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === tab.id 
                ? 'gradient text-white shadow-lg shadow-red-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id !== 'all' && stats?.[tab.id] !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {stats[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Asset Grid */}
      {displayAssets.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {displayAssets.map((f, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden hover:-translate-y-1 transition-all hover:shadow-lg hover:shadow-black/20">
              <div className="h-40 bg-white/5 flex items-center justify-center text-6xl text-gray-600 relative">
                {getIcon(f.type)}
                <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs">
                  {f.type}
                </span>
              </div>
              <div className="p-4">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{f.sizeFormatted}</span>
                  <span>{new Date(f.modified).toLocaleDateString()}</span>
                </div>
                {activeTab !== 'all' && (
                  <button 
                    onClick={() => handleDelete(f.path)}
                    className="w-full mt-3 py-2 bg-red-500/15 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/25 transition text-sm font-medium"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">{getIcon(activeTab)}</div>
          <h3 className="text-xl font-semibold mb-2">No {activeTab === 'all' ? '' : activeTab} Assets Found</h3>
          <p className="text-gray-400">Run the pipeline to generate assets</p>
        </div>
      )}

      {/* Manage Assets */}
      <div className="glass rounded-2xl p-6 mt-8">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Manage Assets</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => handleDeleteAll('audio')} className="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition">
            🎵 Clear Audio
          </button>
          <button onClick={() => handleDeleteAll('videos')} className="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition">
            🎬 Clear Videos
          </button>
          <button onClick={() => handleDeleteAll('final')} className="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition">
            ▶️ Clear Final
          </button>
          <button onClick={() => handleDeleteAll('all')} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium">
            🗑️ Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

export default Assets
