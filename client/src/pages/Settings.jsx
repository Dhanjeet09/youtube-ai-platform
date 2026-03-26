import { useState, useEffect } from 'react'
import { getYouTubeAuthStatus, getYouTubeAuthUrl } from '../services/api'

const TABS = [
  { id: 'general', label: '⚙️ General', icon: '⚙️' },
  { id: 'youtube', label: '📺 YouTube', icon: '📺' },
  { id: 'scheduler', label: '⏰ Scheduler', icon: '⏰' },
  { id: 'api', label: '🔑 API Keys', icon: '🔑' },
  { id: 'data', label: '💾 Data', icon: '💾' }
]

function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [ytAuth, setYtAuth] = useState({ authenticated: false, loading: true })
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    checkYouTubeStatus()
  }, [])

  const checkYouTubeStatus = async () => {
    try {
      const res = await getYouTubeAuthStatus()
      setYtAuth({ authenticated: res.data.authenticated, loading: false })
    } catch (err) {
      setYtAuth({ authenticated: false, loading: false })
    }
  }

  const connectYouTube = async () => {
    setConnecting(true)
    try {
      const res = await getYouTubeAuthUrl()
      const authUrl = res.data.authUrl

      const width = 500, height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      const popup = window.open(
        authUrl,
        'YouTube Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          checkYouTubeStatus()
          setConnecting(false)
        }
      }, 1000)

      window.addEventListener('message', (event) => {
        if (event.data === 'youtube-auth-success') {
          clearInterval(checkClosed)
          popup?.close()
          checkYouTubeStatus()
          setConnecting(false)
        }
      })

    } catch (err) {
      console.error(err)
      setConnecting(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Modern Tab Navigation */}
      <div className="glass rounded-2xl p-2 mb-6 flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
              activeTab === tab.id 
                ? 'gradient text-white shadow-lg shadow-red-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label.replace(/^[^\s]+\s/, '')}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">System Status</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-5 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">🖥️</div>
                <div>
                  <div className="text-sm text-gray-400">Backend</div>
                  <div className="text-green-400 font-medium">Online</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-5 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">🎨</div>
                <div>
                  <div className="text-sm text-gray-400">Frontend</div>
                  <div className="text-green-400 font-medium">Online</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-5 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">🗄️</div>
                <div>
                  <div className="text-sm text-gray-400">Database</div>
                  <div className="text-green-400 font-medium">Connected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube */}
      {activeTab === 'youtube' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">YouTube Integration</h3>
          
          <div className="flex items-center gap-6 mb-8">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
              ytAuth.authenticated ? 'bg-red-500/20' : 'bg-white/5'
            }`}>
              <svg className={`w-10 h-10 ${ytAuth.authenticated ? 'text-red-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xl font-semibold mb-2">YouTube Channel</div>
              {ytAuth.loading ? (
                <div className="text-gray-500 flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin"></div>
                  Checking connection...
                </div>
              ) : ytAuth.authenticated ? (
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium border border-green-500/30">✅ Connected</span>
                  <span className="text-gray-400">Ready to upload videos</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium border border-yellow-500/30">⚠️ Not Connected</span>
                  <span className="text-gray-400">Connect to enable uploads</span>
                </div>
              )}
            </div>
          </div>

          {!ytAuth.authenticated && !ytAuth.loading && (
            <button
              onClick={connectYouTube}
              disabled={connecting}
              className="gradient text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-3"
            >
              {connecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Opening Google...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Connect YouTube Account
                </>
              )}
            </button>
          )}

          {ytAuth.authenticated && (
            <button
              onClick={checkYouTubeStatus}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-sm"
            >
              🔄 Refresh Status
            </button>
          )}
        </div>
      )}

      {/* Scheduler */}
      {activeTab === 'scheduler' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">Auto Upload Schedule</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { time: '10:00 AM', label: 'Morning', icon: '🌅', status: 'active' },
              { time: '2:00 PM', label: 'Afternoon', icon: '☀️', status: 'active' },
              { time: '6:00 PM', label: 'Evening', icon: '🌆', status: 'active' }
            ].map((slot, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 border border-green-500/20">
                <div className="text-4xl mb-3">{slot.icon}</div>
                <div className="text-sm text-gray-400">{slot.label}</div>
                <div className="text-xl font-bold mt-1">{slot.time}</div>
                <div className="mt-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium border border-green-500/30">✅ Running</span>
              <span className="text-gray-400">Timezone: Asia/Kolkata (IST)</span>
            </div>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'api' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">API Configuration</h3>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 text-yellow-400">
              <span>⚠️</span>
              <span className="text-sm">API keys are stored in the <code className="bg-black/30 px-2 py-1 rounded">.env</code> file on the server. Restart after changes.</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'GROQ API Key', icon: '🤖', desc: 'AI Script Generation' },
              { name: 'Pexels API Key', icon: '🎬', desc: 'Stock Video Downloads' },
              { name: 'YouTube OAuth2', icon: '📺', desc: 'Video Upload' }
            ].map((key, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{key.icon}</span>
                  <div>
                    <div className="text-sm text-gray-400">{key.desc}</div>
                    <div className="font-medium">{key.name}</div>
                  </div>
                </div>
                <input type="password" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-500 text-sm" placeholder="••••••••••••••••" disabled />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data */}
      {activeTab === 'data' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">Data Management</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '🗑️', label: 'Clear Asset Cache', desc: 'Delete temporary video files', danger: true },
              { icon: '📊', label: 'Reset Statistics', desc: 'Clear all analytics data', danger: true },
              { icon: '🎯', label: 'Reset Niche Data', desc: 'Clear niche performance data', danger: true }
            ].map((action, i) => (
              <button
                key={i}
                className="bg-white/5 hover:bg-white/10 rounded-xl p-5 border border-white/10 transition-all text-left group"
              >
                <div className="text-3xl mb-3">{action.icon}</div>
                <div className="font-medium mb-1">{action.label}</div>
                <div className="text-xs text-gray-500">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      <div className="glass rounded-2xl p-6 mt-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 gradient rounded-2xl flex items-center justify-center text-2xl">
            ▶
          </div>
          <div>
            <div className="text-xl font-bold">AutoTube v1.0.0</div>
            <div className="text-gray-400 text-sm">AI-Powered YouTube Automation Platform</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
