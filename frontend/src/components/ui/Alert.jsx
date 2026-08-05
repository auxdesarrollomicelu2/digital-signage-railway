export default function Alert({ 
  type = 'error', 
  title, 
  message, 
  onClose,
  className = '' 
}) {
  const config = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      closeHoverColor: 'hover:bg-red-100',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    },
    success: {
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconBgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-800',
      messageColor: 'text-emerald-700',
      closeHoverColor: 'hover:bg-emerald-100',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    warning: {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
      messageColor: 'text-amber-700',
      closeHoverColor: 'hover:bg-amber-100',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      closeHoverColor: 'hover:bg-blue-100',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const styles = config[type] || config.error;

  return (
    <div className={`rounded-xl border-2 ${styles.borderColor} ${styles.bgColor} p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBgColor}`}>
          <div className={styles.iconColor}>
            {styles.icon}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold ${styles.titleColor}`}>
              {title}
            </h3>
          )}
          {message && (
            <p className={`text-sm ${styles.messageColor} ${title ? 'mt-1' : ''}`}>
              {message}
            </p>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg p-1.5 ${styles.iconColor} transition ${styles.closeHoverColor}`}
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
