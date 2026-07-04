import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    ...(import.meta.env.VITE_API_KEY ? { Authorization: `Bearer ${import.meta.env.VITE_API_KEY}` } : {})
  }
})

API.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// ─── Settings ──────────────────────────────────────────
export const getApiKeyInfo = () => API.get('/settings/api-key')
export const clearCache = () => API.post('/settings/clear-cache')
export const deleteAccount = () => API.post('/settings/delete-account')
export const getAppVersion = () => API.get('/settings/version')

// ─── Analytics ──────────────────────────────────────────
export const getAnalytics = (videoId) => API.get(`/analytics?videoId=${videoId}`)
export const addToDashboard = (videoId) => API.post('/analytics/dashboard', { videoId })

// ─── Niche Management ───────────────────────────────────
export const getBestNiche = () => API.get('/niche?type=best')
export const getNicheStats = () => API.get('/niche?type=stats')
export const getNicheHealth = () => API.get('/niche?type=health')
export const getNicheList = () => API.get('/niche?type=list')

// ─── Trends ─────────────────────────────────────────────
export const getTrends = () => API.get('/trends')

// ─── Pipeline ───────────────────────────────────────────
export const createPipeline = (data) => API.post('/pipeline/create', data)
export const runPipeline = (data) => API.post('/pipeline/run', data)
export const getPipelineOptions = () => API.get('/pipeline/options')
export const getActivePipelines = () => API.get('/pipeline/active')

// ─── YouTube Integration ────────────────────────────────
export const getYouTubeAuthUrl = () => API.get('/youtube/auth-url')
export const getYouTubeAuthStatus = () => API.get('/youtube/status')

// ─── Assets ─────────────────────────────────────────────
export const getAssets = () => API.get('/assets')
export const getAssetStats = () => API.get('/assets?stats=true')
export const deleteAsset = (filePath) => API.delete('/assets', { data: { filePath } })
export const deleteAllAssets = (type) => API.delete('/assets', { data: { type } })

// ─── Monetization ───────────────────────────────────────
export const getHighRpmNiches = () => API.get('/monetization?type=niches')
export const getEarningsEstimate = (niche, views) => API.get(`/monetization?type=earnings&niche=${niche}&views=${views}`)
export const getEarningsReport = () => API.get('/monetization?type=report')
export const getAffiliateCTA = (niche) => API.get(`/monetization?type=cta&niche=${niche}`)
export const generateStrategy = (niche) => API.post('/monetization/strategy', { niche })

// ─── Script Generation ──────────────────────────────────
export const getScriptOptions = () => API.get('/script/options')
export const generateScript = (data) => API.post('/script/generate', data)
export const getScriptLanguages = () => API.get('/script/languages')
export const getScriptConfig = () => API.get('/script/config')

// ─── Pipeline Status ────────────────────────────────────
export const getPipelineStatus = (jobId) => API.get(`/pipeline/status/${jobId}`)

// ─── Voice Generation ───────────────────────────────────
export const generateVoice = (data) => API.post('/voice/generate', data)

// ─── Visuals / Stock Footage ────────────────────────────
export const downloadVisuals = (data) => API.post('/video/download', data)

// ─── Scheduler ──────────────────────────────────────────
export const getSchedulerStatus = () => API.get('/scheduler/status')
export const toggleScheduler = () => API.post('/scheduler/toggle')
export const getSchedulerSlots = () => API.get('/scheduler/slots')

// ─── Hindi Poems ────────────────────────────────────────
export const quickGeneratePoem = (data) => API.post('/poems/quick', data)
export const getPoemList = () => API.get('/poems')
export const getPoemStatus = () => API.get('/poems/status')
export const startHindiPoemPipeline = (data) => API.post('/poems/quick', data)
export const getPipelineJobStatus = (jobId) => API.get(`/poems/status/${jobId}`)
export const getRecentPoemVideos = () => API.get('/poems/recent')
export const cancelPipelineJob = (jobId) => API.post(`/poems/cancel/${jobId}`)

export default API
