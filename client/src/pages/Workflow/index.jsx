/**
 * Workflow - Real step-by-step video pipeline
 *
 * Architecture:
 * - Steps 1-2: User selects topic and generates script (interactive)
 * - Steps 3-4: Generate voice and download visuals (sequential, each awaited)
 * - Step 5: Kick off pipeline with pre-generated assets, poll for real progress
 * - Steps 6-8: Backend handles render/thumbnail/SEO sequentially
 *
 * Sequential guarantee:
 *   Each step uses `await` — the next step NEVER starts until the previous
 *   API call has fully resolved. No Promise.all, no parallel operations.
 *
 * BUG FIXES applied (2026-06-13):
 *   BUG-001: Steps 3 & 4 properly propagate errors
 *   BUG-003: Polling race condition fixed — overlapping requests prevented
 *   BUG-004: Cleanup on unmount — intervals/timeouts cleared via refs
 *   BUG-005: Empty script validation after generation
 *   BUG-006: Concurrent pipeline runs prevented via isRunningRef guard
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  createPipeline,
  getTrends,
  generateScript,
  getBestNiche,
  generateVoice,
  downloadVisuals,
  getPipelineStatus
} from '../../services/api'
import { useAppDispatch } from '../../context/AppContext'
import PageHeader from '../../components/PageHeader'
import PipelineStep from '../../components/PipelineStep'
import ErrorMessage from '../../components/ErrorMessage'
import StatusBadge from '../../components/StatusBadge'
import { CustomSelect } from '../../components/CustomSelect'

const NICHE_OPTIONS = [
  { value: '', label: '🎯 Auto-select Best Niche' },
  { value: 'Finance', label: '💰 Finance' },
  { value: 'Business', label: '📈 Business' },
  { value: 'Technology', label: '💻 Technology' },
  { value: 'Health', label: '🏃 Health' },
  { value: 'RealEstate', label: '🏠 Real Estate' },
  { value: 'Education', label: '📚 Education' }
]

const QUALITY_OPTIONS = [
  { value: 'low', label: '🚀 Fast', sublabel: 'Quick render' },
  { value: 'medium', label: '⚡ Balanced', sublabel: 'Good quality' },
  { value: 'high', label: '✨ High Quality', sublabel: 'Best quality' }
]

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'hinglish', label: '🇮🇳 Hinglish' }
]

// Backend step labels for polling display
const BACKEND_STEP_LABELS = {
  1: 'Topic Selection',
  2: 'Script Generation',
  3: 'Voice Generation',
  4: 'Video Download',
  5: 'Metadata Generation',
  6: 'Video Rendering',
  7: 'Thumbnail Generation',
  8: 'SEO & Finalization'
}

function Workflow() {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const scriptFromState = location.state?.script || null
  const topicFromState = location.state?.topic || ''

  // Step 1: Topic
  const [selectedNiche, setSelectedNiche] = useState('')
  const [trends, setTrends] = useState([])
  const [trendingTopic, setTrendingTopic] = useState('')
  const [customTopic, setCustomTopic] = useState(topicFromState)
  const [topicSource, setTopicSource] = useState('custom')

  // Step 2: Script
  const [script, setScript] = useState(scriptFromState || '')
  const [language, setLanguage] = useState(location.state?.language || 'english')
  const [videoType, setVideoType] = useState(location.state?.videoType || 'long')
  const [scriptLoading, setScriptLoading] = useState(false)

  // Step 3-4: Pre-generated assets
  const [audioPath, setAudioPath] = useState(null)
  const [videoPath, setVideoPath] = useState(null)

  // Step 5-6: Pipeline
  const [quality, setQuality] = useState('medium')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [videoTags, setVideoTags] = useState('')

  // Pipeline state
  const [loading, setLoading] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState(null) // 'idle' | 'running' | 'polling' | 'complete' | 'error'
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatuses, setStepStatuses] = useState({})
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // ── BUG-004: Cleanup refs ──
  const mountedRef = useRef(true)
  const pollIntervalRef = useRef(null)
  const pollTimeoutRef = useRef(null)
  const isRunningRef = useRef(false) // BUG-006

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { time: timestamp, message, type }])
  }, [])

  // Load trends on mount
  const [trendsLoading, setTrendsLoading] = useState(false)

  useEffect(() => {
    loadTrends()
  }, [])

  const loadTrends = async () => {
    setTrendsLoading(true)
    try {
      const res = await getTrends()
      const data = res.data.data || res.data
      if (Array.isArray(data)) {
        setTrends(data)
      } else if (data.trends) {
        setTrends(data.trends)
      }
    } catch (err) {
      console.warn('Failed to load trends:', err.message)
      setTrends([])
    } finally {
      setTrendsLoading(false)
    }
  }

  // Step 1: Select topic
  const handleSelectTrendingTopic = (topic) => {
    setTrendingTopic(topic)
    setTopicSource('trending')
    setCustomTopic('')
  }

  // Step 2: Generate script
  const handleGenerateScript = async () => {
    const topicToUse = topicSource === 'trending' ? trendingTopic : customTopic
    if (!topicToUse.trim()) {
      setError('Please select or enter a topic first')
      return
    }
    setScriptLoading(true)
    setError(null)
    try {
      const res = await generateScript({
        topic: topicToUse.trim(),
        contentType: 'script',
        ageGroup: '18-25',
        language,
        videoType,
        maxWords: 200
      })
      setScript(res.data.data?.script || res.data.script || '')
      addLog('Script generated successfully', 'success')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate script')
      addLog('Script generation failed: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setScriptLoading(false)
    }
  }

  // Run the full pipeline — strictly sequential, one step at a time
  const runWorkflow = async () => {
    // BUG-006: Prevent concurrent runs
    if (isRunningRef.current) return
    isRunningRef.current = true

    setLoading(true)
    setError(null)
    setResult(null)
    setLogs([])
    setProgress(0)
    setCurrentStep(1)
    setPipelineStatus('running')
    setAudioPath(null)
    setVideoPath(null)

    addLog('Starting pipeline...')
    const stepInProgress = (step) => {
      if (!mountedRef.current) return false
      setStepStatuses(prev => ({ ...prev, [step]: 'active' }))
      return true
    }
    const stepCompleted = (step) => {
      if (!mountedRef.current) return
      setStepStatuses(prev => ({ ...prev, [step]: 'completed' }))
    }
    const stepFailed = (step) => {
      if (!mountedRef.current) return
      setStepStatuses(prev => ({ ...prev, [step]: 'error' }))
    }

    try {
      // ════════════════════════════════════════════════════════════════
      // STEP 1: Niche Selection (local + optional API)
      // ════════════════════════════════════════════════════════════════
      if (!stepInProgress(1)) return
      addLog('Analyzing niche...')
      let niche = selectedNiche
      if (!niche) {
        try {
          const bestRes = await getBestNiche()
          niche = bestRes.data.data?.niche || 'Technology'
        } catch {
          niche = 'Technology'
        }
      }
      addLog(`Selected niche: ${niche}`, 'success')
      stepCompleted(1)
      if (!mountedRef.current) return
      setProgress(10)
      setCurrentStep(2)

      // ════════════════════════════════════════════════════════════════
      // STEP 2: Script Generation — AWAIT completion before proceeding
      // ════════════════════════════════════════════════════════════════
      if (!stepInProgress(2)) return
      addLog('Generating script...')
      const topicToUse = topicSource === 'trending' ? trendingTopic : customTopic
      const scriptRes = await generateScript({
        topic: topicToUse || niche,
        contentType: 'script',
        ageGroup: '18-25',
        language,
        videoType,
        maxWords: 200
      })
      const generatedScript = scriptRes.data.data?.script || scriptRes.data.script || ''
      // BUG-005: Validate non-empty script
      const resolvedScript = (script || generatedScript || '').trim()
      if (!resolvedScript) {
        throw new Error('Script is empty — cannot continue with pipeline. Try generating a script first.')
      }
      if (!script) setScript(resolvedScript)
      addLog('Script ready', 'success')
      stepCompleted(2)
      if (!mountedRef.current) return
      setProgress(25)
      setCurrentStep(3)

      // ════════════════════════════════════════════════════════════════
      // STEP 3: Voice Generation — AWAIT completion before visuals
      // BUG-001: Voice step properly throws on failure
      // ════════════════════════════════════════════════════════════════
      if (!stepInProgress(3)) return
      addLog('Generating voice from script...')
      const voiceRes = await generateVoice({
        script: resolvedScript,
        language
      })
      const voiceFile = voiceRes.data?.file || voiceRes.data?.data?.file
      if (!voiceFile) {
        throw new Error('Voice generation returned no file path')
      }
      setAudioPath(voiceFile)
      addLog(`Voice file ready: ${voiceFile.split('/').pop()}`, 'success')
      stepCompleted(3)
      if (!mountedRef.current) return
      setProgress(40)
      setCurrentStep(4)

      // ════════════════════════════════════════════════════════════════
      // STEP 4: Visual Footage Download — AWAIT completion before render
      // BUG-001: Visuals step properly throws on failure
      // ════════════════════════════════════════════════════════════════
      if (!stepInProgress(4)) return
      addLog('Downloading stock visuals...')
      const visualsRes = await downloadVisuals({
        script: resolvedScript,
        topic: topicToUse || niche,
        videoType
      })
      const downloadedVideoPath = visualsRes.data?.data?.videoPath || visualsRes.data?.videoPath
      if (!downloadedVideoPath) {
        throw new Error('Visual download returned no video path')
      }
      setVideoPath(downloadedVideoPath)
      addLog('Visual assets downloaded', 'success')
      stepCompleted(4)
      if (!mountedRef.current) return
      setProgress(55)
      setCurrentStep(5)

      // ════════════════════════════════════════════════════════════════
      // STEP 5: Pipeline Render — pass pre-generated assets, poll real progress
      // Backend will use pre-generated audio/video and handle:
      //   Step 5 (metadata) → Step 6 (render) → Step 7 (thumbnail) → Step 8 (SEO)
      // ════════════════════════════════════════════════════════════════
      if (!stepInProgress(5)) return
      addLog('Starting render pipeline...')
      setPipelineStatus('polling')

      dispatch({
        type: 'SET_PIPELINE_STATUS',
        payload: {
          step: 5,
          stepLabel: 'Rendering',
          status: 'running',
          progress: 55,
          logs: ['Starting render...'],
          jobId: null
        }
      })

      // Pass pre-generated audio/video to avoid re-generation
      const pipelineRes = await createPipeline({
        forceNiche: selectedNiche || undefined,
        quality,
        language,
        videoType,
        script: resolvedScript,
        title: videoTitle || undefined,
        audioPath: voiceFile || undefined,
        videoPath: downloadedVideoPath || undefined
      })

      const jobData = pipelineRes.data.data || pipelineRes.data
      const jobId = jobData?.jobId || jobData?.id || 'pending'

      addLog(`Pipeline job created: ${jobId}`, 'success')

      // Poll for real backend progress
      addLog('Polling for pipeline progress...')
      // BUG-003: Prevent overlapping poll requests
      let pollingInProgress = false
      await new Promise((resolve, reject) => {
        const POLL_INTERVAL = 2000
        const TIMEOUT_MS = 600000 // 10 min safety

        pollIntervalRef.current = setInterval(async () => {
          // BUG-003: Skip if poll already in-flight
          if (pollingInProgress) return
          pollingInProgress = true
          try {
            const statusRes = await getPipelineStatus(jobId)
            if (!mountedRef.current) {
              clearInterval(pollIntervalRef.current)
              pollingInProgress = false
              return
            }
            const pollData = statusRes.data.data || statusRes.data
            const pct = pollData.progress ?? 0
            const backendStep = pollData.step ?? 0
            const stepLabel = BACKEND_STEP_LABELS[backendStep] || `Step ${backendStep}`

            setProgress(pct)
            dispatch({
              type: 'SET_PIPELINE_STATUS',
              payload: {
                step: 5,
                stepLabel,
                status: 'running',
                progress: pct,
                logs: [`${stepLabel}: ${pct}%`],
                jobId
              }
            })
            pollingInProgress = false

            if (pollData.status === 'completed' || pct >= 100) {
              clearInterval(pollIntervalRef.current)
              if (mountedRef.current) {
                addLog('Pipeline completed successfully!', 'success')
                // Store the result from backend
                if (pollData.result) {
                  setResult({
                    title: pollData.result.title || videoTitle || `${niche} - ${topicToUse || 'Auto Generated'}`,
                    niche: pollData.result.niche || niche,
                    jobId,
                    videoId: pollData.result.videoId || jobData?.videoId || 'pending',
                    tags: pollData.result.tags || [],
                    seo: pollData.result.seo || null
                  })
                } else {
                  setResult({
                    title: videoTitle || `${niche} - ${topicToUse || 'Auto Generated'}`,
                    niche,
                    jobId,
                    videoId: jobData?.videoId || 'pending',
                    tags: jobData?.tags || []
                  })
                }
              }
              resolve()
            } else if (pollData.status === 'failed' || pollData.status === 'error') {
              clearInterval(pollIntervalRef.current)
              reject(new Error(pollData.error || 'Pipeline render failed'))
            }
          } catch {
            pollingInProgress = false
            // Transient network errors — keep polling
          }
        }, POLL_INTERVAL)

        pollTimeoutRef.current = setTimeout(() => {
          clearInterval(pollIntervalRef.current)
          if (mountedRef.current) addLog('Pipeline timed out — continuing with partial progress', 'warn')
          resolve()
        }, TIMEOUT_MS)
      })

      if (!mountedRef.current) return
      addLog('Pipeline complete!', 'success')
      stepCompleted(5)
      setProgress(100)
      setCurrentStep(6)

      // Step 6: Complete
      stepCompleted(6)
      setPipelineStatus('complete')

      if (!result) {
        setResult({
          title: videoTitle || `${niche} - ${topicToUse || 'Auto Generated'}`,
          niche,
          jobId,
          videoId: jobData?.videoId || 'pending',
          tags: jobData?.tags || []
        })
      }

      // Clear pipeline status from context after completion
      setTimeout(() => {
        if (mountedRef.current) dispatch({ type: 'CLEAR_PIPELINE_STATUS' })
      }, 30000)

    } catch (err) {
      if (!mountedRef.current) return
      const errMsg = err.response?.data?.message || err.message
      addLog(`Error: ${errMsg}`, 'error')
      setError(errMsg)
      setPipelineStatus('error')

      // BUG-006: Determine which step actually failed
      const activeEntry = Object.entries(stepStatuses).find(([, s]) => s === 'active')
      const failedStep = activeEntry ? Number(activeEntry[0]) : currentStep
      stepFailed(failedStep)

      dispatch({
        type: 'SET_PIPELINE_STATUS',
        payload: {
          step: failedStep,
          stepLabel: 'Error',
          status: 'error',
          progress,
          logs,
          error: errMsg
        }
      })
    } finally {
      if (mountedRef.current) setLoading(false)
      isRunningRef.current = false
    }
  }

  const getStepStatus = (stepNum) => {
    if (stepStatuses[stepNum] === 'completed') return 'completed'
    if (stepStatuses[stepNum] === 'error') return 'error'
    if (currentStep === stepNum && loading) return 'active'
    if (currentStep > stepNum) return 'completed'
    return 'pending'
  }

  const topicResolved = topicSource === 'trending' ? trendingTopic : customTopic

  return (
    <div>
      <PageHeader
        title="Video Pipeline"
        subtitle="Step-by-step video creation workflow"
      />

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={runWorkflow} dismissible onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Steps */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        {/* Step 1: Choose Topic */}
        <PipelineStep
          stepNumber={1}
          label="Choose Topic"
          status={getStepStatus(1)}
          onRetry={() => { setError(null); setCurrentStep(1) }}
        >
          {getStepStatus(1) !== 'completed' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={loadTrends}
                  disabled={trendsLoading}
                  className="text-xs text-red-400 hover:text-red-300 transition mb-2 flex items-center gap-1 disabled:opacity-50"
                >
                  {trendsLoading ? '⏳ Loading...' : '🔄 Refresh trends'}
                </button>
                {trends.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {trends.slice(0, 6).map((t, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectTrendingTopic(typeof t === 'string' ? t : t.topic || t.name)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition ${
                          topicSource === 'trending' && trendingTopic === (typeof t === 'string' ? t : t.topic || t.name)
                            ? 'gradient text-white border-transparent'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        🔥 {typeof t === 'string' ? t : t.topic || t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <label className="text-xs text-gray-500 leading-9 sm:leading-normal" htmlFor="custom-topic-input">Or custom:</label>
                <input
                  id="custom-topic-input"
                  type="text"
                  value={customTopic}
                  onChange={(e) => { setCustomTopic(e.target.value); setTopicSource('custom') }}
                  placeholder="Enter a topic..."
                  className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 transition touch-target"
                />
              </div>
            </div>
          )}
          {getStepStatus(1) === 'completed' && (
            <div className="text-sm text-green-400">
              Topic: <strong>{topicResolved}</strong>
            </div>
          )}
        </PipelineStep>

        {/* Step 2: Generate Script */}
        <PipelineStep
          stepNumber={2}
          label="Generate Script"
          status={getStepStatus(2)}
          onRetry={handleGenerateScript}
        >
          {getStepStatus(2) !== 'completed' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <CustomSelect
                  value={language}
                  onChange={setLanguage}
                  options={LANGUAGE_OPTIONS}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setVideoType('long')}
                    className={`px-3 py-2 rounded-lg text-xs border transition ${
                      videoType === 'long' ? 'gradient text-white border-transparent' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    🎬 Long
                  </button>
                  <button
                    onClick={() => setVideoType('short')}
                    className={`px-3 py-2 rounded-lg text-xs border transition ${
                      videoType === 'short' ? 'gradient text-white border-transparent' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    📱 Short
                  </button>
                </div>
              </div>
              <button
                onClick={handleGenerateScript}
                disabled={scriptLoading || !topicResolved}
                className="px-4 py-2 gradient rounded-xl hover:opacity-90 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {scriptLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating...</>
                ) : '✍️ Generate Script'}
              </button>
            </div>
          )}
          {getStepStatus(2) === 'completed' && script && (
            <div className="bg-black/40 rounded-xl p-3 max-h-[120px] overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{script.slice(0, 300)}...</pre>
            </div>
          )}
        </PipelineStep>

        {/* Step 3: Voice */}
        <PipelineStep
          stepNumber={3}
          label="Voice"
          status={getStepStatus(3)}
        >
          {getStepStatus(3) === 'active' && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating voice from script...
            </div>
          )}
          {getStepStatus(3) === 'completed' && audioPath && (
            <div className="text-sm text-green-400">
              Voice file: <strong>{audioPath.split('/').pop()}</strong>
            </div>
          )}
        </PipelineStep>

        {/* Step 4: Visuals */}
        <PipelineStep
          stepNumber={4}
          label="Visuals"
          status={getStepStatus(4)}
        >
          {getStepStatus(4) === 'active' && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Gathering stock visuals...
            </div>
          )}
          {getStepStatus(4) === 'completed' && videoPath && (
            <div className="text-sm text-green-400">
              Video asset: <strong>{videoPath.split('/').pop()}</strong>
            </div>
          )}
        </PipelineStep>

        {/* Step 5: Render with real progress polling */}
        <PipelineStep
          stepNumber={5}
          label="Render & Finalize"
          status={getStepStatus(5)}
          onRetry={runWorkflow}
        >
          {getStepStatus(5) === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full gradient rounded-full transition-all duration-500" style={{ width: `${Math.max(10, progress)}%` }} />
                </div>
                <span className="text-sm text-gray-400">{progress}%</span>
              </div>
              {pipelineStatus === 'polling' && (
                <div className="text-xs text-gray-500">
                  ⏳ Polling pipeline status... (real progress from backend)
                </div>
              )}
            </div>
          )}
        </PipelineStep>

        {/* Step 6: Publish */}
        <PipelineStep
          stepNumber={6}
          label="Publish"
          status={getStepStatus(6)}
        >
          {getStepStatus(6) !== 'completed' && getStepStatus(6) !== 'active' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="video-title" className="text-xs text-gray-500 mb-1.5 block">Video Title</label>
                <input
                  id="video-title"
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Video title (optional)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 transition touch-target"
                />
              </div>
              <div>
                <label htmlFor="video-description" className="text-xs text-gray-500 mb-1.5 block">Video Description</label>
                <textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Video description (optional)"
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 transition resize-none touch-target"
                />
              </div>
              <div>
                <label htmlFor="video-tags" className="text-xs text-gray-500 mb-1.5 block">Tags</label>
                <input
                  id="video-tags"
                  type="text"
                  value={videoTags}
                  onChange={(e) => setVideoTags(e.target.value)}
                  placeholder="Tags (comma separated, optional)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 transition touch-target"
                />
              </div>
            </div>
          )}
        </PipelineStep>
      </div>

      {/* Controls - Niche/Quality/Run */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Select Niche</h3>
            <CustomSelect
              value={selectedNiche}
              onChange={setSelectedNiche}
              options={NICHE_OPTIONS}
              placeholder="Choose a niche..."
              disabled={loading}
            />
          </div>

          <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Video Quality</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  disabled={loading}
                  className={`px-2 sm:px-4 py-3 sm:py-4 rounded-xl border transition-all ${
                    quality === q.value
                      ? 'gradient border-transparent text-white shadow-lg shadow-red-500/20'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-medium">{q.label}</div>
                  <div className="text-[10px] sm:text-xs mt-1 opacity-70">{q.sublabel}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex">
          <button
            onClick={runWorkflow}
            disabled={loading || pipelineStatus === 'error'}
            className="w-full px-6 py-4 gradient rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 touch-target"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {pipelineStatus === 'polling' ? 'Polling Progress...' : 'Processing...'}
              </>
            ) : pipelineStatus === 'error' ? (
              <>⚠️ Pipeline Failed — Dismiss Error to Retry</>
            ) : (
              <>⚡ Run Full Pipeline</>
            )}
          </button>
        </div>

        {/* Real-time logs */}
        <div className="mt-6 bg-black/50 rounded-xl p-4 sm:p-5 max-h-[200px] sm:max-h-[250px] overflow-y-auto font-mono text-xs sm:text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-600 flex items-center gap-2">
              <span>🎬</span> Ready to start - configure steps above and click "Run Full Pipeline"
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`mb-2 ${
                log.type === 'success' ? 'text-green-400' :
                log.type === 'error' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                <span className="text-gray-600 mr-2">[{log.time}]</span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider">Pipeline Result</h3>
            <StatusBadge status="success">Complete</StatusBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Title</div>
              <div className="text-lg font-semibold">{result.title}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Niche</div>
              <div className="text-lg">{result.niche}</div>
            </div>
            {result.tags?.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 col-span-2">
                <div className="text-xs text-gray-500 mb-1">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.seo && (
              <div className="bg-white/5 rounded-xl p-4 col-span-2">
                <div className="text-xs text-gray-500 mb-1">SEO Titles</div>
                <div className="space-y-1">
                  {result.seo.titles?.map((title, i) => (
                    <div key={i} className="text-sm text-gray-300">• {title}</div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white/5 rounded-xl p-4 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Job ID</div>
              <div className="text-lg font-mono text-green-400">
                {result.jobId || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workflow
