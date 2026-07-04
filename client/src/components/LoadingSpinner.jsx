/**
 * LoadingSpinner - Reusable loading indicator
 * Props: size, message, centered
 */
export default function LoadingSpinner({ size = 'md', message, centered = true }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-4'
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-full border-white/10 border-t-primary-container animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-body-sm text-gray-400">{message}</p>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    )
  }

  return spinner
}
