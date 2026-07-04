/**
 * PageHeader - Consistent page header with title, subtitle, and optional action
 * Kinetic Glass design: clean typography with optional action
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
        <h1 className="text-headline-lg font-semibold break-words">{title}</h1>
        {subtitle && (
          <p className="text-body-md text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="w-full sm:w-auto px-4 py-2.5 glass rounded-xl hover:bg-white/[0.08] transition flex items-center justify-center gap-2 text-body-sm touch-target"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      )}
    </div>
  )
}
