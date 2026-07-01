/**
 * PageHeader - Consistent page header with title, subtitle, and optional action button
 * 
 * Props:
 *   title: string
 *   subtitle: optional string
 *   action: optional { label, onClick, icon }
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold break-words">{title}</h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="w-full sm:w-auto px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      )}
    </div>
  )
}
