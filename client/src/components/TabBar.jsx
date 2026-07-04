/**
 * TabBar - Horizontal tab bar with active indicator
 * Kinetic Glass design: glass container with gradient active state
 * 
 * Props:
 *   tabs: array of { id, label, icon? }
 *   activeTab: string (current active tab id)
 *   onChange: function(tabId)
 *   className: optional additional classes
 */
export default function TabBar({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-1.5 mb-6 flex gap-1 overflow-x-auto ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-2.5 rounded-xl transition-all text-body-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap touch-target ${
            activeTab === tab.id
              ? 'gradient-primary text-white shadow-glow-red'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          {tab.icon && <span className="flex-shrink-0 text-base">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
