/**
 * StatCard - Glass card for displaying a metric
 * 
 * Props:
 *   icon: string (emoji) or JSX element
 *   label: string - metric name
 *   value: string|number - metric value
 *   trend: optional { direction: "up"|"down", value: string }
 *   loading: boolean - shows skeleton when true
 *   color: optional string for top accent bar color (default: gradient)
 */
export default function StatCard({ icon, label, value, trend, loading = false, color }) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 ${color || 'gradient'}`}></div>
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 skeleton rounded-xl flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 skeleton rounded w-20"></div>
            <div className="h-6 skeleton rounded w-16"></div>
          </div>
        </div>
        <div className="h-3 skeleton rounded w-24"></div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden card-hover">
      <div className={`absolute top-0 left-0 right-0 h-1 ${color || 'gradient'}`}></div>
      <div className="flex items-center gap-3 sm:gap-4 mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
          {typeof icon === 'string' ? icon : icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm text-gray-400 truncate">{label}</div>
          <div className="text-xl sm:text-2xl font-bold truncate">{value ?? '—'}</div>
        </div>
      </div>
      {trend && (
        <div className={`text-xs sm:text-sm flex items-center gap-1 ${
          trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}
