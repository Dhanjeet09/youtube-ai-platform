/**
 * ErrorMessage - Red styled banner with optional retry and dismiss
 * Props: message, onRetry, dismissible, onDismiss
 */
import { useState } from 'react'

export default function ErrorMessage({ message, onRetry, dismissible = false, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const messages = Array.isArray(message) ? message : [message]

  return (
    <div className="px-5 py-4 bg-primary-container/15 border border-primary-container/30 rounded-2xl flex items-start gap-3" role="alert">
      <span className="material-symbols-outlined text-primary-container flex-shrink-0 mt-0.5" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>warning</span>
      <div className="flex-1 min-w-0">
        {messages.map((msg, i) => (
          <p key={i} className="text-primary text-sm leading-relaxed break-words">
            {msg}
            {i < messages.length - 1 && <br />}
          </p>
        ))}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-1.5 bg-primary-container/20 hover:bg-primary-container/30 text-primary rounded-lg text-sm font-medium transition touch-target"
          >
            Retry
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={() => {
            setDismissed(true)
            onDismiss?.()
          }}
          className="text-primary-container hover:text-primary transition flex-shrink-0 touch-target"
          aria-label="Dismiss error"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontFamily: "'Material Symbols Outlined', sans-serif" }}>close</span>
        </button>
      )}
    </div>
  )
}
