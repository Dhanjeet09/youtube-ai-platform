/**
 * ErrorMessage - Red/amber styled banner with optional retry and dismiss
 * 
 * Props:
 *   message: string - error text to display
 *   onRetry: optional function - shows retry button
 *   dismissible: boolean (default: false) - shows X dismiss button
 *   onDismiss: optional function - called when dismissed
 */
import { useState } from 'react'

export default function ErrorMessage({ message, onRetry, dismissible = false, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // Support both single string and array of error strings
  const messages = Array.isArray(message) ? message : [message]

  return (
    <div className="px-5 py-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-3" role="alert">
      <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
      <div className="flex-1 min-w-0">
        {messages.map((msg, i) => (
          <p key={i} className="text-red-300 text-sm leading-relaxed break-words">
            {msg}
            {i < messages.length - 1 && <br />}
          </p>
        ))}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition touch-target"
          >
            🔄 Retry
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={() => {
            setDismissed(true)
            onDismiss?.()
          }}
          className="text-red-400 hover:text-red-300 transition flex-shrink-0 touch-target"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
