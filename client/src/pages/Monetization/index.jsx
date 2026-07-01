/**
 * Monetization - Earnings calculator, revenue projections, and affiliate CTAs
 * 
 * Added: affiliate CTA section calling getAffiliateCTA() API
 * Added: error state handling
 * Uses shared components: StatCard, PageHeader, StatusBadge, ErrorMessage
 * Removed duplicate slider CSS (uses Tailwind classes instead)
 */
import { useState, useEffect } from 'react'
import { getHighRpmNiches, getEarningsEstimate, getEarningsReport, getAffiliateCTA } from '../../services/api'
import { CustomSelect } from '../../components/CustomSelect'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import EmptyState from '../../components/EmptyState'
import { NICHE_ICONS } from '../../constants'

function Monetization() {
  const [niches, setNiches] = useState([])
  const [selectedNiche, setSelectedNiche] = useState('Finance')
  const [views, setViews] = useState(100000)
  const [debouncedViews, setDebouncedViews] = useState(100000)
  const [earnings, setEarnings] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Affiliate CTA
  const [affiliateCTA, setAffiliateCTA] = useState(null)
  const [ctaLoading, setCtaLoading] = useState(false)
  const [ctaError, setCtaError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  // Debounce the views slider: only fire API calls 300ms after the user stops dragging
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedViews(views)
    }, 300)
    return () => clearTimeout(timer)
  }, [views])

  useEffect(() => {
    if (selectedNiche) {
      calculateEarnings()
      loadAffiliateCTA()
    }
    // Only recalculate when the debounced views settle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNiche, debouncedViews])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getHighRpmNiches()
      setNiches(res.data.data)
      if (res.data.data.length > 0) {
        setSelectedNiche(res.data.data[0].key)
      }
      const reportRes = await getEarningsReport()
      setReport(reportRes.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load monetization data')
    } finally {
      setLoading(false)
    }
  }

  const calculateEarnings = async () => {
    try {
      const res = await getEarningsEstimate(selectedNiche, views)
      setEarnings(res.data.data)
    } catch (err) {
      // Silently fail — earnings estimate is non-critical; user can adjust sliders to retry
    }
  }

  const loadAffiliateCTA = async () => {
    setCtaLoading(true)
    setCtaError(null)
    try {
      const res = await getAffiliateCTA(selectedNiche)
      setAffiliateCTA(res.data.data)
    } catch (err) {
      setCtaError(err.response?.data?.message || 'Failed to load affiliate suggestions')
    } finally {
      setCtaLoading(false)
    }
  }

  const formatViews = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
    return v.toString()
  }

  if (loading) {
    return (
      <LoadingSpinner size="lg" message="Loading monetization data..." />
    )
  }

  return (
    <div>
      <PageHeader
        title="Monetization"
        subtitle="Earnings Calculator & Revenue Projections"
      />

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={loadData} dismissible onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
        <StatCard
          icon="💰"
          label="Total Estimated"
          value={`$${report?.summary?.totalEstimated?.toFixed(2) || '0.00'}`}
          color="bg-green-500"
        />
        <StatCard
          icon="👁️"
          label="Total Views"
          value={report?.summary?.totalViews?.toLocaleString() || 0}
        />
        <StatCard
          icon="🎬"
          label="Videos Tracked"
          value={report?.summary?.videoCount || 0}
        />
        <StatCard
          icon="📈"
          label="Avg RPM"
          value={`$${report?.summary?.averageRPM?.toFixed(2) || '0.00'}`}
          color="gradient"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Earnings Calculator */}
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
            <div className="p-4 sm:p-5 bg-green-500/10 rounded-2xl border border-green-500/30">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">Estimated Earnings</div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-400 mt-2">${earnings.estimated?.toFixed(2)}</div>
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
          {niches.length > 0 ? (
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
          ) : (
            <EmptyState
              icon="📊"
              title="No Niche Data"
              description="Run the pipeline to see RPM data."
            />
          )}

          {/* Affiliate CTA Section */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">💰 Affiliate Suggestions</h3>
            {ctaLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Loading suggestions...
              </div>
            ) : ctaError ? (
              <ErrorMessage message={ctaError} onRetry={loadAffiliateCTA} />
            ) : affiliateCTA ? (
              <div className="space-y-3">
                {affiliateCTA.products ? (
                  <div className="space-y-2">
                    {affiliateCTA.products.map((p, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{p.commission} commission</div>
                          </div>
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                            ${p.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="text-sm text-blue-300">{affiliateCTA.suggestion || affiliateCTA.message || 'No affiliate suggestions available for this niche.'}</div>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {affiliateCTA.source || 'Based on your niche performance'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select a niche to see affiliate suggestions</div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Revenue Projections</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/5 rounded-xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">${report?.projections?.at100kViews?.toFixed(0) || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-2">At 100K Views</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">${report?.projections?.at1mViews?.toFixed(0) || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-2">At 1M Views</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">${report?.projections?.monthly?.toFixed(0) || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-2">Monthly Potential</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-4 sm:p-5 text-center border border-red-500/30">
            <div className="text-2xl sm:text-3xl font-bold text-red-400">${report?.projections?.yearly?.toFixed(0) || 0}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-2">Yearly Potential</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Monetization
