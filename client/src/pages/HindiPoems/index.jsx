/**
 * HindiPoems — Pipeline dashboard for Hindi poem Shorts generation
 *
 * Features:
 *  - Pipeline status overview (today's usage, last run)
 *  - One-click Generate / Dry Run actions
 *  - Real-time step-by-step progress with percentage
 *  - Completed video preview with YouTube link
 *  - Recent videos list
 *  - Error handling with retry
 *
 * Sub-components:
 *  - PipelineStatus  — usage stats + last-run indicator
 *  - QuickActions    — Generate Now, Dry Run, View History buttons
 *  - PipelineProgress — animated progress bar with step label
 *  - VideoPreview    — completed video metadata + actions
 *  - RecentVideos    — scrollable list of past runs
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  startHindiPoemPipeline,
  getPipelineJobStatus,
  getRecentPoemVideos,
  cancelPipelineJob,
  getPoemStatus,
} from '../../services/api'
import PageHeader from '../../components/PageHeader'

/* ─────────────────────────── constants ─────────────────────────── */

const PIPELINE_STEPS = [
  'Selecting random poem',
  'Generating Hindi TTS',
  'Downloading voice file',
  'Finding background video',
  'Downloading background',
  'Trimming background',
  'Adding text overlay',
  'Rendering portrait video',
  'Adding audio track',
  'Uploading to YouTube',
  'Setting video metadata',
  'Adding to playlist',
  'Generating thumbnail',
  'Done',
]

const POLL_INTERVAL_MS = 3000

/* ─────────────────────────── helpers ───────────────────────────── */

function timeAgo(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ────────────────────── PipelineStatus ─────────────────────────── */

function PipelineStatus({ status, loading }) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500/60 to-emerald-500/60" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 skeleton rounded w-32" />
            <div className="h-3 skeleton rounded w-48" />
          </div>
          <div className="h-8 skeleton rounded-xl w-28" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500/60 to-emerald-500/60" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${status?.lastRunSuccess ? 'bg-green-400' : 'bg-gray-500'}`}
            />
            <span className="text-sm font-medium text-gray-300">
              Last Run:{' '}
              <span className={status?.lastRunSuccess ? 'text-green-400' : 'text-gray-400'}>
                {status?.lastRunSuccess ? 'Success' : 'None yet'}
              </span>
            </span>
            {status?.lastRunTime && (
              <span className="text-xs text-gray-500">{timeAgo(status.lastRunTime)}</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              Today:{' '}
              <span className="text-white font-medium">{status?.usedToday ?? 0}</span>
              {' / '}
              <span className="text-gray-500">{status?.dailyLimit ?? 1}</span>
            </span>
            <span>
              Remaining:{' '}
              <span className="text-green-400 font-medium">{status?.remaining ?? 1}</span>
            </span>
          </div>
        </div>

        {status?.nextReset && (
          <span className="text-xs text-gray-600">
            Resets {timeAgo(status.nextReset)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────── QuickActions ─────────────────────────── */

function QuickActions({ onGenerate, onDryRun, isRunning, remaining }) {
  const disabled = isRunning || remaining <= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Generate Now */}
      <button
        onClick={() => onGenerate(false)}
        disabled={disabled}
        className="group relative glass rounded-2xl p-5 text-left transition-all duration-200 hover:border-green-500/30 hover:bg-green-500/[0.06] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent card-hover"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center group-hover:bg-green-500/25 transition-colors">
            {isRunning ? (
              <span className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <span
                className="material-symbols-outlined text-green-400 text-[22px]"
                style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
              >
                rocket_launch
              </span>
            )}
          </div>
        </div>
        <div className="text-sm font-semibold text-white mb-1">
          {isRunning ? 'Running...' : 'Generate Now'}
        </div>
        <div className="text-xs text-gray-500">One-click full pipeline</div>
      </button>

      {/* Dry Run */}
      <button
        onClick={() => onGenerate(true)}
        disabled={isRunning}
        className="group relative glass rounded-2xl p-5 text-left transition-all duration-200 hover:border-yellow-500/30 hover:bg-yellow-500/[0.06] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent card-hover"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center group-hover:bg-yellow-500/25 transition-colors">
            <span
              className="material-symbols-outlined text-yellow-400 text-[22px]"
              style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
            >
              science
            </span>
          </div>
        </div>
        <div className="text-sm font-semibold text-white mb-1">Dry Run</div>
        <div className="text-xs text-gray-500">Test without uploading</div>
      </button>

      {/* History */}
      <button
        onClick={() => {
          document.getElementById('recent-videos')?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="group relative glass rounded-2xl p-5 text-left transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/[0.06] card-hover"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
            <span
              className="material-symbols-outlined text-blue-400 text-[22px]"
              style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
            >
              history
            </span>
          </div>
        </div>
        <div className="text-sm font-semibold text-white mb-1">History</div>
        <div className="text-xs text-gray-500">View recent videos</div>
      </button>
    </div>
  )
}

/* ──────────────────────── PipelineProgress ─────────────────────── */

function PipelineProgress({ currentStep, totalSteps, stepLabel, progress, isRunning, onDryRun, onCancel }) {
  if (!isRunning) return null

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500/60 to-emerald-500/60" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-white">
            Step {currentStep}/{totalSteps}
          </span>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
          >
            close
          </span>
          Cancel
        </button>
      </div>

      {/* Step label */}
      <div className="text-sm text-gray-400 mb-3">{stepLabel}</div>

      {/* Progress bar */}
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00e479, #00a657)',
          }}
        />
      </div>

      {/* Percentage */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">
          {PIPELINE_STEPS[currentStep - 1] || ''}
        </span>
        <span className="text-xs font-medium text-green-400">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

/* ──────────────────────── VideoPreview ─────────────────────────── */

function VideoPreview({ video, loading }) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500/60 to-emerald-500/60" />
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 skeleton rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-48" />
            <div className="h-3 skeleton rounded w-32" />
            <div className="h-3 skeleton rounded w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (!video) return null

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500/60 to-emerald-500/60" />

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-green-400 text-[28px]"
            style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
          >
            check_circle
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1">Video Ready</h3>
          <p className="text-sm text-gray-400 truncate mb-1">{video.title}</p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
            {video.duration && (
              <span className="flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                >
                  timer
                </span>
                {video.duration}s
              </span>
            )}
            {video.resolution && <span>{video.resolution}</span>}
            {video.youtubeUrl && (
              <span className="flex items-center gap-1 text-green-400">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                >
                  cloud_done
                </span>
                Uploaded
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {video.youtubeUrl && (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5"
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                >
                  open_in_new
                </span>
                Watch on YouTube
              </a>
            )}
            {video.localPath && (
              <button className="px-4 py-2 bg-white/[0.06] hover:bg-white/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                >
                  download
                </span>
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────── RecentVideos ─────────────────────────── */

function RecentVideos({ videos, loading }) {
  if (loading) {
    return (
      <div id="recent-videos" className="glass rounded-2xl p-5">
        <div className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Recent Videos</div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 skeleton rounded w-40" />
                  <div className="h-2.5 skeleton rounded w-24" />
                </div>
                <div className="h-6 skeleton rounded-lg w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div id="recent-videos" className="glass rounded-2xl p-5">
      <div className="text-label-caps text-gray-500 uppercase tracking-wider mb-4">Recent Videos</div>

      {videos.length === 0 ? (
        <div className="text-center py-8">
          <span
            className="material-symbols-outlined text-gray-600 text-[40px] mb-3 block"
            style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
          >
            video_library
          </span>
          <p className="text-sm text-gray-500">No videos generated yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video, i) => (
            <div
              key={video.id || i}
              className="bg-white/[0.03] hover:bg-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{video.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{timeAgo(video.createdAt)}</span>
                  {video.status === 'uploaded' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Uploaded
                    </span>
                  )}
                  {video.status === 'processing' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      Processing
                    </span>
                  )}
                  {video.status === 'failed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Failed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {video.youtubeUrl ? (
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                    >
                      play_arrow
                    </span>
                    Watch
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────── Toast ────────────────────────────────── */

function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  if (!message) return null

  const styles = {
    error: 'bg-red-500/15 border-red-500/30 text-red-400',
    success: 'bg-green-500/15 border-green-500/30 text-green-400',
    info: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  }

  return (
    <div
      className={`fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-xl ${styles[type] || styles.info}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
          >
            close
          </span>
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */

export default function HindiPoems() {
  const [pipelineStatus, setPipelineStatus] = useState({
    isRunning: false,
    currentStep: 0,
    totalSteps: PIPELINE_STEPS.length,
    stepLabel: '',
    progress: 0,
    jobId: null,
  })

  const [todayStats, setTodayStats] = useState({ used: 0, remaining: 1 })
  const [lastRunInfo, setLastRunInfo] = useState({ success: false, time: null })
  const [recentVideos, setRecentVideos] = useState([])
  const [completedVideo, setCompletedVideo] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const pollRef = useRef(null)
  const activeJobRef = useRef(null)

  /* ─── data fetching ─────────────────────────────────────────── */

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getPoemStatus()
      const data = res.data?.data
      if (data) {
        setTodayStats({ used: data.usedToday ?? 0, remaining: data.remaining ?? 1 })
        setLastRunInfo({ success: !!data.lastRunSuccess, time: data.lastRunTime })
      }
    } catch {
      // non-critical
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const fetchRecent = useCallback(async () => {
    try {
      const res = await getRecentPoemVideos()
      const data = res.data?.data
      if (Array.isArray(data)) {
        setRecentVideos(data)
      }
    } catch {
      // non-critical
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchRecent()
  }, [fetchStatus, fetchRecent])

  /* ─── polling ───────────────────────────────────────────────── */

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    activeJobRef.current = null
  }, [])

  const startPolling = useCallback(
    (jobId) => {
      activeJobRef.current = jobId

      pollRef.current = setInterval(async () => {
        try {
          const res = await getPipelineJobStatus(jobId)
          const data = res.data?.data
          if (!data) return

          setPipelineStatus((prev) => ({
            ...prev,
            currentStep: data.currentStep ?? prev.currentStep,
            stepLabel: data.stepLabel ?? prev.stepLabel,
            progress: data.progress ?? prev.progress,
          }))

          if (data.status === 'completed') {
            stopPolling()
            setPipelineStatus((prev) => ({
              ...prev,
              isRunning: false,
              currentStep: PIPELINE_STEPS.length,
              stepLabel: 'Done',
              progress: 100,
            }))
            setCompletedVideo(data.video || null)
            setToast({ message: 'Video generated successfully!', type: 'success' })
            fetchRecent()
            fetchStatus()
          }

          if (data.status === 'failed') {
            stopPolling()
            setPipelineStatus((prev) => ({
              ...prev,
              isRunning: false,
            }))
            setError(data.error || 'Pipeline failed')
            setToast({ message: data.error || 'Pipeline failed', type: 'error' })
            fetchStatus()
          }
        } catch {
          // transient network error — keep polling
        }
      }, POLL_INTERVAL_MS)
    },
    [stopPolling, fetchRecent, fetchStatus],
  )

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  /* ─── actions ───────────────────────────────────────────────── */

  const handleGenerate = useCallback(
    async (dryRun = false) => {
      setError(null)
      setCompletedVideo(null)

      setPipelineStatus({
        isRunning: true,
        currentStep: 1,
        totalSteps: PIPELINE_STEPS.length,
        stepLabel: PIPELINE_STEPS[0],
        progress: 2,
        jobId: null,
      })

      try {
        const res = await startHindiPoemPipeline({
          dryRun,
          autoUpload: !dryRun,
        })

        const data = res.data?.data
        if (data?.jobId) {
          setPipelineStatus((prev) => ({ ...prev, jobId: data.jobId }))
          startPolling(data.jobId)
        } else if (data?.video) {
          // Synchronous completion (fast mock or small payloads)
          setPipelineStatus((prev) => ({
            ...prev,
            isRunning: false,
            currentStep: PIPELINE_STEPS.length,
            stepLabel: 'Done',
            progress: 100,
          }))
          setCompletedVideo(data.video)
          setToast({ message: 'Video generated successfully!', type: 'success' })
          fetchRecent()
          fetchStatus()
        }
      } catch (err) {
        stopPolling()
        setPipelineStatus((prev) => ({ ...prev, isRunning: false }))
        const msg = err.response?.data?.error || err.message || 'Failed to start pipeline'
        setError(msg)
        setToast({ message: msg, type: 'error' })
        fetchStatus()
      }
    },
    [startPolling, stopPolling, fetchRecent, fetchStatus],
  )

  const handleCancel = useCallback(async () => {
    const jobId = pipelineStatus.jobId || activeJobRef.current
    if (!jobId) {
      stopPolling()
      setPipelineStatus((prev) => ({ ...prev, isRunning: false }))
      return
    }
    try {
      await cancelPipelineJob(jobId)
    } catch {
      // ignore — poll will catch the state change
    }
    stopPolling()
    setPipelineStatus((prev) => ({
      ...prev,
      isRunning: false,
      currentStep: 0,
      stepLabel: '',
      progress: 0,
    }))
    setToast({ message: 'Pipeline cancelled', type: 'info' })
  }, [pipelineStatus.jobId, stopPolling])

  /* ─── render ────────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title="Hindi Poem Shorts Generator"
        subtitle="AI-powered Hindi poem video creation & YouTube upload"
      />

      <div className="space-y-5">
        {/* Pipeline Status */}
        <PipelineStatus
          status={{ ...todayStats, lastRunSuccess: lastRunInfo.success, lastRunTime: lastRunInfo.time }}
          loading={loadingStatus}
        />

        {/* Quick Actions */}
        <QuickActions
          onGenerate={handleGenerate}
          isRunning={pipelineStatus.isRunning}
          remaining={todayStats.remaining}
        />

        {/* Error banner */}
        {error && (
          <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/[0.06]">
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-red-400 text-[22px] mt-0.5 flex-shrink-0"
                style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
              >
                error
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-400 font-medium mb-1">Pipeline Error</p>
                <p className="text-xs text-gray-400 break-words">{error}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleGenerate(false)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => setError(null)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Dismiss error"
                >
                  <span
                    className="material-symbols-outlined text-gray-500 text-[16px]"
                    style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}
                  >
                    close
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Progress */}
        <PipelineProgress
          currentStep={pipelineStatus.currentStep}
          totalSteps={pipelineStatus.totalSteps}
          stepLabel={pipelineStatus.stepLabel}
          progress={pipelineStatus.progress}
          isRunning={pipelineStatus.isRunning}
          onDryRun={() => handleGenerate(true)}
          onCancel={handleCancel}
        />

        {/* Completed Video Preview */}
        <VideoPreview video={completedVideo} loading={false} />

        {/* Recent Videos */}
        <RecentVideos videos={recentVideos} loading={loadingRecent} />
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  )
}
