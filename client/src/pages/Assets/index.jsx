/**
 * Assets - Media asset management with preview, confirm dialogs, and TabBar
 * 
 * Replaces alert()/confirm() with ConfirmDialog component.
 * Adds media preview for audio/video files.
 * Uses TabBar for tab navigation.
 * Uses shared components: PageHeader, LoadingSpinner, EmptyState, ErrorMessage, ConfirmDialog, TabBar
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
  { id: 'all', label: 'All', icon: '📁' },
  { id: 'final', label: 'Final', icon: '▶️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'subtitles', label: 'Subs', icon: '📝' }
]

function Assets() {
  const { assetRefreshKey } = useAppState()
  const [activeTab, setActiveTab] = useState('all')
  const [assets, setAssets] = useState({ audio: [], videos: [], final: [], subtitles: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null, variant: 'default' })
  const [deletingPath, setDeletingPath] = useState(null)

  // Media preview
  const [previewAsset, setPreviewAsset] = useState(null)

  useEffect(() => {
    loadAssets()
  }, [assetRefreshKey])

  const loadAssets = async () => {
    setLoading(true)
    setError(null)
    try {
      const [assetsRes, statsRes] = await Promise.all([
        getAssets(),
        getAssetStats()
      ])
      setAssets(assetsRes.data.data)
      setStats(statsRes.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  const showConfirm = (title, message, onConfirm, variant = 'default') => {
    setConfirmConfig({ title, message, onConfirm, variant })
    setConfirmOpen(true)
  }

  const handleDelete = async (filePath) => {
    setDeletingPath(filePath)
    try {
      await deleteAsset(filePath)
      setConfirmOpen(false)
      loadAssets()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeletingPath(null)
    }
  }

  const handleDeleteAll = async (type) => {
    setDeletingPath(type)
    try {
      await deleteAllAssets(type)
      setConfirmOpen(false)
      loadAssets()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeletingPath(null)
    }
  }

  const requestDelete = (filePath) => {
    showConfirm(
      'Delete Asset',
      'Are you sure you want to delete this file? This cannot be undone.',
      () => handleDelete(filePath),
      'danger'
    )
  }

  const requestDeleteAll = (type) => {
    const label = type === 'all' ? 'all assets' : `${type} assets`
    showConfirm(
      `Delete ${label}`,
      `Are you sure you want to delete all ${label}? This cannot be undone.`,
      () => handleDeleteAll(type),
      'danger'
    )
  }

  const getIcon = useCallback((type) => {
    switch (type) {
      case 'audio': return '🎵'
      case 'videos': return '🎬'
      case 'final': return '▶️'
      case 'subtitles': return '📝'
      default: return '📄'
    }
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
    return (
      <LoadingSpinner size="lg" message="Loading assets..." />
    )
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle="Media files and generated content"
        action={{ label: '↻ Refresh', onClick: loadAssets }}
      />

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={loadAssets} dismissible onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
        <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
          <div className="text-2xl sm:text-3xl font-bold">{stats?.audio || 0}</div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">Audio Files</div>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          <div className="text-2xl sm:text-3xl font-bold">{stats?.videos || 0}</div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">Stock Videos</div>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient"></div>
          <div className="text-2xl sm:text-3xl font-bold">{stats?.final || 0}</div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">Final Videos</div>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold truncate">{stats?.totalSize || '0 MB'}</div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">Total Size</div>
        </div>
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Asset Grid */}
      {displayAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayAssets.map((f, i) => {
            const mediaType = getMediaType(f.type)
            return (
              <div key={i} className="glass rounded-xl overflow-hidden hover:-translate-y-1 transition-all hover:shadow-lg hover:shadow-black/20 group">
                <div
                  className="h-40 bg-white/5 flex items-center justify-center text-6xl text-gray-600 relative cursor-pointer"
                  onClick={() => mediaType && setPreviewAsset(f)}
                >
                  {getIcon(f.type)}
                  <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs">
                    {f.type}
                  </span>
                  {mediaType && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition text-sm bg-black/50 px-3 py-1.5 rounded-lg">
                        ▶ Preview
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium truncate" title={f.name}>{f.name}</div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{f.sizeFormatted}</span>
                    <span>{f.modified ? new Date(f.modified).toLocaleDateString() : ''}</span>
                  </div>
                  {activeTab !== 'all' && (
                    <button
                      onClick={() => requestDelete(f.path)}
                      className="w-full mt-3 py-2 bg-red-500/15 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/25 transition text-sm font-medium"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={getIcon(activeTab)}
          title={`No ${activeTab === 'all' ? '' : activeTab} Assets Found`}
          description="Run the pipeline to generate assets"
        />
      )}

      {/* Manage Assets */}
      <div className="glass rounded-2xl p-4 sm:p-6 mt-6 lg:mt-8">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Manage Assets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => requestDeleteAll('audio')} className="w-full px-3 py-3 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition text-sm font-medium touch-target flex items-center justify-center gap-1.5">
            🎵 Audio
          </button>
          <button onClick={() => requestDeleteAll('videos')} className="w-full px-3 py-3 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition text-sm font-medium touch-target flex items-center justify-center gap-1.5">
            🎬 Videos
          </button>
          <button onClick={() => requestDeleteAll('final')} className="w-full px-3 py-3 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/25 transition text-sm font-medium touch-target flex items-center justify-center gap-1.5">
            ▶️ Final
          </button>
          <button onClick={() => requestDeleteAll('all')} className="w-full px-3 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition text-sm font-medium touch-target flex items-center justify-center gap-1.5">
            🗑️ All
          </button>
        </div>
      </div>

      {/* Media Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" onClick={() => setPreviewAsset(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative glass rounded-2xl p-4 sm:p-6 max-w-2xl w-full border border-white/10 mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-3 mb-3 sm:mb-4">
              <h3 className="font-semibold text-sm sm:text-base truncate">{previewAsset.name}</h3>
              <button onClick={() => setPreviewAsset(null)} className="text-gray-400 hover:text-white transition p-1 touch-target" aria-label="Close preview">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-black/60 rounded-xl overflow-hidden">
              {getMediaType(previewAsset.type) === 'audio' ? (
                <div className="p-4 sm:p-8 text-center">
                  <div className="text-4xl sm:text-6xl mb-4">🎵</div>
                  <audio controls className="w-full" src={previewAsset.path}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  <div className="text-4xl sm:text-6xl text-center mb-4">🎬</div>
                  <video
                    controls
                    className="w-full rounded-lg max-h-[300px] sm:max-h-[400px]"
                    src={previewAsset.path}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
            </div>
            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="truncate">
                <span className="text-gray-500">Size:</span> {previewAsset.sizeFormatted}
              </div>
              <div className="truncate">
                <span className="text-gray-500">Modified:</span> {previewAsset.modified ? new Date(previewAsset.modified).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant={confirmConfig.variant}
        loading={!!deletingPath}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default Assets
