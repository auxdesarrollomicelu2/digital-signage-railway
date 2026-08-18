import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { T_DARK, FD } from '../../styles/tokens';

// Toast personalizado que sigue el sistema de diseño del dashboard
export default function CustomToast({ t, message, type = 'success' }) {
  const config = {
    success: {
      icon: CheckCircle,
      color: T_DARK.green,
      colorDim: T_DARK.greenDim,
      bgGradient: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(0,229,180,0.04) 50%, rgba(10,12,16,0.95) 100%)',
      borderColor: 'rgba(34,197,94,0.25)',
      glowColor: 'rgba(34,197,94,0.15)',
      label: 'Éxito',
    },
    error: {
      icon: XCircle,
      color: T_DARK.red,
      colorDim: T_DARK.redDim,
      bgGradient: 'linear-gradient(135deg, rgba(242,61,94,0.08) 0%, rgba(242,61,94,0.04) 50%, rgba(10,12,16,0.95) 100%)',
      borderColor: 'rgba(242,61,94,0.25)',
      glowColor: 'rgba(242,61,94,0.15)',
      label: 'Error',
    },
    warning: {
      icon: AlertTriangle,
      color: T_DARK.amber,
      colorDim: T_DARK.amberDim,
      bgGradient: 'linear-gradient(135deg, rgba(245,166,35,0.08) 0%, rgba(245,166,35,0.04) 50%, rgba(10,12,16,0.95) 100%)',
      borderColor: 'rgba(245,166,35,0.25)',
      glowColor: 'rgba(245,166,35,0.15)',
      label: 'Advertencia',
    },
    info: {
      icon: Info,
      color: T_DARK.blue,
      colorDim: T_DARK.blueDim,
      bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.04) 50%, rgba(10,12,16,0.95) 100%)',
      borderColor: 'rgba(59,130,246,0.25)',
      glowColor: 'rgba(59,130,246,0.15)',
      label: 'Información',
    },
  };

  const { icon: Icon, color, colorDim, bgGradient, borderColor, glowColor, label } = config[type] || config.success;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minWidth: 380,
        maxWidth: 480,
        padding: '18px 20px',
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        borderRadius: 18,
        backdropFilter: 'blur(12px) saturate(180%)',
        boxShadow: `0 0 0 1px ${borderColor}, 0 0 28px ${glowColor}, 0 10px 40px -10px rgba(0,0,0,0.6)`,
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: FD,
      }}
    >
      {/* Badge de estado con ícono */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: colorDim,
          border: `1px solid ${color}44`,
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} strokeWidth={2} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            color: T_DARK.text,
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {message}
        </div>
      </div>

      {/* Botón de cerrar */}
      <button
        onClick={() => {
          if (window.toast && window.toast.dismiss) {
            window.toast.dismiss(t.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'transparent',
          border: `1px solid ${T_DARK.border}`,
          color: T_DARK.textSub,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.borderColor = T_DARK.borderActive;
          e.currentTarget.style.color = T_DARK.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = T_DARK.border;
          e.currentTarget.style.color = T_DARK.textSub;
        }}
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
