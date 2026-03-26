import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

API.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const getAnalytics = (videoId) => API.get(`/analytics?videoId=${videoId}`)

export const getBestNiche = () => API.get('/niche?type=best')
export const getNicheStats = () => API.get('/niche?type=stats')
export const getNicheHealth = () => API.get('/niche?type=health')
export const getNiches = () => API.get('/niche?type=list')
export const registerNiche = (data) => API.post('/niche', data)

export const getTrends = () => API.get('/trends')

export const createPipeline = (data) => API.post('/pipeline/create', data)
export const runPipeline = (data) => API.post('/pipeline/run', data)

export const getYouTubeAuthUrl = () => API.get('/youtube/auth-url')
export const getYouTubeAuthStatus = () => API.get('/youtube/status')
export const uploadToYouTube = (data) => API.post('/youtube/upload', data)

export const getAssets = () => API.get('/assets')
export const getAssetStats = () => API.get('/assets?stats=true')
export const deleteAsset = (filePath) => API.delete('/assets', { data: { filePath } })
export const deleteAllAssets = (type) => API.delete('/assets', { data: { type } })

export const getHighRpmNiches = () => API.get('/monetization?type=niches')
export const getEarningsEstimate = (niche, views) => API.get(`/monetization?type=earnings&niche=${niche}&views=${views}`)
export const getEarningsReport = () => API.get('/monetization?type=report')
export const getAffiliateCTA = (niche) => API.get(`/monetization?type=cta&niche=${niche}`)

export const getScriptOptions = () => API.get('/script/options')
export const generateScript = (data) => API.post('/script/generate', data)

export default API
