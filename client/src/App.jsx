import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Niche from './pages/Niche'
import Assets from './pages/Assets'
import Workflow from './pages/Workflow'
import Settings from './pages/Settings'
import Monetization from './pages/Monetization'
import ScriptGenerator from './pages/ScriptGenerator'

function NavItem({ to, icon, children }) {
  const location = useLocation()
  const isActive = location.pathname === to
  
  return (
    <Link to={to} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-lg transition-all duration-300 mb-1.5 ${
      isActive 
        ? 'bg-red-500/15 text-red-500 border border-red-500/30' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}>
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-[15px]">{children}</span>
    </Link>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <nav className="w-[280px] glass fixed h-screen p-6 flex flex-col border-r border-white/10 z-50">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 gradient rounded-xl flex items-center justify-center text-xl">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gradient">AutoTube</span>
          </div>
          
          <nav className="flex-1">
            <NavItem to="/" icon="📊">Dashboard</NavItem>
            <NavItem to="/generator" icon="✨">Generator</NavItem>
            <NavItem to="/workflow" icon="⚡">Workflow</NavItem>
            <NavItem to="/assets" icon="📁">Assets</NavItem>
            <NavItem to="/analytics" icon="📈">Analytics</NavItem>
            <NavItem to="/niche" icon="🎯">Niche</NavItem>
            <NavItem to="/monetization" icon="💰">Monetization</NavItem>
            <NavItem to="/settings" icon="⚙️">Settings</NavItem>
          </nav>
          
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs text-gray-500 mb-1.5">Scheduler Status</div>
            <div className="text-sm text-accent-green flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></span>
              Active
            </div>
          </div>
        </nav>
        
        {/* Main Content */}
        <main className="flex-1 ml-[280px] p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generator" element={<ScriptGenerator />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/niche" element={<Niche />} />
            <Route path="/monetization" element={<Monetization />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
