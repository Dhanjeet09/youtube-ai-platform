import React, { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'

// Route-based code splitting — each page loads on demand
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Assets = lazy(() => import('./pages/Assets'))
const Workflow = lazy(() => import('./pages/Workflow'))
const Settings = lazy(() => import('./pages/Settings'))
const Monetization = lazy(() => import('./pages/Monetization'))
const ScriptGenerator = lazy(() => import('./pages/ScriptGenerator'))

const NavItem = React.memo(({ to, icon, children, onClick }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-lg transition-all duration-300 mb-1.5 touch-target ${
        isActive
          ? 'bg-red-500/15 text-red-500 border border-red-500/30'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="text-lg w-6 text-center flex-shrink-0">{icon}</span>
      <span className="text-[15px]">{children}</span>
    </Link>
  )
})

/**
 * NotFound - Catch-all 404 page rendered for unknown routes.
 */
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="text-6xl sm:text-8xl mb-6">📭</div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Page Not Found</h1>
      <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="px-6 py-3 gradient rounded-xl font-semibold hover:opacity-90 transition">
        ← Back to Dashboard
      </Link>
    </div>
  )
}

const AppContent = React.memo(() => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false)

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen flex">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden flex items-center gap-3 p-4 glass border-b border-white/10">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition touch-target"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 gradient rounded-lg flex items-center justify-center text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <span className="font-bold text-gradient">AutoTube</span>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''} lg:!hidden`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[280px] glass flex flex-col border-r border-white/10 z-50
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:!fixed
        `}
        aria-label="Main navigation"
      >
        {/* Sidebar header with close button on mobile */}
        <div className="flex items-center justify-between mb-10 px-2 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient rounded-xl flex items-center justify-center text-xl">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gradient">AutoTube</span>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition touch-target"
            aria-label="Close navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4">
          <NavItem to="/" icon="📊" onClick={closeSidebar}>Dashboard</NavItem>
          <NavItem to="/generator" icon="✨" onClick={closeSidebar}>Generator</NavItem>
          <NavItem to="/workflow" icon="⚡" onClick={closeSidebar}>Workflow</NavItem>
          <NavItem to="/assets" icon="📁" onClick={closeSidebar}>Assets</NavItem>
          <NavItem to="/analytics" icon="📈" onClick={closeSidebar}>Analytics</NavItem>
          <NavItem to="/monetization" icon="💰" onClick={closeSidebar}>Monetization</NavItem>
          <NavItem to="/settings" icon="⚙️" onClick={closeSidebar}>Settings</NavItem>
        </nav>

        <div className="p-4 m-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-xs text-gray-500 mb-1.5">Scheduler Status</div>
          <div className="text-sm text-accent-green flex items-center gap-2">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></span>
            Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] pt-[72px] lg:pt-0 p-4 sm:p-6 lg:p-8 min-w-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generator" element={<ScriptGenerator />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/monetization" element={<Monetization />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
})

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
