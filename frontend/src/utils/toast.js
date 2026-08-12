import toast from 'react-hot-toast';


/**
 * 
 * @param {string} message - Mensaje a mostrar
 */
export const toastWarning = (message) => {
  return toast(message, {
    icon: '⚠️',
    duration: 4000,
    // El tipo 'custom' permite que CustomToast lo detecte como warning
    type: 'custom',
    className: 'toast-warning',
  });
};

/**
 * Toast informativo (azul)
 * @param {string} message - Mensaje a mostrar
 */
export const toastInfo = (message) => {
  return toast(message, {
    icon: 'ℹ️',
    duration: 3500,
    type: 'custom',
    className: 'toast-info',
  });
};

// Re-exportar los métodos estándar para conveniencia
export { toast };
export const toastSuccess = toast.success;
export const toastError = toast.error;
export const toastLoading = toast.loading;
export const toastDismiss = toast.dismiss;
