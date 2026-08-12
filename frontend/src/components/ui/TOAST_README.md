# 🎨 Sistema de Toasts Personalizado

Sistema de notificaciones coherente con el diseño del dashboard.

## 📦 Uso Básico

### Importar
```javascript
import toast from 'react-hot-toast';
```

### Toast de Éxito (Verde)
```javascript
toast.success('Sede creada exitosamente');
toast.success('Archivo subido correctamente');
```

### Toast de Error (Rojo)
```javascript
toast.error('Error cargando pantallas');
toast.error('Credenciales inválidas');
```

### Toast de Advertencia (Amarillo) - OPCIONAL
```javascript
import { toastWarning } from '../../utils/toast';
toastWarning('La sesión expirará pronto');
```

### Toast Informativo (Azul) - OPCIONAL
```javascript
import { toastInfo } from '../../utils/toast';
toastInfo('Nueva versión disponible');
```

## 🎯 Características

✅ **4 variantes:** success, error, warning, info
✅ **Diseño coherente:** Sigue el sistema de VenueCard y componentes existentes
✅ **Colores del tema:** Usa los tokens de T_DARK
✅ **Animaciones suaves:** Entrada/salida con cubic-bezier
✅ **Responsive:** Se adapta al contenido
✅ **Botón de cerrar:** Esquina superior derecha
✅ **No rompe código existente:** Todos los `toast.success()` y `toast.error()` funcionan automáticamente

## 🎨 Diseño

- **Fondo:** Gradiente oscuro con tinte del color del estado
- **Badge:** Ícono outline en círculo con fondo translúcido
- **Borde:** Línea del color del estado con brillo sutil
- **Texto:** Blanco para el mensaje, color del estado para la etiqueta
- **Radio:** 16px (coherente con VenueCard)
- **Fuente:** Outfit (FD token)

## 🔧 Configuración

El sistema está configurado en `App.jsx`:
- Posición: top-right
- Duración success: 3.5s
- Duración error: 4.5s
- Renderizado: CustomToast component

## ⚠️ Importante

**NO MODIFICAR** el código de `toast.success()` y `toast.error()` existente.
El sistema funciona automáticamente con todas las llamadas actuales.
