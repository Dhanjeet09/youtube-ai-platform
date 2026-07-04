/**
 * Dashboard - Main overview page with stats, pipeline status, quick actions, and niche performance
 * Kinetic Glass design: refined glassmorphism with score bars
 * 
 * Uses shared components: PageHeader, StatCard, StatusBadge, LoadingSpinner, ErrorMessage, EmptyState
 */
import { useApi } from '../../hooks/useApi'
import { useAppState } from '../../context/AppContext'
import { getBestNiche, getNicheStats, getNicheHealth, getAssetStats, getEarningsReport, getActivePipelines } from '../../services/api'
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

  const {
    data: earningsReport,
    loading: loadingEarnings,
    error: earningsError,
    execute: refreshEarnings
  } = useApi(getEarningsReport)

  const {
    data: activePipelines,
    loading: loadingPipelines,
    error: pipelinesError,
    execute: refreshPipelines
  } = useApi(getActivePipelines)

  const loading = loadingBest || loadingStats || loadingHealth || loadingAsset || loadingEarnings || loadingPipelines

  const handleRefresh = () => {
    refreshBest()
    refreshStats()
    refreshHealth()
    refreshAsset()
    refreshEarnings()
    refreshPipelines()
  }

  if (loading && !bestNiche && !stats && !assetStats) {
    return <LoadingSpinner size="lg" message="Loading dashboard..." />
  }

  const hasError = bestError || statsError || healthError || assetError || earningsError || pipelinesError

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your video empire at a glance"
        action={{ label: 'Refresh', onClick: handleRefresh }}
      />

      {hasError && (
        <div className="mb-6">
          <ErrorMessage
            message={[bestError, statsError, healthError, assetError, earningsError, pipelinesError].filter(Boolean)}
            onRetry={handleRefresh}
            dismissible
          />
        </div>
      )}

      {/* ═══ Stats Grid ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="🎬"
          label="Total Videos"
          value={assetStats?.final || 0}
          loading={loadingAsset && !assetStats}
          color="gradient-primary"
        />
        <StatCard
          icon="⚡"
          label="Active Pipelines"
          value={activePipelines?.count ?? (pipelineStatus?.status === 'running' ? 1 : 0)}
          loading={loadingPipelines && !activePipelines}
          color="gradient"
        />
        <StatCard
          icon="📊"
          label="Success Rate"
          value={stats?.length > 0 ? `${Math.round(stats.reduce((a, s) => a + (s.averageViralScore || 0), 0) / stats.length)}%` : '—'}
          loading={loadingStats && !stats}
          color="bg-tertiary"
        />
        <StatCard
          icon="💰"
          label="Est. Revenue"
          value={`$${earningsReport?.summary?.totalEstimated?.toFixed(2) || '0.00'}`}
          loading={loadingEarnings && !earningsReport}
          color="bg-secondary"
        />
      </div>

      {/* ═══ Pipeline Status ═══ */}
      {pipelineStatus && pipelineStatus.status === 'running' && (
        <div className="glass rounded-2xl p-6 mb-6 border border-primary-container/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider">Active Pipeline</h3>
            <StatusBadge status="info">{pipelineStatus.status}</StatusBadge>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-body-sm text-gray-300">
              Step {pipelineStatus.step || '-'}/6: {pipelineStatus.stepLabel || 'Processing...'}
            </span>
            <span className="text-body-sm text-gray-500">{pipelineStatus.progress || 0}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-700"
              style={{ width: `${pipelineStatus.progress || 0}%` }}
            />
          </div>
          {pipelineStatus.logs && pipelineStatus.logs.length > 0 && (
            <div className="mt-3 bg-black/40 rounded-xl p-3 max-h-[120px] overflow-y-auto font-mono">
              {pipelineStatus.logs.slice(-3).map((log, i) => (
                <div key={i} className="text-xs text-gray-500 mb-1">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Quick Actions ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'New Script', icon: 'edit_note', path: '/generator', color: 'gradient-primary' },
          { label: 'Run Pipeline', icon: 'play_circle', path: '/workflow', color: 'gradient' },
          { label: 'View Assets', icon: 'folder', path: '/assets', color: 'glass' },
        ].map(action => (
          <a
            key={action.label}
            href={action.path}
            className={`glass rounded-xl p-4 flex items-center gap-3 card-hover group ${
              action.color === 'glass' ? 'hover:bg-white/[0.08]' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              action.color === 'gradient-primary' ? 'bg-primary-container/20' :
              action.color === 'gradient' ? 'bg-tertiary/20' : 'bg-white/[0.06]'
            }`}>
              <span className={`material-symbols-outlined text-xl ${
                action.color === 'gradient-primary' ? 'text-primary-container' :
                action.color === 'gradient' ? 'text-tertiary' : 'text-gray-400'
              }`} style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{action.icon}</span>
            </div>
            <span className="text-body-sm font-medium">{action.label}</span>
          </a>
        ))}
      </div>

      {/* ═══ Recommendation ═══ */}
      {health && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-2">Recommendation</h3>
              <p className="text-body-lg">{health.recommendation || 'Run pipeline to get recommendations'}</p>
            </div>
            {health.healthyNiches?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {health.healthyNiches.map(n => (
                  <span key={n} className="chip chip-active">
                    {NICHE_ICONS[n] || '📁'} {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Niche Performance ═══ */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Niche Performance</h3>
        {loadingStats && !stats ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/[0.03] rounded-xl p-4">
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
              const scorePct = Math.min(100, Math.max(0, (s.averageViralScore || 0) * 10))
              return (
                <div
                  key={i}
                  className={`bg-white/[0.03] rounded-xl p-4 border transition-all ${
                    isBest ? 'border-primary-container/30 bg-primary-container/5' : 'border-glass-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white/[0.06] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {NICHE_ICONS[s.niche] || '📁'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-body-sm truncate-mobile">{s.niche}</span>
                          {isBest && (
                            <span className="px-2 py-0.5 bg-primary-container/20 text-primary-container rounded text-xs font-medium whitespace-nowrap">Best</span>
                          )}
                        </div>
                        <div className="text-body-sm text-gray-500">{s.videoCount} videos</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Score bar */}
                      <div className="w-24 sm:w-32">
                        <div className="score-bar">
                          <div
                            className={`score-bar-fill ${isBest ? 'bg-gradient-to-r from-primary-container to-primary' : 'bg-white/20'}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Avg</div>
                        <div className="font-bold text-body-sm">{s.averageViralScore}</div>
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
