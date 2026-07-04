/**
 * StatusBadge - Small colored pill for status or grade
 * Kinetic Glass design: refined colors matching the design system
 * 
 * Props:
 *   status: "success" | "warning" | "error" | "info" | "pending"
 *   grade: "A" | "B" | "C" | "D" | "F" (if provided, maps to colors)
 *   children: optional text override
 */
export default function StatusBadge({ status, grade, children }) {
  if (grade) {
    const gradeMap = {
      A: 'bg-tertiary/20 text-tertiary border-tertiary/30',
      B: 'bg-secondary/20 text-secondary border-secondary/30',
      C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      F: 'bg-primary-container/20 text-primary-container border-primary-container/30'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${gradeMap[grade] || gradeMap.F}`}>
        {children || grade}
      </span>
    )
  }

  const statusMap = {
    success: 'bg-tertiary/20 text-tertiary border-tertiary/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-primary-container/20 text-primary-container border-primary-container/30',
    info: 'bg-secondary/20 text-secondary border-secondary/30',
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusMap[status] || statusMap.pending}`}>
      {children || status}
    </span>
  )
}
