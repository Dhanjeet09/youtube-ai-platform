/**
 * Monetization - Earnings calculator, revenue projections, and affiliate CTAs
 * Kinetic Glass design: two-column layout, line chart placeholder, affiliate grid
 */
import { useState, useEffect } from 'react'
import { getHighRpmNiches, getEarningsEstimate, getEarningsReport, getAffiliateCTA, generateStrategy } from '../../services/api'
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
  const [affiliateCTA, setAffiliateCTA] = useState(null)
  const [ctaLoading, setCtaLoading] = useState(false)
  const [ctaError, setCtaError] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [strategyError, setStrategyError] = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedViews(views), 300)
    return () => clearTimeout(timer)
  }, [views])

  useEffect(() => {
    if (selectedNiche) { calculateEarnings(); loadAffiliateCTA() }
  }, [selectedNiche, debouncedViews])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getHighRpmNiches()
      setNiches(res.data.data)
      if (res.data.data.length > 0) setSelectedNiche(res.data.data[0].key)
      const reportRes = await getEarningsReport()
      setReport(reportRes.data.data)
    } catch (err) { setError(err.response?.data?.message || 'Failed to load monetization data') }
    finally { setLoading(false) }
  }

  const calculateEarnings = async () => {
    try { const res = await getEarningsEstimate(selectedNiche, views); setEarnings(res.data.data) }
    catch { /* silent */ }
  }

  const loadAffiliateCTA = async () => {
    setCtaLoading(true); setCtaError(null)
    try { const res = await getAffiliateCTA(selectedNiche); setAffiliateCTA(res.data.data) }
    catch (err) { setCtaError(err.response?.data?.message || 'Failed to load affiliate suggestions') }
    finally { setCtaLoading(false) }
  }

  const handleGenerateStrategy = async () => {
    setStrategyLoading(true); setStrategyError(null)
    try {
      const res = await generateStrategy(selectedNiche)
      setStrategy(res.data.data)
    } catch (err) { setStrategyError(err.response?.data?.message || 'Failed to generate strategy') }
    finally { setStrategyLoading(false) }
  }

  const formatViews = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
    return v.toString()
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading monetization data..." />

  return (
    <div>
      <PageHeader title="Monetization Calculator" subtitle="Earnings Calculator & Revenue Projections" />

      {error && <div className="mb-6"><ErrorMessage message={error} onRetry={loadData} dismissible onDismiss={() => setError(null)} /></div>}

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon="💰" label="Total Estimated" value={`$${report?.summary?.totalEstimated?.toFixed(2) || '0.00'}`} color="bg-tertiary" />
        <StatCard icon="👁️" label="Total Views" value={report?.summary?.totalViews?.toLocaleString() || 0} />
        <StatCard icon="🎬" label="Videos Tracked" value={report?.summary?.videoCount || 0} />
        <StatCard icon="📈" label="Avg RPM" value={`$${report?.summary?.averageRPM?.toFixed(2) || '0.00'}`} color="gradient-primary" />
      </div>

      {/* ═══ Main Content: Two Columns ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Calculator (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Earnings Calculator</h3>

            {/* Niche Selector */}
            <div className="mb-5">
              <div className="text-body-sm text-gray-500 mb-2">Select Niche</div>
              <CustomSelect
                value={selectedNiche}
                onChange={setSelectedNiche}
                options={niches.map(n => ({ value: n.key, label: `${NICHE_ICONS[n.key] || '📁'} ${n.name}`, sublabel: `$${n.rpm} RPM` }))}
                placeholder="Choose niche..."
              />
            </div>

            {/* Views Slider */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <div className="text-body-sm text-gray-500">Estimated Views</div>
                <div className="text-2xl font-bold text-primary">{formatViews(views)}</div>
              </div>
              <input
                type="range" min="1000" max="10000000" step="1000" value={views}
                onChange={(e) => setViews(parseInt(e.target.value))}
                className="w-full accent-primary-container h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:gradient-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1K</span><span>100K</span><span>1M</span><span>10M</span>
              </div>
            </div>

            {/* Revenue Total */}
            {earnings && (
              <div className="p-5 bg-tertiary/10 rounded-2xl border border-tertiary/30">
                <div className="text-center mb-4">
                  <div className="text-body-sm text-gray-400">Estimated Earnings</div>
                  <div className="text-4xl font-bold text-tertiary mt-2">${earnings.estimated?.toFixed(2)}</div>
                  <div className="text-body-sm text-gray-500 mt-1">At ${earnings.rpm}$ RPM</div>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-gray-400">AdSense (40%)</span>
                    <span className="text-tertiary font-medium">${earnings.breakdown?.ads?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Affiliate (60%)</span>
                    <span className="text-tertiary font-medium">${earnings.breakdown?.affiliate?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Projections (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Projections Chart Area */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Revenue Projections</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'At 100K Views', value: report?.projections?.at100kViews?.toFixed(0) || 0, color: 'bg-tertiary/20 text-tertiary' },
                { label: 'At 1M Views', value: report?.projections?.at1mViews?.toFixed(0) || 0, color: 'bg-secondary/20 text-secondary' },
                { label: 'Monthly Potential', value: report?.projections?.monthly?.toFixed(0) || 0, color: 'bg-primary-container/20 text-primary-container' },
                { label: 'Yearly Potential', value: report?.projections?.yearly?.toFixed(0) || 0, color: 'bg-yellow-500/20 text-yellow-400' },
              ].map(p => (
                <div key={p.label} className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-tertiary">${p.value}</div>
                  <div className="text-body-sm text-gray-500 mt-2">{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* High RPM Niches */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">High RPM Niches</h3>
            {niches.length > 0 ? (
              <div className="space-y-2">
                {niches.map(n => (
                  <div key={n.key}
                    className={`p-4 rounded-xl border transition cursor-pointer ${selectedNiche === n.key ? 'bg-primary-container/10 border-primary-container/30' : 'bg-white/[0.03] border-glass-border hover:border-white/20'}`}
                    onClick={() => setSelectedNiche(n.key)}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/[0.06] rounded-xl flex items-center justify-center text-xl">{NICHE_ICONS[n.key] || '📁'}</div>
                        <div>
                          <div className="font-semibold text-body-sm">{n.name}</div>
                          <div className="text-xs text-gray-500">{n.keywords?.slice(0, 2).join(', ')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-tertiary">${n.rpm}</div>
                        <div className="text-xs text-gray-500">RPM</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📊" title="No Niche Data" description="Run the pipeline to see RPM data." />
            )}
          </div>

          {/* Affiliate Programs */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Affiliate Programs</h3>
            {ctaLoading ? (
              <div className="flex items-center gap-2 text-body-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Loading suggestions...
              </div>
            ) : ctaError ? (
              <ErrorMessage message={ctaError} onRetry={loadAffiliateCTA} />
            ) : affiliateCTA?.products ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {affiliateCTA.products.map((p, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-xl p-4 border border-glass-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-body-sm">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{p.commission} commission</div>
                      </div>
                      <span className="chip chip-active">${p.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : affiliateCTA ? (
              <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4">
                <div className="text-body-sm text-secondary">{affiliateCTA.suggestion || affiliateCTA.message || 'No suggestions available'}</div>
              </div>
            ) : (
              <div className="text-body-sm text-gray-500">Select a niche to see affiliate suggestions</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Generate Strategy Button ═══ */}
      <button onClick={handleGenerateStrategy} disabled={strategyLoading}
        className="w-full px-6 py-4 gradient-primary rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 touch-target disabled:opacity-50">
        {strategyLoading ? (
          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating...</>
        ) : (
          <>
            <span className="material-symbols-outlined text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>auto_awesome</span>
            Generate Strategy
          </>
        )}
      </button>

      {strategyError && <div className="mt-4"><ErrorMessage message={strategyError} dismissible onDismiss={() => setStrategyError(null)} /></div>}

      {/* ═══ Strategy Results ═══ */}
      {strategy && (
        <div className="mt-6 glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>auto_awesome</span>
            <h3 className="text-title-md font-semibold">{strategy.niche} Monetization Strategy</h3>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-tertiary/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-tertiary">${strategy.rpm}</div>
              <div className="text-body-sm text-gray-500 mt-1">RPM</div>
            </div>
            <div className="bg-secondary/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-secondary">${strategy.estimatedEarningsPer100k}</div>
              <div className="text-body-sm text-gray-500 mt-1">Per 100K Views</div>
            </div>
            <div className="bg-primary-container/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary-container">${strategy.breakdown?.ads?.toFixed(2)}</div>
              <div className="text-body-sm text-gray-500 mt-1">Ad Revenue (40%)</div>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">${strategy.breakdown?.affiliate?.toFixed(2)}</div>
              <div className="text-body-sm text-gray-500 mt-1">Affiliate (60%)</div>
            </div>
          </div>

          {/* Recommendations */}
          <h4 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Recommendations</h4>
          <div className="space-y-2 mb-6">
            {strategy.recommendations?.map((rec, i) => (
              <div key={i} className="bg-white/[0.03] rounded-xl p-4 border border-glass-border">
                <div className="flex items-start gap-3">
                  <span className={`chip text-xs ${rec.priority === 'high' ? 'bg-primary-container/20 text-primary-container border-primary-container/30' : 'bg-secondary/20 text-secondary border-secondary/30'}`}>{rec.priority}</span>
                  <div className="flex-1">
                    <div className="font-medium text-body-sm">{rec.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{rec.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Template */}
          <div className="bg-tertiary/10 rounded-xl p-4 border border-tertiary/20">
            <div className="text-xs text-gray-500 mb-1">Suggested CTA</div>
            <div className="text-body-sm text-tertiary font-medium">"{strategy.ctaTemplate}"</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Monetization
