/**
 * Dashboard - Main overview page with stats, pipeline status, and niche performance
 * 
 * Uses shared components: PageHeader, StatCard, StatusBadge, LoadingSpinner, ErrorMessage, EmptyState
 * Pipeline status is read from AppContext (set by Workflow page)
 */
import { useApi } from '../../hooks/useApi'
import { useAppState } from '../../context/AppContext'
import { getBestNiche, getNicheStats, getNicheHealth, getAssetStats } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import EmptyState from '../../components/EmptyState'
import { NICHE_ICONS } from '../../constants'

function Dashboard() {
  const { pipelineStatus } = useAppState()

  const {
    data: bestNiche,
    loading: loadingBest,
    error: bestError,
    execute: refreshBest
  } = useApi(getBestNiche)

  const {
    data: stats,
    loading: loadingStats,
    error: statsError,
    execute: refreshStats
  } = useApi(getNicheStats)

  const {
    data: health,
    loading: loadingHealth,
    error: healthError,
    execute: refreshHealth
  } = useApi(getNicheHealth)

  const {
    data: assetStats,
    loading: loadingAsset,
    error: assetError,
    execute: refreshAsset
  } = useApi(getAssetStats)

  const loading = loadingBest || loadingStats || loadingHealth || loadingAsset

  const handleRefresh = () => {
    refreshBest()
    refreshStats()
    refreshHealth()
    refreshAsset()
  }

  if (loading && !bestNiche && !stats && !assetStats) {
    return (
      <LoadingSpinner size="lg" message="Loading dashboard..." />
    )
  }

  const hasError = bestError || statsError || healthError || assetError

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your video empire at a glance"
        action={{ label: '↻ Refresh', onClick: handleRefresh }}
      />

      {/* Error banner */}
      {hasError && (
        <div className="mb-6">
          <ErrorMessage
            message={[bestError, statsError, healthError, assetError].filter(Boolean)}
            onRetry={handleRefresh}
            dismissible
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon="🏆"
          label="Best Niche"
          value={bestNiche?.niche || 'N/A'}
          loading={loadingBest && !bestNiche}
          color="gradient"
        />
        <StatCard
          icon="🎬"
          label="Videos Created"
          value={assetStats?.final || 0}
          loading={loadingAsset && !assetStats}
          color="bg-green-500"
        />
        <StatCard
          icon="📁"
          label="Total Assets"
          value={((assetStats?.audio || 0) + (assetStats?.videos || 0)).toString()}
          loading={loadingAsset && !assetStats}
          color="bg-orange-500"
        />
        <StatCard
          icon="⏰"
          label="Scheduler"
          value="3/day"
          color="bg-cyan-500"
        />
      </div>

      {/* Pipeline Status Card (if active pipeline exists) */}
      {pipelineStatus && (
        <div className="glass rounded-2xl p-6 mb-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider">Active Pipeline</h3>
            <StatusBadge status={pipelineStatus.status === 'running' ? 'info' : pipelineStatus.status === 'error' ? 'error' : 'success'}>
              {pipelineStatus.status}
            </StatusBadge>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm text-gray-300">
              Step {pipelineStatus.step || '-'}/6: {pipelineStatus.stepLabel || 'Processing...'}
            </span>
            <span className="text-sm text-gray-500">{pipelineStatus.progress || 0}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full gradient rounded-full transition-all duration-700"
              style={{ width: `${pipelineStatus.progress || 0}%` }}
            />
          </div>
          {pipelineStatus.logs && pipelineStatus.logs.length > 0 && (
            <div className="mt-3 bg-black/40 rounded-xl p-3 max-h-[120px] overflow-y-auto">
              {pipelineStatus.logs.slice(-3).map((log, i) => (
                <div key={i} className="text-xs text-gray-500 font-mono mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {health && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Recommendation</h3>
              <p className="text-lg">{health.recommendation || 'Run pipeline to get recommendations'}</p>
            </div>
            {health.healthyNiches?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {health.healthyNiches.map(n => (
                  <span key={n} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium border border-green-500/30">
                    {NICHE_ICONS[n] || '📁'} {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Niche Performance */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Niche Performance</h3>
        {loadingStats && !stats ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 skeleton rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton rounded w-24"></div>
                    <div className="h-3 skeleton rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : stats && stats.length > 0 ? (
          <div className="space-y-3">
            {stats.map((s, i) => {
              const isBest = s.niche === bestNiche?.niche
              return (
                <div
                  key={i}
                  className={`bg-white/5 rounded-xl p-4 border transition-all ${
                    isBest ? 'border-red-500/30 bg-red-500/5' : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {NICHE_ICONS[s.niche] || '📁'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate-mobile">{s.niche}</span>
                          {isBest && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium whitespace-nowrap">Best</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{s.videoCount} videos</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-medium text-sm sm:text-base">{s.totalViralScore}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Avg</div>
                        <div className="text-base sm:text-lg font-bold">{s.averageViralScore}</div>
                      </div>
                      <StatusBadge grade={s.grade} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="📊"
            title="No Niche Data Yet"
            description="Run the pipeline to see niche performance metrics."
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard
