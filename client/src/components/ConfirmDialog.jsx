/**
 * ConfirmDialog - Modal overlay replacing alert()/confirm()
 * Kinetic Glass design
 * 
 * Props: open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant, loading
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative glass rounded-2xl p-6 max-w-md w-full border border-glass-border shadow-2xl mx-auto animate-fade-in">
        <h3 className="text-title-md font-semibold mb-2">{title}</h3>
        <p className="text-body-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-none px-5 py-2.5 glass rounded-xl hover:bg-white/[0.08] transition text-body-sm font-medium disabled:opacity-50 touch-target"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl transition text-body-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 touch-target ${
              variant === 'danger'
                ? 'bg-primary-container hover:bg-primary-dark text-white'
                : 'gradient-primary hover:opacity-90 text-white'
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
