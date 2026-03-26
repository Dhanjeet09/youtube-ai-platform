import { useState, useEffect } from 'react'
import { runPipeline, getBestNiche, getNiches, createPipeline } from '../services/api'
import { CustomSelect } from '../components/CustomSelect'

const STEPS = [
  { id: 1, name: 'Trends', icon: '🔍', key: 'trends' },
  { id: 2, name: 'Script', icon: '✍️', key: 'script' },
  { id: 3, name: 'Voice', icon: '🎤', key: 'voice' },
  { id: 4, name: 'Video', icon: '🎬', key: 'video' },
  { id: 5, name: 'Render', icon: '🎨', key: 'render' },
  { id: 6, name: 'Upload', icon: '📤', key: 'upload' }
]

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

function Workflow() {
  const [selectedNiche, setSelectedNiche] = useState('')
  const [quality, setQuality] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus, setStepStatus] = useState({})
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { time: timestamp, message, type }])
  }

  const runWorkflow = async (fullUpload = true) => {
    setLoading(true)
    setResult(null)
    setLogs([])
    setStepStatus({})
    setCurrentStep(0)
    setProgress(0)
    addLog('Starting workflow...')

    try {
      addLog('Fetching best niche...')
      setCurrentStep(1)
      
      let niche = selectedNiche
      if (!niche) {
        const bestRes = await getBestNiche()
        niche = bestRes.data.data.niche
      }
      addLog(`Selected niche: ${niche}`)
      setStepStatus(prev => ({ ...prev, trends: 'completed' }))
      setProgress(16)
      setCurrentStep(2)
      addLog('Generating script with AI...')
      setStepStatus(prev => ({ ...prev, script: 'completed' }))
      setProgress(32)
      setCurrentStep(3)
      addLog('Generating voice...')
      setStepStatus(prev => ({ ...prev, voice: 'completed' }))
      setProgress(48)
      setCurrentStep(4)
      addLog('Downloading stock video...')
      setStepStatus(prev => ({ ...prev, video: 'completed' }))
      setProgress(64)
      setCurrentStep(5)
      addLog('Rendering final video...')
      setStepStatus(prev => ({ ...prev, render: 'completed' }))
      setProgress(80)

      if (fullUpload) {
        addLog('Uploading to YouTube...')
        const pipelineRes = await runPipeline({ forceNiche: selectedNiche || undefined, quality })
        const data = pipelineRes.data.data
        setStepStatus(prev => ({ ...prev, upload: 'completed' }))
        setResult(data)
        addLog(`Upload successful! Video ID: ${data.videoId}`)
      } else {
        const pipelineRes = await createPipeline({ forceNiche: selectedNiche || undefined, quality })
        const data = pipelineRes.data.data
        setResult(data)
        addLog('Video created successfully!')
      }
      setProgress(100)
    } catch (err) {
      addLog(`Error: ${err.response?.data?.message || err.message}`, 'error')
      setStepStatus(prev => ({ ...prev, [STEPS[currentStep - 1]?.key]: 'failed' }))
    } finally {
      setLoading(false)
    }
  }

  const getStepStatus = (step) => {
    if (stepStatus[step.key] === 'completed') return 'completed'
    if (stepStatus[step.key] === 'failed') return 'failed'
    if (currentStep === step.id) return 'active'
    return 'pending'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Video Pipeline</h1>
        <div className="px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400">
          ⚡ Automated
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step) => {
            const status = getStepStatus(step)
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
                  status === 'completed' ? 'bg-green-500 text-black' :
                  status === 'failed' ? 'bg-red-500 text-white' :
                  status === 'active' ? 'gradient animate-pulse shadow-lg shadow-red-500/30' :
                  'bg-white/5 text-gray-500 border border-white/10'
                }`}>
                  {status === 'completed' ? '✓' : status === 'failed' ? '✗' : step.icon}
                </div>
                <div className="mt-3 text-sm text-gray-400">{step.name}</div>
                <div className="text-xs mt-1">
                  {status === 'completed' ? '✅ Done' : 
                   status === 'failed' ? '❌ Failed' : 
                   status === 'active' ? '⏳ Running' : 
                   '○ Ready'}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full gradient rounded-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Niche Selection */}
          <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Select Niche</h3>
            <CustomSelect
              value={selectedNiche}
              onChange={setSelectedNiche}
              options={NICHE_OPTIONS}
              placeholder="Choose a niche..."
            />
          </div>

          {/* Quality Selection */}
          <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Video Quality</h3>
            <div className="flex gap-3">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  disabled={loading}
                  className={`flex-1 px-4 py-4 rounded-xl border transition-all ${
                    quality === q.value
                      ? 'gradient border-transparent text-white shadow-lg shadow-red-500/20'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-medium">{q.label}</div>
                  <div className="text-xs mt-1 opacity-70">{q.sublabel}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 font-medium"
            onClick={() => runWorkflow(false)}
            disabled={loading}
          >
            🎬 Create Video Only
          </button>
          <button 
            className="flex-1 px-6 py-4 gradient rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2"
            onClick={() => runWorkflow(true)}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                ⚡ Run Full Pipeline
              </>
            )}
          </button>
        </div>

        {/* Logs */}
        <div className="mt-6 bg-black/50 rounded-xl p-5 max-h-[250px] overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-600 flex items-center gap-2">
              <span>🎬</span> Ready to start - Click a button above to begin
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
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Pipeline Result</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Title</div>
              <div className="text-lg font-semibold">{result.title}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Niche</div>
              <div className="text-lg">{result.niche}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {result.tags?.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Video ID</div>
              <div className="text-lg font-mono text-green-400">
                {result.videoId || 'Created locally (upload pending)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workflow
