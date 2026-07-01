/**
 * PipelineStep - Step card for workflow pipeline
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
      icon: <span className="text-gray-500">{stepNumber}</span>,
      circle: 'bg-white/5 text-gray-500 border border-white/10',
      label: 'text-gray-500',
      badge: null
    },
    active: {
      icon: (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ),
      circle: 'gradient animate-pulse shadow-lg shadow-red-500/30',
      label: 'text-white',
      badge: <span className="text-xs text-red-400 ml-2 status-pulse">Running...</span>
    },
    completed: {
      icon: '✓',
      circle: 'bg-green-500 text-black',
      label: 'text-green-400',
      badge: <span className="text-xs text-green-400 ml-2">Done</span>
    },
    error: {
      icon: '✗',
      circle: 'bg-red-500 text-white',
      label: 'text-red-400',
      badge: <span className="text-xs text-red-400 ml-2">Failed</span>
    }
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <div className="flex gap-3 sm:gap-4">
      {/* Step connector line + number */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold transition-all flex-shrink-0 ${config.circle}`}>
          {config.icon}
        </div>
        {stepNumber < 6 && (
          <div className="step-connector" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-6 sm:pb-8 min-w-0">
        <div className="flex items-center mb-2 flex-wrap gap-1">
          <h4 className={`text-xs sm:text-sm font-semibold ${config.label}`}>{label}</h4>
          {config.badge}
        </div>
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition touch-target"
          >
            🔄 Retry Step
          </button>
        )}
        {children && (
          <div className="mt-2">{children}</div>
        )}
      </div>
    </div>
  )
}
