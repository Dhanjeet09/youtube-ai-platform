import { useState, useEffect } from 'react'
import { getBestNiche, getNicheStats, getNicheHealth, getAssetStats } from '../services/api'

const NICHE_ICONS = {
  Finance: '💰',
  Business: '📈',
  Technology: '💻',
  Health: '🏃',
  RealEstate: '🏠',
  Education: '📚'
}

function Dashboard() {
  const [health, setHealth] = useState(null)
  const [stats, setStats] = useState([])
  const [bestNiche, setBestNiche] = useState(null)
  const [assetStats, setAssetStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [healthRes, statsRes, bestRes, assetRes] = await Promise.all([
        getNicheHealth(),
        getNicheStats(),
        getBestNiche(),
        getAssetStats()
      ])
      setHealth(healthRes.data.data)
      setStats(statsRes.data.data)
      setBestNiche(bestRes.data.data)
      setAssetStats(assetRes.data.data)
    } catch (err) {
      console.error(err)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">AutoTube Performance Overview</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center gap-2">
          ↻ Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">🏆</div>
            <div>
              <div className="text-sm text-gray-400">Best Niche</div>
              <div className="text-lg font-bold">{bestNiche?.niche || 'N/A'}</div>
            </div>
          </div>
          <div className="text-sm text-green-400">Score: {bestNiche?.averageViralScore || 0}</div>
        </div>

        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">🎬</div>
            <div>
              <div className="text-sm text-gray-400">Videos Created</div>
              <div className="text-2xl font-bold">{assetStats?.final || 0}</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">{assetStats?.totalSize || '0 MB'}</div>
        </div>

        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">📁</div>
            <div>
              <div className="text-sm text-gray-400">Total Assets</div>
              <div className="text-2xl font-bold">{(assetStats?.audio || 0) + (assetStats?.videos || 0)}</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">{assetStats?.audio || 0} audio, {assetStats?.videos || 0} video</div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">⏰</div>
            <div>
              <div className="text-sm text-gray-400">Scheduler</div>
              <div className="text-lg font-bold">3/day</div>
            </div>
          </div>
          <div className="text-sm text-green-400">10AM, 2PM, 6PM IST</div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Recommendation</h3>
            <p className="text-lg">{health?.recommendation || 'Run pipeline to get recommendations'}</p>
          </div>
          {health?.healthyNiches?.length > 0 && (
            <div className="flex gap-2">
              {health.healthyNiches.map(n => (
                <span key={n} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium border border-green-500/30">
                  {NICHE_ICONS[n] || '📁'} {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Niche Performance Table */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Niche Performance</h3>
        <div className="space-y-3">
          {stats.map((s, i) => {
            const isBest = s.niche === bestNiche?.niche
            return (
              <div key={i} className={`bg-white/5 rounded-xl p-4 border transition-all ${
                isBest ? 'border-red-500/30 bg-red-500/5' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">
                      {NICHE_ICONS[s.niche] || '📁'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.niche}</span>
                        {isBest && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Best</span>}
                      </div>
                      <div className="text-sm text-gray-500">{s.videoCount} videos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total Score</div>
                      <div className="font-medium">{s.totalViralScore}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Avg Score</div>
                      <div className="text-lg font-bold">{s.averageViralScore}</div>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${getGradeClass(s.grade)}`}>
                      {s.grade}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
