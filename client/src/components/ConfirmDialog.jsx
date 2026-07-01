/**
 * ConfirmDialog - Modal overlay replacing alert()/confirm()
 * 
 * Props:
 *   open: boolean - show/hide dialog
 *   title: string
 *   message: string
 *   confirmLabel: string (default: "Confirm")
 *   cancelLabel: string (default: "Cancel")
 *   onConfirm: function
 *   onCancel: function
 *   variant: "danger" | "default" (default: "default")
 *   loading: boolean (default: false) - shows spinner on confirm button
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative glass rounded-2xl p-5 sm:p-6 max-w-md w-full border border-white/10 shadow-2xl mx-auto">
        <h3 className="text-base sm:text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-sm font-medium disabled:opacity-50 touch-target"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 touch-target ${
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'gradient hover:opacity-90 text-white'
            }`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
