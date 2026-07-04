/**
 * ScriptGenerator - AI-powered script generation with two-column layout
 * Kinetic Glass design: Form (5 cols) + Preview (7 cols)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateScript, getScriptOptions, getScriptLanguages, getScriptConfig } from '../../services/api'
import { CustomSelect } from '../../components/CustomSelect'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import PageHeader from '../../components/PageHeader'
import { CONTENT_TYPE_ICONS } from '../../constants'

function ScriptGenerator() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [language, setLanguage] = useState('en')
  const [videoType, setVideoType] = useState('long')
  const [maxWords, setMaxWords] = useState(200)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [scriptOptions, setScriptOptions] = useState(null)
  const [scriptConfig, setScriptConfig] = useState(null)
  const [scriptLanguages, setScriptLanguages] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)

  const FALLBACK_CONTENT_TYPES = [
    { value: 'script', label: 'YouTube Script', icon: 'edit' },
    { value: 'poem', label: 'Poem', icon: 'palette' },
    { value: 'story', label: 'Story', icon: 'menu_book' },
    { value: 'facts', label: 'Fun Facts', icon: 'lightbulb' },
    { value: 'rhyme', label: 'Rhyming Rhyme', icon: 'music_note' },
    { value: 'song', label: 'Song Lyrics', icon: 'mic' },
    { value: 'joke', label: 'Jokes', icon: 'sentiment_very_satisfied' },
    { value: 'riddle', label: 'Riddles', icon: 'extension' }
  ]

  const FALLBACK_AGE_GROUPS = [
    { value: '3-5', label: 'Toddlers (3-5)', sublabel: 'Simple & Repetitive' },
    { value: '5-8', label: 'Kids (5-8)', sublabel: 'Fun & Educational' },
    { value: '8-12', label: 'Pre-Teens (8-12)', sublabel: 'Engaging Stories' },
    { value: '13-18', label: 'Teenagers (13-18)', sublabel: 'Trendy & Relatable' },
    { value: '18-25', label: 'Young Adults (18-25)', sublabel: 'Modern & Motivational' },
    { value: '25-40', label: 'Adults (25-40)', sublabel: 'Professional' },
    { value: '40+', label: 'Mature (40+)', sublabel: 'Wise & Reflective' }
  ]

  const FALLBACK_LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'hinglish', label: 'Hinglish' }
  ]

  useEffect(() => {
    loadScriptOptions()
  }, [])

  const loadScriptOptions = async () => {
    setOptionsLoading(true)
    try {
      const [optionsRes, configRes, langsRes] = await Promise.allSettled([
        getScriptOptions(),
        getScriptConfig(),
        getScriptLanguages()
      ])

      if (optionsRes.status === 'fulfilled') {
        const data = optionsRes.value.data.data || optionsRes.value.data
        setScriptOptions(data)
        if (data.contentTypes?.length > 0 && !contentType) setContentType(data.contentTypes[0].value)
        if (data.ageGroups?.length > 0 && !ageGroup) setAgeGroup(data.ageGroups[0].value)
      } else {
        if (!contentType) setContentType('poem')
        if (!ageGroup) setAgeGroup('5-8')
      }

      if (configRes.status === 'fulfilled') {
        const configData = configRes.value.data.data || configRes.value.data
        setScriptConfig(configData)
        if (configData.defaultMaxWords && maxWords === 200) setMaxWords(configData.defaultMaxWords)
        if (configData.ageGroups?.length > 0 && !ageGroup) setAgeGroup(configData.ageGroups[0].value)
        if (configData.contentTypes?.length > 0 && !contentType) setContentType(configData.contentTypes[0].value)
      }

      if (langsRes.status === 'fulfilled') {
        const langsData = langsRes.value.data.data || langsRes.value.data
        setScriptLanguages(langsData.languages || [])
      }
    } catch {
      if (!contentType) setContentType('poem')
      if (!ageGroup) setAgeGroup('5-8')
    } finally {
      setOptionsLoading(false)
    }
  }

  const contentTypes = scriptConfig?.contentTypes || scriptOptions?.contentTypes || FALLBACK_CONTENT_TYPES
  const ageGroups = scriptConfig?.ageGroups || scriptOptions?.ageGroups || FALLBACK_AGE_GROUPS
  const languageOptions = scriptLanguages.length > 0
    ? scriptLanguages.map(l => ({ value: l.code, label: l.name }))
    : FALLBACK_LANGUAGE_OPTIONS
  const videoTypeOptions = scriptConfig?.videoTypes || [
    { value: 'long', label: 'Long Form', icon: 'smart_display' },
    { value: 'short', label: 'Short', icon: 'smartphone' }
  ]
  const wordMin = scriptConfig?.minWords || 50
  const wordMax = scriptConfig?.maxWords || 500
  const wordStep = scriptConfig?.wordStep || 25

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Please enter a topic'); return }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await generateScript({ topic: topic.trim(), contentType, ageGroup, language, videoType, maxWords: parseInt(maxWords) })
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => { if (result?.script) navigator.clipboard.writeText(result.script) }

  const getWordCount = () => result?.script ? result.script.split(/\s+/).filter(w => w.length > 0).length : 0

  const getEstDuration = () => {
    const words = parseInt(maxWords)
    const minutes = Math.ceil(words / 150)
    return minutes < 1 ? '30s' : `${minutes}min`
  }

  if (optionsLoading) return <LoadingSpinner size="lg" message="Loading script options..." />

  return (
    <div>
      <PageHeader title="Content Generator" subtitle="AI-powered script creation" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ═══ Left Column: Form (5 cols) ═══ */}
        <div className="lg:col-span-5 space-y-5">
          {/* Topic Input */}
          <div className="glass rounded-2xl p-5">
            <label htmlFor="topic-input" className="text-label-caps text-gray-500 uppercase tracking-wider mb-3 block">Topic</label>
            <textarea
              id="topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., butterfly, friendship, space, nature..."
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.05] border border-glass-border rounded-xl text-on-surface text-body-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
            />
            {error && (
              <div className="mt-3">
                <ErrorMessage message={error} dismissible onDismiss={() => setError(null)} />
              </div>
            )}
          </div>

          {/* Content Type Chips */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Content Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {contentTypes.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  className={`chip ${contentType === ct.value ? 'chip-active' : 'chip-default'}`}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>
                    {CONTENT_TYPE_ICONS[ct.value] || 'article'}
                  </span>
                  <span className="truncate">{ct.label.replace(/^[^\s]+\s/, '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Target Audience</h3>
            <CustomSelect value={ageGroup} onChange={setAgeGroup} options={ageGroups} placeholder="Select age group..." />
          </div>

          {/* Language */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Language</h3>
            <CustomSelect value={language} onChange={setLanguage} options={languageOptions} placeholder="Select language..." />
          </div>

          {/* Video Type Toggle */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-label-caps text-gray-500 uppercase tracking-wider mb-3">Video Type</h3>
            <div className="flex gap-2">
              {videoTypeOptions.map(vt => (
                <button
                  key={vt.value}
                  onClick={() => setVideoType(vt.value)}
                  className={`flex-1 px-4 py-3 rounded-xl border transition-all touch-target ${
                    videoType === vt.value
                      ? 'gradient-primary border-transparent text-white'
                      : 'glass border-glass-border text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg mr-1 align-middle" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>{vt.icon}</span>
                  <span className="text-body-sm font-medium">{vt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Length */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-label-caps text-gray-500 uppercase tracking-wider">Content Length</h3>
              <span className="px-3 py-1 gradient-primary rounded-full text-body-sm font-bold">
                ~{getEstDuration()}
              </span>
            </div>
            <input
              type="range" min={wordMin} max={wordMax} step={wordStep} value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value))}
              className="w-full accent-primary-container h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:gradient-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Content length in words"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Short</span>
              <span className="text-on-surface font-medium">{maxWords} words</span>
              <span>Long</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full px-6 py-4 gradient-primary rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>auto_awesome</span>
                Generate
              </>
            )}
          </button>
        </div>

        {/* ═══ Right Column: Preview (7 cols) ═══ */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="glass rounded-2xl p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-title-md font-semibold">Generated Content</h3>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="chip chip-active text-xs">{contentTypes.find(c => c.value === result.contentType)?.label || result.contentType}</span>
                    <span className="chip chip-default text-xs">{getWordCount()} words</span>
                    <span className="chip chip-default text-xs">{language === 'hinglish' ? 'Hinglish' : 'English'}</span>
                    <span className="chip chip-default text-xs">{videoType === 'short' ? 'Short' : 'Long'}</span>
                  </div>
                </div>
              </div>

              {/* Terminal-style preview */}
              <div className="terminal-preview mb-4">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500"></div>
                  <div className="terminal-dot bg-yellow-500"></div>
                  <div className="terminal-dot bg-green-500"></div>
                  <span className="text-xs text-gray-500 ml-2 font-mono">output.txt</span>
                </div>
                <div className="p-5 max-h-[350px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-300 font-mono leading-relaxed text-[13px]">
                    {result.script}
                  </pre>
                </div>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>text_fields</span>
                  {getWordCount()} words
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>schedule</span>
                  ~{getEstDuration()}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 glass rounded-xl hover:bg-white/[0.08] transition flex items-center justify-center gap-2 text-body-sm touch-target"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>content_copy</span>
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => navigate('/workflow', { state: { script: result.script, topic: topic.trim(), contentType, language, videoType } })}
                  className="px-4 py-3 gradient-primary rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 text-body-sm touch-target"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>arrow_forward</span>
                  Use in Pipeline
                </button>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="glass rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <span className="material-symbols-outlined text-6xl text-gray-600 mb-4" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>edit_note</span>
              <h3 className="text-title-md font-semibold mb-2">Script Preview</h3>
              <p className="text-body-sm text-gray-400 max-w-sm">
                Fill in the form and click Generate to create your AI-powered content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScriptGenerator
