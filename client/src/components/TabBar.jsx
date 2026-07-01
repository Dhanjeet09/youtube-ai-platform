/**
 * TabBar - Horizontal tab bar with active indicator
 * 
 * Props:
 *   tabs: array of { id, label, icon? }
 *   activeTab: string (current active tab id)
 *   onChange: function(tabId)
 *   className: optional additional classes
 */
export default function TabBar({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-1.5 sm:p-2 mb-6 flex gap-1 sm:gap-2 overflow-x-auto ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap touch-target ${
            activeTab === tab.id
              ? 'gradient text-white shadow-lg shadow-red-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
