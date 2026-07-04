/**
 * Workflow - 6-step vertical timeline video pipeline
 * Kinetic Glass design: vertical timeline with active step glow
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  createPipeline, getTrends, generateScript, getBestNiche,
  generateVoice, downloadVisuals, getPipelineStatus,
  getNicheList, getPipelineOptions, getScriptConfig
} from '../../services/api'
import { useAppDispatch } from '../../context/AppContext'
import PageHeader from '../../components/PageHeader'
import PipelineStep from '../../components/PipelineStep'
import ErrorMessage from '../../components/ErrorMessage'
import StatusBadge from '../../components/StatusBadge'
import { CustomSelect } from '../../components/CustomSelect'

const FALLBACK_NICHE_OPTIONS = [
  { value: '', label: 'Auto-select Best Niche' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Business', label: 'Business' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Health', label: 'Health' },
  { value: 'RealEstate', label: 'Real Estate' },
  { value: 'Education', label: 'Education' }
]

const FALLBACK_QUALITY_OPTIONS = [
  { value: 'low', label: 'Fast', sublabel: 'Quick render', icon: 'speed' },
  { value: 'medium', label: 'Balanced', sublabel: 'Good quality', icon: 'balance' },
  { value: 'high', label: 'High Quality', sublabel: 'Best quality', icon: 'auto_awesome' }
]

const FALLBACK_LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' }
]

const FALLBACK_STEP_LABELS = {
  1: 'Topic Selection', 2: 'Script Generation', 3: 'Voice Generation',
  4: 'Video Download', 5: 'Metadata Generation', 6: 'Video Rendering',
  7: 'Thumbnail Generation', 8: 'SEO & Finalization'
}

function Workflow() {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const scriptFromState = location.state?.script || null
  const topicFromState = location.state?.topic || ''

  // Dynamic config from API
  const [nicheOptions, setNicheOptions] = useState(FALLBACK_NICHE_OPTIONS)
  const [qualityOptions, setQualityOptions] = useState(FALLBACK_QUALITY_OPTIONS)
  const [languageOptions, setLanguageOptions] = useState(FALLBACK_LANGUAGE_OPTIONS)
  const [stepLabels, setStepLabels] = useState(FALLBACK_STEP_LABELS)
  const [pipelinePollInterval, setPipelinePollInterval] = useState(2000)
  const [pipelineTimeout, setPipelineTimeout] = useState(600000)
  const [defaultAgeGroup, setDefaultAgeGroup] = useState('18-25')
  const [defaultMaxWords, setDefaultMaxWords] = useState(200)

  const [selectedNiche, setSelectedNiche] = useState('')
  const [trends, setTrends] = useState([])
  const [trendingTopic, setTrendingTopic] = useState('')
  const [customTopic, setCustomTopic] = useState(topicFromState)
  const [topicSource, setTopicSource] = useState('custom')
  const [script, setScript] = useState(scriptFromState || '')
  const [language, setLanguage] = useState(location.state?.language || 'en')
  const [videoType, setVideoType] = useState(location.state?.videoType || 'long')
  const [scriptLoading, setScriptLoading] = useState(false)
  const [audioPath, setAudioPath] = useState(null)
  const [videoPath, setVideoPath] = useState(null)
  const [quality, setQuality] = useState('medium')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [videoTags, setVideoTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatuses, setStepStatuses] = useState({})
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [trendsLoading, setTrendsLoading] = useState(false)

  const mountedRef = useRef(true)
  const pollIntervalRef = useRef(null)
  const pollTimeoutRef = useRef(null)
  const isRunningRef = useRef(false)

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

  useEffect(() => { loadTrends(); loadWorkflowConfig() }, [])

  const loadTrends = async () => {
    setTrendsLoading(true)
    try {
      const res = await getTrends()
      const data = res.data.data || res.data
      setTrends(Array.isArray(data) ? data : data.trends || [])
    } catch { setTrends([]) }
    finally { setTrendsLoading(false) }
  }

  const loadWorkflowConfig = async () => {
    try {
      const [nichesRes, pipelineRes, scriptConfigRes] = await Promise.allSettled([
        getNicheList(),
        getPipelineOptions(),
        getScriptConfig()
      ])

      if (nichesRes.status === 'fulfilled') {
        const nicheData = nichesRes.value.data.data || nichesRes.value.data
        const nicheList = Array.isArray(nicheData) ? nicheData : []
        if (nicheList.length > 0) {
          setNicheOptions([
            { value: '', label: 'Auto-select Best Niche' },
            ...nicheList.map(n => ({ value: typeof n === 'string' ? n : n.name || n.value, label: typeof n === 'string' ? n : n.name || n.value }))
          ])
        }
      }

      if (pipelineRes.status === 'fulfilled') {
        const pData = pipelineRes.value.data.data || pipelineRes.value.data
        if (pData.qualityOptions) setQualityOptions(pData.qualityOptions)
        if (pData.languages) setLanguageOptions(pData.languages)
        if (pData.stepLabels) setStepLabels(pData.stepLabels)
        if (pData.pollInterval) setPipelinePollInterval(pData.pollInterval)
        if (pData.timeout) setPipelineTimeout(pData.timeout)
        if (pData.defaultAgeGroup) setDefaultAgeGroup(pData.defaultAgeGroup)
        if (pData.defaultMaxWords) setDefaultMaxWords(pData.defaultMaxWords)
      }

      if (scriptConfigRes.status === 'fulfilled') {
        const sData = scriptConfigRes.value.data.data || scriptConfigRes.value.data
        if (sData.defaultAgeGroup) setDefaultAgeGroup(sData.defaultAgeGroup)
        if (sData.defaultMaxWords) setDefaultMaxWords(sData.defaultMaxWords)
      }
    } catch { /* silent — fallbacks will be used */ }
  }

  const handleSelectTrendingTopic = (topic) => {
    setTrendingTopic(topic)
    setTopicSource('trending')
    setCustomTopic('')
  }

  const handleGenerateScript = async () => {
    const topicToUse = topicSource === 'trending' ? trendingTopic : customTopic
    if (!topicToUse.trim()) { setError('Please select or enter a topic first'); return }
    setScriptLoading(true)
    setError(null)
    try {
      const res = await generateScript({ topic: topicToUse.trim(), contentType: 'script', ageGroup: defaultAgeGroup, language, videoType, maxWords: defaultMaxWords })
      setScript(res.data.data?.script || res.data.script || '')
      addLog('Script generated successfully', 'success')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate script')
    } finally { setScriptLoading(false) }
  }

  const runWorkflow = async () => {
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

    const stepInProgress = (step) => { if (!mountedRef.current) return false; setStepStatuses(prev => ({ ...prev, [step]: 'active' })); return true }
    const stepCompleted = (step) => { if (!mountedRef.current) return; setStepStatuses(prev => ({ ...prev, [step]: 'completed' })) }
    const stepFailed = (step) => { if (!mountedRef.current) return; setStepStatuses(prev => ({ ...prev, [step]: 'error' })) }

    try {
      // STEP 1: Niche
      if (!stepInProgress(1)) return
      addLog('Analyzing niche...')
      let niche = selectedNiche
      if (!niche) { try { const bestRes = await getBestNiche(); niche = bestRes.data.data?.niche || 'Technology' } catch { niche = 'Technology' } }
      addLog(`Selected niche: ${niche}`, 'success')
      stepCompleted(1)
      if (!mountedRef.current) return
      setProgress(10); setCurrentStep(2)

      // STEP 2: Script
      if (!stepInProgress(2)) return
      addLog('Generating script...')
      const topicToUse = topicSource === 'trending' ? trendingTopic : customTopic
      const scriptRes = await generateScript({ topic: topicToUse || niche, contentType: 'script', ageGroup: defaultAgeGroup, language, videoType, maxWords: defaultMaxWords })
      const generatedScript = scriptRes.data.data?.script || scriptRes.data.script || ''
      const resolvedScript = (script || generatedScript || '').trim()
      if (!resolvedScript) throw new Error('Script is empty')
      if (!script) setScript(resolvedScript)
      addLog('Script ready', 'success')
      stepCompleted(2)
      if (!mountedRef.current) return
      setProgress(25); setCurrentStep(3)

      // STEP 3: Voice
      if (!stepInProgress(3)) return
      addLog('Generating voice from script...')
      const voiceRes = await generateVoice({ script: resolvedScript, language })
      const voiceFileRaw = voiceRes.data?.file || voiceRes.data?.data?.file
      if (!voiceFileRaw) throw new Error('Voice generation returned no file path')
      // Handle both string path and object { path, imageKitUrl } formats
      const voiceFile = typeof voiceFileRaw === 'string' ? voiceFileRaw : voiceFileRaw.path
      if (!voiceFile) throw new Error('Voice file path is invalid')
      setAudioPath(voiceFile)
      addLog(`Voice file ready: ${voiceFile.split('/').pop()}`, 'success')
      stepCompleted(3)
      if (!mountedRef.current) return
      setProgress(40); setCurrentStep(4)

      // STEP 4: Visuals
      if (!stepInProgress(4)) return
      addLog('Downloading stock visuals...')
      const visualsRes = await downloadVisuals({ script: resolvedScript, topic: topicToUse || niche, videoType })
      const videoPathRaw = visualsRes.data?.data?.videoPath || visualsRes.data?.videoPath
      if (!videoPathRaw) throw new Error('Visual download returned no video path')
      // Handle both string path and object { path, imageKitUrl } formats
      const downloadedVideoPath = typeof videoPathRaw === 'string' ? videoPathRaw : videoPathRaw.path
      if (!downloadedVideoPath) throw new Error('Video file path is invalid')
      setVideoPath(downloadedVideoPath)
      addLog('Visual assets downloaded', 'success')
      stepCompleted(4)
      if (!mountedRef.current) return
      setProgress(55); setCurrentStep(5)

      // STEP 5: Pipeline Render
      if (!stepInProgress(5)) return
      addLog('Starting render pipeline...')
      setPipelineStatus('polling')
      dispatch({ type: 'SET_PIPELINE_STATUS', payload: { step: 5, stepLabel: 'Rendering', status: 'running', progress: 55, logs: ['Starting render...'], jobId: null } })

      const pipelineRes = await createPipeline({ forceNiche: selectedNiche || undefined, quality, language, videoType, script: resolvedScript, title: videoTitle || undefined, audioPath: voiceFile || undefined, videoPath: downloadedVideoPath || undefined })
      const jobData = pipelineRes.data.data || pipelineRes.data
      const jobId = jobData?.jobId || jobData?.id || 'pending'
      addLog(`Pipeline job created: ${jobId}`, 'success')

      addLog('Polling for pipeline progress...')
      let pollingInProgress = false
      await new Promise((resolve, reject) => {
        const POLL_INTERVAL = pipelinePollInterval
        const TIMEOUT_MS = pipelineTimeout
        pollIntervalRef.current = setInterval(async () => {
          if (pollingInProgress) return
          pollingInProgress = true
          try {
            const statusRes = await getPipelineStatus(jobId)
            if (!mountedRef.current) { clearInterval(pollIntervalRef.current); pollingInProgress = false; return }
            const pollData = statusRes.data.data || statusRes.data
            const pct = pollData.progress ?? 0
            const backendStep = pollData.step ?? 0
            const stepLabel = stepLabels[backendStep] || `Step ${backendStep}`
            setProgress(pct)
            dispatch({ type: 'SET_PIPELINE_STATUS', payload: { step: 5, stepLabel, status: 'running', progress: pct, logs: [`${stepLabel}: ${pct}%`], jobId } })
            pollingInProgress = false
            if (pollData.status === 'completed' || pct >= 100) {
              clearInterval(pollIntervalRef.current)
              if (mountedRef.current) {
                addLog('Pipeline completed successfully!', 'success')
                setResult({ title: pollData.result?.title || videoTitle || `${niche} - ${topicToUse || 'Auto'}`, niche: pollData.result?.niche || niche, jobId, videoId: pollData.result?.videoId || jobData?.videoId || 'pending', tags: pollData.result?.tags || jobData?.tags || [], seo: pollData.result?.seo || null })
              }
              resolve()
            } else if (pollData.status === 'failed' || pollData.status === 'error') {
              clearInterval(pollIntervalRef.current)
              reject(new Error(pollData.error || 'Pipeline render failed'))
            }
          } catch { pollingInProgress = false }
        }, POLL_INTERVAL)
        pollTimeoutRef.current = setTimeout(() => { clearInterval(pollIntervalRef.current); if (mountedRef.current) addLog('Pipeline timed out', 'warn'); resolve() }, TIMEOUT_MS)
      })

      if (!mountedRef.current) return
      addLog('Pipeline complete!', 'success')
      stepCompleted(5)
      setProgress(100)
      setCurrentStep(6)
      // Step 6 (Publish) is completed when user clicks Publish or auto-uploads
      setPipelineStatus('complete')
      if (!result) setResult({ title: videoTitle || `${niche} - ${topicToUse || 'Auto'}`, niche, jobId, videoId: jobData?.videoId || 'pending', tags: jobData?.tags || [] })
      setTimeout(() => { if (mountedRef.current) dispatch({ type: 'CLEAR_PIPELINE_STATUS' }) }, 30000)
    } catch (err) {
      if (!mountedRef.current) return
      const errMsg = err.response?.data?.message || err.message
      addLog(`Error: ${errMsg}`, 'error')
      setError(errMsg); setPipelineStatus('error')
      const activeEntry = Object.entries(stepStatuses).find(([, s]) => s === 'active')
      const failedStep = activeEntry ? Number(activeEntry[0]) : currentStep
      stepFailed(failedStep)
      dispatch({ type: 'SET_PIPELINE_STATUS', payload: { step: failedStep, stepLabel: 'Error', status: 'error', progress, logs, error: errMsg } })
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
      <PageHeader title="Video Pipeline" subtitle="Step-by-step video creation workflow" />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={runWorkflow} dismissible onDismiss={() => setError(null)} />
        </div>
      )}

      {/* ═══ 6-Step Timeline ═══ */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
        <PipelineStep stepNumber={1} label="Choose Topic" status={getStepStatus(1)} onRetry={() => { setError(null); setCurrentStep(1) }}>
          {getStepStatus(1) !== 'completed' && (
            <div className="space-y-3">
              <div>
                <button onClick={loadTrends} disabled={trendsLoading} className="text-xs text-primary hover:text-primary/80 transition mb-2 flex items-center gap-1 disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>refresh</span>
                  {trendsLoading ? 'Loading...' : 'Refresh trends'}
                </button>
                {trends.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {trends.slice(0, 6).map((t, i) => {
                      const tName = typeof t === 'string' ? t : t.topic || t.name || t.title
                      return (
                        <button key={i} onClick={() => handleSelectTrendingTopic(tName)}
                          className={`chip ${topicSource === 'trending' && trendingTopic === tName ? 'chip-active' : 'chip-default'}`}>
                          {tName}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <label className="text-xs text-gray-500 leading-9 sm:leading-normal" htmlFor="custom-topic-input">Or custom:</label>
                <input id="custom-topic-input" type="text" value={customTopic}
                  onChange={(e) => { setCustomTopic(e.target.value); setTopicSource('custom') }}
                  placeholder="Enter a topic..."
                  className="flex-1 w-full px-4 py-2.5 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition touch-target" />
              </div>
            </div>
          )}
          {getStepStatus(1) === 'completed' && (
            <div className="text-body-sm text-tertiary">Topic: <strong>{topicResolved}</strong></div>
          )}
        </PipelineStep>

        <PipelineStep stepNumber={2} label="Generate Script" status={getStepStatus(2)} onRetry={handleGenerateScript}>
          {getStepStatus(2) !== 'completed' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <CustomSelect value={language} onChange={setLanguage} options={languageOptions} className="flex-1" />
                <div className="flex gap-2">
                  <button onClick={() => setVideoType('long')} className={`px-3 py-2 rounded-lg text-xs border transition ${videoType === 'long' ? 'gradient-primary text-white border-transparent' : 'bg-white/[0.05] border-glass-border text-gray-400'}`}>Long</button>
                  <button onClick={() => setVideoType('short')} className={`px-3 py-2 rounded-lg text-xs border transition ${videoType === 'short' ? 'gradient-primary text-white border-transparent' : 'bg-white/[0.05] border-glass-border text-gray-400'}`}>Short</button>
                </div>
              </div>
              <button onClick={handleGenerateScript} disabled={scriptLoading || !topicResolved} className="px-4 py-2 gradient-primary rounded-xl hover:opacity-90 transition text-body-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {scriptLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating...</>) : 'Generate Script'}
              </button>
            </div>
          )}
          {getStepStatus(2) === 'completed' && script && (
            <div className="bg-black/40 rounded-xl p-3 max-h-[120px] overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{script.slice(0, 300)}...</pre>
            </div>
          )}
        </PipelineStep>

        <PipelineStep stepNumber={3} label="Voice" status={getStepStatus(3)}>
          {getStepStatus(3) === 'active' && (
            <div className="text-body-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Generating voice from script...
            </div>
          )}
          {getStepStatus(3) === 'completed' && audioPath && (
            <div className="text-body-sm text-tertiary">Voice file: <strong>{audioPath.split('/').pop()}</strong></div>
          )}
        </PipelineStep>

        <PipelineStep stepNumber={4} label="Visuals" status={getStepStatus(4)}>
          {getStepStatus(4) === 'active' && (
            <div className="text-body-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Gathering stock visuals...
            </div>
          )}
          {getStepStatus(4) === 'completed' && videoPath && (
            <div className="text-body-sm text-tertiary">Video asset: <strong>{videoPath.split('/').pop()}</strong></div>
          )}
        </PipelineStep>

        <PipelineStep stepNumber={5} label="Render & Finalize" status={getStepStatus(5)} onRetry={runWorkflow}>
          {getStepStatus(5) === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(10, progress)}%` }} />
                </div>
                <span className="text-body-sm text-gray-400">{progress}%</span>
              </div>
              {pipelineStatus === 'polling' && (
                <div className="text-xs text-gray-500">Polling pipeline status...</div>
              )}
            </div>
          )}
        </PipelineStep>

        <PipelineStep stepNumber={6} label="Publish" status={getStepStatus(6)}>
          {getStepStatus(6) !== 'completed' && getStepStatus(6) !== 'active' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="video-title" className="text-xs text-gray-500 mb-1 block">Video Title</label>
                <input id="video-title" type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title (optional)"
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition touch-target" />
              </div>
              <div>
                <label htmlFor="video-description" className="text-xs text-gray-500 mb-1 block">Video Description</label>
                <textarea id="video-description" value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder="Video description (optional)" rows={2}
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition resize-none touch-target" />
              </div>
              <div>
                <label htmlFor="video-tags" className="text-xs text-gray-500 mb-1 block">Tags</label>
                <input id="video-tags" type="text" value={videoTags} onChange={(e) => setVideoTags(e.target.value)} placeholder="Tags (comma separated, optional)"
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition touch-target" />
              </div>
            </div>
          )}
        </PipelineStep>
      </div>

      {/* ═══ Controls ═══ */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Select Niche</h3>
            <CustomSelect value={selectedNiche} onChange={setSelectedNiche} options={nicheOptions} placeholder="Choose a niche..." disabled={loading} />
          </div>
          <div>
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Video Quality</h3>
            <div className="grid grid-cols-3 gap-2">
              {qualityOptions.map(q => (
                <button key={q.value} onClick={() => setQuality(q.value)} disabled={loading}
                  className={`px-3 py-3 rounded-xl border transition-all ${quality === q.value ? 'gradient-primary border-transparent text-white' : 'glass border-glass-border text-gray-400 hover:text-white hover:border-white/20'}`}>
                  <span className="material-symbols-outlined text-lg block mb-1" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{q.icon}</span>
                  <div className="text-xs font-medium">{q.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{q.sublabel}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={runWorkflow} disabled={loading || pipelineStatus === 'error'}
          className="w-full px-6 py-4 gradient-primary rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 touch-target">
          {loading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {pipelineStatus === 'polling' ? 'Polling Progress...' : 'Processing...'}</>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_arrow</span>
              Run Full Pipeline
            </>
          )}
        </button>

        {/* Logs */}
        <div className="mt-6 bg-black/50 rounded-xl p-4 sm:p-5 max-h-[200px] sm:max-h-[250px] overflow-y-auto font-mono text-xs sm:text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>terminal</span>
              Ready to start - configure steps above and click "Run Full Pipeline"
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`mb-2 ${log.type === 'success' ? 'text-tertiary' : log.type === 'error' ? 'text-primary-container' : 'text-gray-400'}`}>
                <span className="text-gray-600 mr-2">[{log.time}]</span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ Result ═══ */}
      {result && (
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider">Pipeline Result</h3>
            <StatusBadge status="success">Complete</StatusBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.03] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Title</div>
              <div className="text-title-md font-semibold">{result.title}</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Niche</div>
              <div className="text-body-lg">{result.niche}</div>
            </div>
            {result.tags?.length > 0 && (
              <div className="bg-white/[0.03] rounded-xl p-4 col-span-2">
                <div className="text-xs text-gray-500 mb-1">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
                    <span key={i} className="chip chip-active">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white/[0.03] rounded-xl p-4 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Job ID</div>
              <div className="text-body-lg font-mono text-tertiary">{result.jobId || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workflow
