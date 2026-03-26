import { useState } from 'react'
import { generateScript } from '../services/api'
import { CustomSelect } from '../components/CustomSelect'

const CONTENT_TYPES = [
  { value: 'script', label: '✍️ YouTube Script', icon: '✍️' },
  { value: 'poem', label: '🎨 Poem', icon: '🎨' },
  { value: 'story', label: '📖 Story', icon: '📖' },
  { value: 'facts', label: '💡 Fun Facts', icon: '💡' },
  { value: 'rhyme', label: '🎵 Rhyming Rhyme', icon: '🎵' },
  { value: 'song', label: '🎤 Song Lyrics', icon: '🎤' },
  { value: 'joke', label: '😂 Jokes', icon: '😂' },
  { value: 'riddle', label: '🧩 Riddles', icon: '🧩' }
]

const AGE_GROUPS = [
  { value: '3-5', label: '👶 Toddlers (3-5)', sublabel: 'Simple & Repetitive' },
  { value: '5-8', label: '🧒 Kids (5-8)', sublabel: 'Fun & Educational' },
  { value: '8-12', label: '👧 Pre-Teens (8-12)', sublabel: 'Engaging Stories' },
  { value: '13-18', label: '🧑 Teenagers (13-18)', sublabel: 'Trendy & Relatable' },
  { value: '18-25', label: '👨 Young Adults (18-25)', sublabel: 'Modern & Motivational' },
  { value: '25-40', label: '👨‍💼 Adults (25-40)', sublabel: 'Professional' },
  { value: '40+', label: '👴 Mature (40+)', sublabel: 'Wise & Reflective' }
]

function ScriptGenerator() {
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('poem')
  const [ageGroup, setAgeGroup] = useState('5-8')
  const [maxWords, setMaxWords] = useState(150)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

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

  return (
    <div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.3);
        }
      `}</style>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Content Generator</h1>
        <div className="px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400">
          ✨ AI Powered
        </div>
      </div>

      {/* Topic Input */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">What's your topic?</h3>
        <div className="relative">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., butterfly, friendship, space, nature..."
            className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 gradient rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                ✨ Generate
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* Content Type Selection */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">What do you want to create?</h3>
        <div className="grid grid-cols-4 gap-3">
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setContentType(ct.value)}
              className={`p-4 rounded-xl border transition-all ${
                contentType === ct.value
                  ? 'gradient border-transparent text-white shadow-lg shadow-red-500/20'
                  : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-2">{ct.icon}</div>
              <div className="text-sm font-medium">{ct.label.replace(/^[^\s]+\s/, '')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Age Group */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Target Audience</h3>
          <CustomSelect
            value={ageGroup}
            onChange={setAgeGroup}
            options={AGE_GROUPS}
            placeholder="Select age group..."
          />
          <div className="mt-3 text-xs text-gray-500">
            Content will be adjusted for selected age group
          </div>
        </div>

        {/* Word Limit */}
        <div className="glass rounded-2xl p-6">
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
            onChange={(e) => setMaxWords(e.target.value)}
            className="w-full accent-red-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:gradient [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-3">
            <span>Short</span>
            <span className="text-white font-medium">{maxWords} words</span>
            <span>Long</span>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Generated Content</h3>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                  {CONTENT_TYPES.find(c => c.value === result.contentType)?.label || result.contentType}
                </span>
                <span className="px-3 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  Age: {result.ageGroup}
                </span>
                <span className="px-3 py-1 bg-white/10 text-gray-400 rounded-full text-xs">
                  {getWordCount()} words
                </span>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center gap-2"
            >
              📋 Copy to Clipboard
            </button>
          </div>
          
          <div className="bg-black/60 rounded-2xl p-6 max-h-[400px] overflow-y-auto border border-white/5">
            <pre className="whitespace-pre-wrap text-gray-200 font-sans leading-relaxed text-[15px]">
              {result.script}
            </pre>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              🔄 Regenerate with same settings
            </button>
            <button
              onClick={() => {
                setTopic('')
                setResult(null)
              }}
              className="flex-1 px-4 py-3 gradient rounded-xl hover:opacity-90 transition font-semibold"
            >
              ✨ Create New Content
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
