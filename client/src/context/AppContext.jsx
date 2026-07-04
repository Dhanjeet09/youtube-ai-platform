/**
 * AppContext - Global state management with useReducer
 * 
 * State shape:
 *   pipelineStatus: { step, status, progress, logs, jobId, error } | null
 *   notifications: array of { id, type, message }
 *   assetRefreshKey: number - incremented to trigger asset refresh
 * 
 * Actions:
 *   SET_PIPELINE_STATUS
 *   CLEAR_PIPELINE_STATUS
 *   ADD_NOTIFICATION
 *   REMOVE_NOTIFICATION
 *   REFRESH_ASSETS
 */
import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)
const AppDispatchContext = createContext(null)

const initialState = {
  pipelineStatus: null,
  notifications: [],
  assetRefreshKey: 0
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_PIPELINE_STATUS':
      return { ...state, pipelineStatus: action.payload }
    case 'CLEAR_PIPELINE_STATUS':
      return { ...state, pipelineStatus: null }
    case 'ADD_NOTIFICATION': {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6)
      return {
        ...state,
        notifications: [...state.notifications, { id, ...action.payload }]
      }
    }
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    case 'REFRESH_ASSETS':
      return { ...state, assetRefreshKey: state.assetRefreshKey + 1 }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
  return ctx
}
