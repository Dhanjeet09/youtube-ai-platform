import { useState, useEffect } from 'react'
import { getHighRpmNiches, getEarningsEstimate, getEarningsReport } from '../services/api'
import { CustomSelect } from '../components/CustomSelect'

const NICHE_ICONS = {
  Finance: '💰',
  Business: '📈',
  Technology: '💻',
  Health: '🏃',
  RealEstate: '🏠',
  Education: '📚'
}

function Monetization() {
  const [niches, setNiches] = useState([])
  const [selectedNiche, setSelectedNiche] = useState('Finance')
  const [views, setViews] = useState(100000)
  const [earnings, setEarnings] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedNiche) {
      calculateEarnings()
    }
  }, [selectedNiche, views])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getHighRpmNiches()
      setNiches(res.data.data)
      if (res.data.data.length > 0) {
        setSelectedNiche(res.data.data[0].key)
      }
      const reportRes = await getEarningsReport()
      setReport(reportRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateEarnings = async () => {
    try {
      const res = await getEarningsEstimate(selectedNiche, views)
      setEarnings(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const formatViews = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
    return v.toString()
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
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.3);
        }
      `}</style>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Monetization</h1>
          <p className="text-gray-400 mt-1">Earnings Calculator & Revenue Projections</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          <div className="text-3xl font-bold text-green-400">${report?.summary?.totalEstimated?.toFixed(2) || '0.00'}</div>
          <div className="text-sm text-gray-400 mt-1">Total Estimated</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-3xl font-bold">{report?.summary?.totalViews?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Total Views</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-3xl font-bold">{report?.summary?.videoCount || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Videos Tracked</div>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
          <div className="text-3xl font-bold">${report?.summary?.averageRPM?.toFixed(2) || '0.00'}</div>
          <div className="text-sm text-gray-400 mt-1">Avg RPM</div>
        </div>
      </div>

      {/* Earnings Calculator */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Earnings Calculator</h3>
          
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">Select Niche</div>
            <CustomSelect
              value={selectedNiche}
              onChange={setSelectedNiche}
              options={niches.map(n => ({
                value: n.key,
                label: `${NICHE_ICONS[n.key] || '📁'} ${n.name}`,
                sublabel: `$${n.rpm} RPM`
              }))}
              placeholder="Choose niche..."
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-500">Estimated Views</div>
              <div className="text-2xl font-bold text-red-400">{formatViews(views)}</div>
            </div>
            <input
              type="range"
              min="1000"
              max="10000000"
              step="1000"
              value={views}
              onChange={(e) => setViews(parseInt(e.target.value))}
              className="w-full accent-red-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:gradient [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1K</span>
              <span>100K</span>
              <span>1M</span>
              <span>10M</span>
            </div>
          </div>

          {earnings && (
            <div className="p-5 bg-green-500/10 rounded-2xl border border-green-500/30">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">Estimated Earnings</div>
                <div className="text-5xl font-bold text-green-400 mt-2">${earnings.estimated?.toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">At ${earnings.rpm}$ RPM</div>
              </div>
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-gray-400">AdSense (40%)</span>
                  <span className="text-green-400 font-medium">${earnings.breakdown?.ads?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Affiliate (60%)</span>
                  <span className="text-green-400 font-medium">${earnings.breakdown?.affiliate?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* High RPM Niches */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">High RPM Niches</h3>
          <div className="space-y-3">
            {niches.map(n => (
              <div 
                key={n.key}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedNiche === n.key 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                onClick={() => setSelectedNiche(n.key)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">
                      {NICHE_ICONS[n.key] || '📁'}
                    </div>
                    <div>
                      <div className="font-semibold">{n.name}</div>
                      <div className="text-xs text-gray-500">{n.keywords?.slice(0, 2).join(', ')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">${n.rpm}</div>
                    <div className="text-xs text-gray-500">RPM</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Revenue Projections</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-400">${report?.projections?.at100kViews?.toFixed(0) || 0}</div>
            <div className="text-sm text-gray-500 mt-2">At 100K Views</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-400">${report?.projections?.at1mViews?.toFixed(0) || 0}</div>
            <div className="text-sm text-gray-500 mt-2">At 1M Views</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-400">${report?.projections?.monthly?.toFixed(0) || 0}</div>
            <div className="text-sm text-gray-500 mt-2">Monthly Potential</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-5 text-center border border-red-500/30">
            <div className="text-3xl font-bold text-red-400">${report?.projections?.yearly?.toFixed(0) || 0}</div>
            <div className="text-sm text-gray-400 mt-2">Yearly Potential</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Monetization
