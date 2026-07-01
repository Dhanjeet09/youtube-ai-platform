/**
 * StatusBadge - Small colored pill for status or grade
 * 
 * Props:
 *   status: "success" | "warning" | "error" | "info" | "pending"
 *   grade: "A" | "B" | "C" | "D" | "F" (if provided, maps to colors)
 *   children: optional text override (defaults to status or grade value)
 * 
 * If grade prop is provided, mapping:
 *   A → green, B → blue, C → yellow, D → orange, F → red
 * 
 * This replaces the triplicated getGradeClass() function.
 */
export default function StatusBadge({ status, grade, children }) {
  // Grade-based styling (overrides status)
  if (grade) {
    const gradeMap = {
      A: 'bg-green-500/20 text-green-400 border-green-500/30',
      B: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      F: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${gradeMap[grade] || gradeMap.F}`}>
        {children || grade}
      </span>
    )
  }

  // Status-based styling
  const statusMap = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusMap[status] || statusMap.pending}`}>
      {children || status}
    </span>
  )
}
