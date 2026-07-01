/**
 * ScriptGenerator - AI-powered script generation with language & video type selectors
 * 
 * On mount, calls getScriptOptions() to fetch content types and age groups from API.
 * After generating, shows preview with word count and "Continue to Workflow" button.
 * Removes hardcoded options and duplicate slider CSS.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateScript, getScriptOptions } from '../../services/api'
import { CustomSelect } from '../../components/CustomSelect'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import PageHeader from '../../components/PageHeader'

function ScriptGenerator() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [language, setLanguage] = useState('english')
  const [videoType, setVideoType] = useState('long')
  const [maxWords, setMaxWords] = useState(150)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // API-driven options
  const [scriptOptions, setScriptOptions] = useState(null)
  const [optionsLoading, setOptionsLoading] = useState(true)

  // Fallback options if API fails
  const FALLBACK_CONTENT_TYPES = [
    { value: 'script', label: '✍️ YouTube Script', icon: '✍️' },
    { value: 'poem', label: '🎨 Poem', icon: '🎨' },
    { value: 'story', label: '📖 Story', icon: '📖' },
    { value: 'facts', label: '💡 Fun Facts', icon: '💡' },
    { value: 'rhyme', label: '🎵 Rhyming Rhyme', icon: '🎵' },
    { value: 'song', label: '🎤 Song Lyrics', icon: '🎤' },
    { value: 'joke', label: '😂 Jokes', icon: '😂' },
    { value: 'riddle', label: '🧩 Riddles', icon: '🧩' }
  ]

  const FALLBACK_AGE_GROUPS = [
    { value: '3-5', label: '👶 Toddlers (3-5)', sublabel: 'Simple & Repetitive' },
    { value: '5-8', label: '🧒 Kids (5-8)', sublabel: 'Fun & Educational' },
    { value: '8-12', label: '👧 Pre-Teens (8-12)', sublabel: 'Engaging Stories' },
    { value: '13-18', label: '🧑 Teenagers (13-18)', sublabel: 'Trendy & Relatable' },
    { value: '18-25', label: '👨 Young Adults (18-25)', sublabel: 'Modern & Motivational' },
    { value: '25-40', label: '👨‍💼 Adults (25-40)', sublabel: 'Professional' },
    { value: '40+', label: '👴 Mature (40+)', sublabel: 'Wise & Reflective' }
  ]

  const LANGUAGE_OPTIONS = [
    { value: 'english', label: 'English' },
    { value: 'hinglish', label: '🇮🇳 Hinglish' }
  ]

  const VIDEO_TYPE_OPTIONS = [
    { value: 'long', label: '🎬 Long Form' },
    { value: 'short', label: '📱 Short (Shorts)' }
  ]

  // Fetch script options on mount
  useEffect(() => {
    loadScriptOptions()
  }, [])

  const loadScriptOptions = async () => {
    setOptionsLoading(true)
    try {
      const res = await getScriptOptions()
      const data = res.data.data || res.data
      setScriptOptions(data)
      // Set defaults from API
      if (data.contentTypes?.length > 0 && !contentType) {
        setContentType(data.contentTypes[0].value)
      }
      if (data.ageGroups?.length > 0 && !ageGroup) {
        setAgeGroup(data.ageGroups[0].value)
      }
    } catch (err) {
      // Fallback to hardcoded options if API fails
      console.warn('Failed to fetch script options, using fallbacks:', err.message)
      if (!contentType) setContentType('poem')
      if (!ageGroup) setAgeGroup('5-8')
    } finally {
      setOptionsLoading(false)
    }
  }

  const contentTypes = scriptOptions?.contentTypes || FALLBACK_CONTENT_TYPES
  const ageGroups = scriptOptions?.ageGroups || FALLBACK_AGE_GROUPS

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await generateScript({
        topic: topic.trim(),
        contentType,
        ageGroup,
        language,
        videoType,
        maxWords: parseInt(maxWords)
      })
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result?.script) {
      navigator.clipboard.writeText(result.script)
    }
  }

  const getWordCount = () => {
    if (!result?.script) return 0
    return result.script.split(/\s+/).filter(w => w.length > 0).length
  }

  const getEstDuration = () => {
    const words = parseInt(maxWords)
    const minutes = Math.ceil(words / 150)
    return minutes < 1 ? '30s' : `${minutes}min`
  }

  if (optionsLoading) {
    return (
      <LoadingSpinner size="lg" message="Loading script options..." />
    )
  }

  return (
    <div>
      <PageHeader
        title="Content Generator"
        subtitle="AI-powered script creation"
      />

      {/* Topic Input */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        <label htmlFor="topic-input" className="text-sm text-gray-400 uppercase tracking-wider mb-4 block">What's your topic?</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            id="topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., butterfly, friendship, space, nature..."
            className="flex-1 w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto px-6 py-4 gradient rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>✨ Generate</>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3">
            <ErrorMessage message={error} dismissible onDismiss={() => setError(null)} />
          </div>
        )}
      </div>

      {/* Content Type Selection */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">What do you want to create?</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {contentTypes.map(ct => (
            <button
              key={ct.value}
              onClick={() => setContentType(ct.value)}
              className={`p-3 sm:p-4 rounded-xl border transition-all ${
                contentType === ct.value
                  ? 'gradient border-transparent text-white shadow-lg shadow-red-500/20'
                  : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="text-xl sm:text-2xl mb-2">{ct.icon}</div>
              <div className="text-xs sm:text-sm font-medium truncate">{ct.label.replace(/^[^\s]+\s/, '')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Age Group */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Target Audience</h3>
          <CustomSelect
            value={ageGroup}
            onChange={setAgeGroup}
            options={ageGroups}
            placeholder="Select age group..."
          />
          <div className="mt-3 text-xs text-gray-500">
            Content will be adjusted for selected age group
          </div>
        </div>

        {/* Language */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Language</h3>
          <CustomSelect
            value={language}
            onChange={setLanguage}
            options={LANGUAGE_OPTIONS}
            placeholder="Select language..."
          />
          <div className="mt-3 text-xs text-gray-500">
            Choose English or Hinglish (mixed Hindi-English)
          </div>
        </div>

        {/* Video Type */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Video Type</h3>
          <div className="flex gap-3">
            {VIDEO_TYPE_OPTIONS.map(vt => (
              <button
                key={vt.value}
                onClick={() => setVideoType(vt.value)}
                className={`flex-1 px-4 py-4 rounded-xl border transition-all touch-target ${
                  videoType === vt.value
                    ? 'gradient border-transparent text-white shadow-lg shadow-red-500/20'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="text-sm font-medium">{vt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Word Limit */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">Content Length</h3>
          <span className="px-3 py-1 gradient rounded-full text-sm font-bold">
            ~{getEstDuration()}
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="500"
          step="25"
          value={maxWords}
          onChange={(e) => setMaxWords(Number(e.target.value))}
          className="w-full accent-red-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:gradient [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          aria-label="Content length in words"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-3">
          <span>Short</span>
          <span className="text-white font-medium">{maxWords} words</span>
          <span>Long</span>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold">Generated Content</h3>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                  {contentTypes.find(c => c.value === result.contentType)?.label || result.contentType}
                </span>
                <span className="px-2.5 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  Age: {result.ageGroup}
                </span>
                <span className="px-2.5 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  {getWordCount()} words
                </span>
                <span className="px-2.5 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  {language === 'hinglish' ? '🇮🇳 Hinglish' : 'English'}
                </span>
                <span className="px-2.5 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  {videoType === 'short' ? '📱 Short' : '🎬 Long'}
                </span>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center justify-center gap-2 text-sm touch-target"
            >
              📋 Copy
            </button>
          </div>

          <div className="bg-black/60 rounded-2xl p-4 sm:p-6 max-h-[300px] sm:max-h-[400px] overflow-y-auto border border-white/5">
            <pre className="whitespace-pre-wrap text-gray-200 font-sans leading-relaxed text-sm sm:text-[15px]">
              {result.script}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm touch-target"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={() => {
                setTopic('')
                setResult(null)
              }}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm touch-target"
            >
              ✨ New Content
            </button>
            <button
              onClick={() => navigate('/workflow', { state: { script: result.script, topic: topic.trim(), contentType, language, videoType } })}
              className="w-full px-4 py-3.5 gradient rounded-xl hover:opacity-90 transition font-semibold flex items-center justify-center gap-2 text-sm touch-target"
            >
              ⚡ Continue to Workflow
            </button>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      {!result && !loading && (
        <div className="glass2 rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">💡 Try these examples</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { ct: 'poem', age: '5-8', topic: 'Butterfly' },
              { ct: 'story', age: '8-12', topic: 'Dragon Adventure' },
              { ct: 'facts', age: '13-18', topic: 'Black Holes' },
              { ct: 'joke', age: '5-8', topic: 'Penguins' },
              { ct: 'rhyme', age: '3-5', topic: 'Rainbow Colors' },
              { ct: 'song', age: '13-18', topic: 'Summer Memories' },
              { ct: 'riddle', age: '8-12', topic: 'Animals' },
              { ct: 'script', age: '18-25', topic: 'Productivity Tips' }
            ].map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setContentType(ex.ct)
                  setAgeGroup(ex.age)
                  setTopic(ex.topic)
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-full text-sm text-gray-300 hover:text-white transition"
              >
                {ex.topic} <span className="text-gray-500">({ex.age})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScriptGenerator
