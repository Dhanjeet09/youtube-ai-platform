/**
 * Assets - Media asset management with 4-column grid, hover overlays, type badges
 * Kinetic Glass design
 */
import { useState, useEffect, useCallback } from 'react'
import { getAssets, getAssetStats, deleteAsset, deleteAllAssets } from '../../services/api'
import { useAppState } from '../../context/AppContext'
import PageHeader from '../../components/PageHeader'
import TabBar from '../../components/TabBar'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import ErrorMessage from '../../components/ErrorMessage'
import ConfirmDialog from '../../components/ConfirmDialog'

const TABS = [
  { id: 'all', label: 'All', icon: 'folder' },
  { id: 'final', label: 'Videos', icon: 'smart_display' },
  { id: 'audio', label: 'Audio', icon: 'audiotrack' },
  { id: 'videos', label: 'Stock', icon: 'movie' },
  { id: 'subtitles', label: 'Subs', icon: 'subtitles' }
]

function Assets() {
  const { assetRefreshKey } = useAppState()
  const [activeTab, setActiveTab] = useState('all')
  const [assets, setAssets] = useState({ audio: [], videos: [], final: [], subtitles: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null, variant: 'default' })
  const [deletingPath, setDeletingPath] = useState(null)
  const [previewAsset, setPreviewAsset] = useState(null)

  useEffect(() => { loadAssets() }, [assetRefreshKey])

  const loadAssets = async () => {
    setLoading(true)
    setError(null)
    try {
      const [assetsRes, statsRes] = await Promise.all([getAssets(), getAssetStats()])
      setAssets(assetsRes.data.data)
      setStats(statsRes.data.data)
    } catch (err) { setError(err.response?.data?.message || 'Failed to load assets') }
    finally { setLoading(false) }
  }

  const showConfirm = (title, message, onConfirm, variant = 'default') => {
    setConfirmConfig({ title, message, onConfirm, variant })
    setConfirmOpen(true)
  }

  const handleDelete = async (filePath) => {
    setDeletingPath(filePath)
    try { await deleteAsset(filePath); setConfirmOpen(false); loadAssets() }
    catch (err) { setError(err.response?.data?.message || 'Delete failed') }
    finally { setDeletingPath(null) }
  }

  const handleDeleteAll = async (type) => {
    setDeletingPath(type)
    try { await deleteAllAssets(type); setConfirmOpen(false); loadAssets() }
    catch (err) { setError(err.response?.data?.message || 'Delete failed') }
    finally { setDeletingPath(null) }
  }

  const requestDelete = (filePath) => showConfirm('Delete Asset', 'Are you sure? This cannot be undone.', () => handleDelete(filePath), 'danger')
  const requestDeleteAll = (type) => {
    const label = type === 'all' ? 'all assets' : `${type} assets`
    showConfirm(`Delete ${label}`, `Delete all ${label}? This cannot be undone.`, () => handleDeleteAll(type), 'danger')
  }

  const getIcon = useCallback((type) => {
    const icons = { audio: 'audiotrack', videos: 'movie', final: 'smart_display', subtitles: 'subtitles' }
    return icons[type] || 'description'
  }, [])

  const getMediaType = useCallback((type) => {
    if (type === 'audio') return 'audio'
    if (type === 'final' || type === 'videos') return 'video'
    return null
  }, [])

  const getAssetsForTab = useCallback(() => {
    if (activeTab === 'all') {
      return [
        ...(assets.final || []).map(f => ({ type: 'final', ...f })),
        ...(assets.audio || []).map(f => ({ type: 'audio', ...f })),
        ...(assets.videos || []).map(f => ({ type: 'videos', ...f }))
      ]
    }
    return (assets[activeTab] || []).map(f => ({ type: activeTab, ...f }))
  }, [activeTab, assets])

  const displayAssets = getAssetsForTab()

  if (loading && !assets.audio?.length && !assets.videos?.length) {
    return <LoadingSpinner size="lg" message="Loading assets..." />
  }

  return (
    <div>
      <PageHeader title="Asset Library" subtitle="Media files and generated content" action={{ label: 'Refresh', onClick: loadAssets }} />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={loadAssets} dismissible onDismiss={() => setError(null)} />
        </div>
      )}

      {/* ═══ Stats Grid ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Audio Files', value: stats?.audio || 0, icon: 'audiotrack', color: 'bg-secondary/20 text-secondary' },
          { label: 'Stock Videos', value: stats?.videos || 0, icon: 'movie', color: 'bg-tertiary/20 text-tertiary' },
          { label: 'Final Videos', value: stats?.final || 0, icon: 'smart_display', color: 'bg-primary-container/20 text-primary-container' },
          { label: 'Total Size', value: stats?.totalSize || '0 MB', icon: 'sd_storage', color: 'bg-white/[0.06] text-gray-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 relative overflow-hidden">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{s.icon}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-body-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ Tab Bar ═══ */}
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* ═══ Asset Grid ═══ */}
      {displayAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayAssets.map((f, i) => {
            const mediaType = getMediaType(f.type)
            return (
              <div key={i} className="glass rounded-xl overflow-hidden card-hover group">
                {/* Thumbnail area */}
                <div className="h-36 bg-white/[0.03] flex items-center justify-center relative cursor-pointer"
                  onClick={() => mediaType && setPreviewAsset(f)}>
                  <span className="material-symbols-outlined text-5xl text-gray-600" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>
                    {getIcon(f.type)}
                  </span>
                  {/* Type badge */}
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 rounded-md text-[10px] font-medium uppercase tracking-wider text-gray-300">
                    {f.type}
                  </span>
                  {/* Hover overlay */}
                  {mediaType && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition text-body-sm bg-black/60 px-4 py-2 rounded-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_circle</span>
                        Preview
                      </span>
                    </div>
                  )}
                </div>
                {/* Card info */}
                <div className="p-3.5">
                  <div className="text-body-sm font-medium truncate" title={f.name}>{f.name}</div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                    <span>{f.sizeFormatted}</span>
                    <span>{f.modified ? new Date(f.modified).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = f.path
                        a.download = f.name
                        a.click()
                      }}
                      className="flex-1 py-2 glass rounded-lg hover:bg-white/[0.08] transition text-body-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>download</span>
                      Download
                    </button>
                    <button
                      onClick={() => requestDelete(f.path)}
                      className="py-2 px-3 bg-primary-container/15 text-primary rounded-lg border border-primary-container/30 hover:bg-primary-container/25 transition text-body-sm flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<span className="material-symbols-outlined text-5xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{getIcon(activeTab)}</span>}
          title={`No ${activeTab === 'all' ? '' : activeTab} Assets Found`}
          description="Run the pipeline to generate assets"
        />
      )}

      {/* ═══ Manage Assets ═══ */}
      <div className="glass rounded-2xl p-5 sm:p-6 mt-6">
        <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Manage Assets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => requestDeleteAll('audio')} className="w-full px-3 py-3 bg-primary-container/15 text-primary rounded-xl border border-primary-container/30 hover:bg-primary-container/25 transition text-body-sm font-medium touch-target flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>audiotrack</span> Audio
          </button>
          <button onClick={() => requestDeleteAll('videos')} className="w-full px-3 py-3 bg-primary-container/15 text-primary rounded-xl border border-primary-container/30 hover:bg-primary-container/25 transition text-body-sm font-medium touch-target flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>movie</span> Videos
          </button>
          <button onClick={() => requestDeleteAll('final')} className="w-full px-3 py-3 bg-primary-container/15 text-primary rounded-xl border border-primary-container/30 hover:bg-primary-container/25 transition text-body-sm font-medium touch-target flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>smart_display</span> Final
          </button>
          <button onClick={() => requestDeleteAll('all')} className="w-full px-3 py-3 bg-primary-container text-white rounded-xl hover:bg-primary-dark transition text-body-sm font-medium touch-target flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>delete_sweep</span> All
          </button>
        </div>
      </div>

      {/* ═══ Media Preview Modal ═══ */}
      {previewAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" onClick={() => setPreviewAsset(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative glass rounded-2xl p-5 sm:p-6 max-w-2xl w-full border border-glass-border shadow-2xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-3 mb-4">
              <h3 className="font-semibold text-body-sm sm:text-base truncate">{previewAsset.name}</h3>
              <button onClick={() => setPreviewAsset(null)} className="text-gray-400 hover:text-white transition p-1 touch-target" aria-label="Close preview">
                <span className="material-symbols-outlined" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>close</span>
              </button>
            </div>
            <div className="bg-black/60 rounded-xl overflow-hidden">
              {getMediaType(previewAsset.type) === 'audio' ? (
                <div className="p-6 sm:p-8 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-500 mb-4" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>audiotrack</span>
                  <audio controls className="w-full" src={previewAsset.path}>Your browser does not support audio playback.</audio>
                </div>
              ) : (
                <div className="p-4">
                  <video controls className="w-full rounded-lg max-h-[400px]" src={previewAsset.path}>Your browser does not support video playback.</video>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-body-sm">
              <div className="truncate"><span className="text-gray-500">Size:</span> {previewAsset.sizeFormatted}</div>
              <div className="truncate"><span className="text-gray-500">Modified:</span> {previewAsset.modified ? new Date(previewAsset.modified).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmOpen} title={confirmConfig.title} message={confirmConfig.message} confirmLabel="Delete" cancelLabel="Cancel" variant={confirmConfig.variant} loading={!!deletingPath} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}

export default Assets
