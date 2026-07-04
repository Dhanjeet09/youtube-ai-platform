import React, { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from './constants'

// Route-based code splitting — each page loads on demand
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Assets = lazy(() => import('./pages/Assets'))
const Workflow = lazy(() => import('./pages/Workflow'))
const Settings = lazy(() => import('./pages/Settings'))
const Monetization = lazy(() => import('./pages/Monetization'))
const ScriptGenerator = lazy(() => import('./pages/ScriptGenerator'))
const HindiPoems = lazy(() => import('./pages/HindiPoems'))

/**
 * MaterialIcon - Renders a Material Symbols icon via Google Fonts CDN
 */
const MaterialIcon = React.memo(({ name, className = 'text-xl', filled = false }) => (
  <span
    className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
    style={{ fontFamily: "'Material Symbols Outlined', sans-serif", fontWeight: 'normal', fontStyle: 'normal', lineHeight: '1', letterSpacing: 'normal', textTransform: 'none', display: 'inline-block', whiteSpace: 'nowrap', wordWrap: 'normal', direction: 'ltr', fontFeatureSettings: 'liga', WebkitFontSmoothing: 'antialiased' }}
  >
    {name}
  </span>
))

/**
 * NavItem - Sidebar navigation link with active state
 */
const NavItem = React.memo(({ to, icon, children, onClick }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 mb-1 touch-target ${
        isActive
          ? 'nav-active-indicator bg-white/[0.08] text-on-surface'
          : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
      }`}
    >
      <MaterialIcon
        name={icon}
        className={`text-[22px] ${isActive ? 'text-primary-container' : ''}`}
        filled={isActive}
      />
      <span className="text-[14px] font-medium">{children}</span>
    </Link>
  )
})

/**
 * NotFound - Catch-all 404 page
 */
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <span className="material-symbols-outlined text-[80px] text-gray-600 mb-6" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>explore_off</span>
      <h1 className="text-headline-lg font-semibold mb-2">Page Not Found</h1>
      <p className="text-body-md text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="px-6 py-3 gradient rounded-xl font-semibold hover:opacity-90 transition text-sm">
        Back to Dashboard
      </Link>
    </div>
  )
}

/**
 * TopAppBar - Glass top bar with notifications and account
 */
const TopAppBar = React.memo(() => (
  <div className="fixed top-0 left-0 right-0 z-30 lg:hidden glass-strong border-b border-glass-border">
    <div className="flex items-center justify-between px-4 h-[60px]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 gradient rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_arrow</span>
        </div>
        <span className="font-bold text-gradient text-[15px]">AutoTube</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/10 transition touch-target" aria-label="Notifications">
          <span className="material-symbols-outlined text-gray-400 text-[22px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>notifications</span>
        </button>
        <button className="p-2 rounded-lg hover:bg-white/10 transition touch-target" aria-label="Account">
          <span className="material-symbols-outlined text-gray-400 text-[22px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>account_circle</span>
        </button>
      </div>
    </div>
  </div>
))

/**
 * BottomNavBar - Mobile bottom navigation with 5 tabs
 */
const BottomNavBar = React.memo(({ onNavigate }) => {
  const location = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden glass-strong border-t border-glass-border safe-area-bottom">
      <div className="flex items-center justify-around h-[64px] px-2">
        {BOTTOM_NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <MaterialIcon
                name={item.icon}
                className="text-[22px]"
                filled={isActive}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
})

const AppContent = React.memo(() => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

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
      {/* TopAppBar (mobile) */}
      <TopAppBar />

      {/* Mobile hamburger (below top bar) */}
      <div className="fixed top-[60px] left-0 right-0 z-20 lg:hidden flex items-center p-3 border-b border-glass-border bg-surface/80 backdrop-blur-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition touch-target"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-gray-300 text-[24px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>menu</span>
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''} lg:!hidden`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[280px] glass flex flex-col border-r border-glass-border z-50
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:!fixed
        `}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>play_arrow</span>
            </div>
            <div>
              <div className="font-bold text-[15px] text-gradient">AutoTube</div>
              <div className="text-[11px] text-gray-500">AI Platform</div>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition touch-target"
            aria-label="Close navigation menu"
          >
            <span className="material-symbols-outlined text-gray-400 text-[20px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} to={item.to} icon={item.icon} onClick={closeSidebar}>
              {item.label}
            </NavItem>
          ))}
        </nav>

        {/* Scheduler Status */}
        <div className="mx-3 mb-4 p-4 rounded-xl bg-white/[0.03] border border-glass-border">
          <div className="text-label-caps text-gray-500 uppercase tracking-wider mb-2">Scheduler</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></span>
            <span className="text-body-sm text-tertiary font-medium">Active</span>
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="px-3 pb-4 border-t border-glass-border pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-[18px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>person</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">AutoTube User</div>
              <div className="text-[11px] text-gray-500 truncate">Free Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] pt-[120px] lg:pt-0 p-4 sm:p-6 lg:p-8 min-w-0 pb-[80px] lg:pb-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-white/20 border-t-primary-container rounded-full animate-spin" />
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
            <Route path="/hindi-poems" element={<HindiPoems />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {/* BottomNavBar (mobile) */}
      <BottomNavBar onNavigate={closeSidebar} />
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
