/**
 * StatCard - Glass card for displaying a metric
 * Kinetic Glass design: refined glassmorphism with accent top bar
 * 
 * Props:
 *   icon: string (emoji) or JSX element
 *   label: string - metric name
 *   value: string|number - metric value
 *   trend: optional { direction: "up"|"down", value: string }
 *   loading: boolean - shows skeleton when true
 *   color: optional string for top accent bar color
 */
export default function StatCard({ icon, label, value, trend, loading = false, color }) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${color || 'gradient'}`}></div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 skeleton rounded-xl flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 skeleton rounded w-20"></div>
            <div className="h-7 skeleton rounded w-16"></div>
          </div>
        </div>
        <div className="h-3 skeleton rounded w-24"></div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden card-hover group">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${color || 'gradient'}`}></div>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 bg-white/[0.06] rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-white/[0.1] transition-colors">
          {typeof icon === 'string' ? icon : icon}
        </div>
        <div className="min-w-0">
          <div className="text-label-caps text-gray-500 uppercase tracking-wider truncate">{label}</div>
          <div className="text-[22px] font-bold truncate mt-0.5">{value ?? '—'}</div>
        </div>
      </div>
      {trend && (
        <div className={`text-body-sm flex items-center gap-1 ${
          trend.direction === 'up' ? 'text-tertiary' : 'text-primary-container'
        }`}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}
