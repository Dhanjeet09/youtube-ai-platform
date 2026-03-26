import { useState, useEffect } from 'react'
import { getNiches, getBestNiche, getNicheStats, registerNiche } from '../services/api'
import { CustomSelect } from '../components/CustomSelect'

const NICHE_OPTIONS = [
  { value: 'Finance', label: '💰 Finance' },
  { value: 'Business', label: '📈 Business' },
  { value: 'Technology', label: '💻 Technology' },
  { value: 'Health', label: '🏃 Health' },
  { value: 'RealEstate', label: '🏠 Real Estate' },
  { value: 'Education', label: '📚 Education' }
]

function Niche() {
  const [stats, setStats] = useState([])
  const [bestNiche, setBestNiche] = useState(null)
  const [registerData, setRegisterData] = useState({ niche: '', videoId: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sRes, bRes] = await Promise.all([
        getNicheStats(),
        getBestNiche()
      ])
      setStats(sRes.data.data)
      setBestNiche(bRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!registerData.niche || !registerData.videoId) {
      setMsg({ type: 'error', text: 'Please fill both fields' })
      return
    }
    setMsg({ type: 'loading', text: 'Registering...' })
    try {
      await registerNiche(registerData)
      setMsg({ type: 'success', text: '✓ Registered successfully!' })
      setRegisterData({ niche: '', videoId: '' })
      loadData()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error occurred' })
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

  const getStatusBadge = (s) => {
    if (s.videoCount === 0) return { class: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'No Data' }
    if (s.averageViralScore >= 40) return { class: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Healthy' }
    return { class: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Low' }
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Niche Management</h1>
        <button onClick={loadData} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center gap-2">
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-sm text-gray-400">Best Niche</div>
          <div className="text-2xl font-bold mt-1">{bestNiche?.niche || 'N/A'}</div>
          <div className="text-sm text-green-400 mt-1">Score: {bestNiche?.averageViralScore || 0}</div>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          <div className="text-4xl mb-2">🎬</div>
          <div className="text-sm text-gray-400">Total Videos</div>
          <div className="text-2xl font-bold mt-1">{stats.reduce((a, b) => a + b.videoCount, 0)}</div>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-sm text-gray-400">Top Grade</div>
          <div className="text-2xl font-bold mt-1">
            {stats.reduce((best, s) => s.averageViralScore > (best?.averageViralScore || 0) ? s : best, null)?.grade || 'N/A'}
          </div>
        </div>
      </div>

      {/* Register */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Register Video Performance</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-2">Select Niche</div>
            <CustomSelect
              value={registerData.niche}
              onChange={(val) => setRegisterData({ ...registerData, niche: val })}
              options={NICHE_OPTIONS}
              placeholder="Choose niche..."
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">YouTube Video ID</div>
            <input
              type="text"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
              placeholder="dQw4w9WgXcQ"
              value={registerData.videoId}
              onChange={(e) => setRegisterData({ ...registerData, videoId: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleRegister} 
              disabled={msg.type === 'loading'}
              className="w-full px-6 py-4 gradient rounded-xl hover:opacity-90 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {msg.type === 'loading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : '✓ Register Video'}
            </button>
          </div>
        </div>
        {msg.text && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm ${
            msg.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            msg.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''
          }`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass2 rounded-2xl p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">All Niche Performance</h3>
        <div className="space-y-3">
          {stats.map((s, i) => {
            const isBest = s.niche === bestNiche?.niche
            const status = getStatusBadge(s)
            return (
              <div key={i} className={`bg-white/5 rounded-xl p-5 border transition-all hover:bg-white/10 ${
                isBest ? 'border-red-500/30' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">
                      {NICHE_OPTIONS.find(n => n.value === s.niche)?.icon || '📁'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{s.niche}</span>
                        {isBest && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Best</span>}
                      </div>
                      <div className="text-sm text-gray-500">{s.videoCount} videos tracked</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Avg Score</div>
                      <div className="text-xl font-bold">{s.averageViralScore}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total Score</div>
                      <div className="text-lg">{s.totalViralScore}</div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getGradeClass(s.grade)}`}>{s.grade}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status.class}`}>{status.text}</span>
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

export default Niche
