/**
 * EmptyState - Centered layout for empty/no-data views
 * Kinetic Glass design: refined empty state with Material icon
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
    <div className="glass rounded-2xl p-10 sm:p-14 text-center">
      <div className="text-5xl sm:text-6xl mb-5 opacity-30">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <h3 className="text-title-md font-semibold mb-2">{title}</h3>
      <p className="text-body-sm text-gray-400 max-w-md mx-auto mb-6 px-2">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="w-full sm:w-auto px-6 py-3 gradient-primary rounded-xl hover:opacity-90 transition font-medium text-sm touch-target"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
