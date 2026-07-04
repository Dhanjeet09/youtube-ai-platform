/**
 * PipelineStep - Step card for workflow pipeline
 * Kinetic Glass design: vertical timeline with connector, glow on active
 * 
 * Props:
 *   stepNumber: number (1-6)
 *   label: string
 *   status: "pending" | "active" | "completed" | "error"
 *   children: optional content rendered below the step header
 *   onRetry: optional function for error state retry button
 */
export default function PipelineStep({ stepNumber, label, status, children, onRetry }) {
  const statusConfig = {
    pending: {
      icon: <span className="text-gray-500 text-sm font-semibold">{stepNumber}</span>,
      circle: 'bg-white/[0.06] text-gray-500 border border-glass-border',
      label: 'text-gray-500',
      badge: null
    },
    active: {
      icon: (
        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ),
      circle: 'gradient-primary step-active-glow',
      label: 'text-on-surface',
      badge: <span className="text-xs text-primary ml-2 status-pulse">Running...</span>
    },
    completed: {
      icon: <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>check</span>,
      circle: 'bg-tertiary text-white',
      label: 'text-tertiary',
      badge: <span className="text-xs text-tertiary ml-2">Done</span>
    },
    error: {
      icon: <span className="material-symbols-outlined text-lg" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>close</span>,
      circle: 'bg-primary-container text-white',
      label: 'text-primary-container',
      badge: <span className="text-xs text-primary-container ml-2">Failed</span>
    }
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <div className={`flex gap-4 ${stepNumber < 6 ? 'pb-8' : ''} timeline-step`}>
      {/* Step circle + connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all ${config.circle}`}>
          {config.icon}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center mb-2 flex-wrap gap-1">
          <h4 className={`text-sm font-semibold ${config.label}`}>{label}</h4>
          {config.badge}
        </div>
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1.5 bg-primary-container/20 hover:bg-primary-container/30 text-primary rounded-lg text-xs font-medium transition touch-target"
          >
            Retry Step
          </button>
        )}
        {children && (
          <div className="mt-2">{children}</div>
        )}
      </div>
    </div>
  )
}
