/**
 * EmptyState - Centered layout for empty/no-data views
 * 
 * Props:
 *   icon: string (emoji) or JSX element
 *   title: string
 *   description: string
 *   actionLabel: optional string for action button
 *   onAction: optional function called when action clicked
 */
export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="glass rounded-2xl p-8 sm:p-12 text-center">
      <div className="text-4xl sm:text-6xl mb-4 opacity-40">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto mb-6 px-2">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="w-full sm:w-auto px-6 py-3 gradient rounded-xl hover:opacity-90 transition font-medium touch-target"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
