import { useState } from 'react';
import { MapPin, Clock, Eye, Pencil, Trash2, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import StatusBadge from './StatusBadge';
import timeAgo from '../../utils/timeAgo';
import { FM } from '../../styles/tokens';

function isVideoMime(mime) {
  return String(mime || '').toLowerCase().startsWith('video/');
}

function ActionDot({ icon: Icon, label, onClick, color, T }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? `${color}55` : 'rgba(255,255,255,.12)',
        border: hov ? `1px solid ${color}88` : '1px solid rgba(255,255,255,.22)',
        backdropFilter: 'blur(10px) saturate(160%)',
        color: '#fff',
        transition: 'all .18s ease',
      }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

// Tarjeta de pantalla
export default function ScreenCard({ screen: s, thumbnail, onView, onEdit, onDelete, delay = 0, showActions = false, showCompany = false }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  const sc = s.status === 'online' ? T.green : T.red;
  const companyName = s.Venue?.Company?.name;

  return (
    <div
      className="enter card card-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, borderRadius: 14,
        border: `1px solid ${hov ? sc + '44' : T.border}`, padding: 16, cursor: 'pointer',
        animationDelay: `${delay}ms`,
        boxShadow: hov ? `0 0 0 1px ${sc}40, 0 0 28px ${sc}24, 0 12px 32px -8px ${sc}18` : T.cardShadow,
        transform: hov ? 'translateY(-3px) scale(1.015)' : 'translateY(0) scale(1)',
        transition: 'all .22s cubic-bezier(.22,1,.36,1)', display: 'flex', flexDirection: 'column',
      }}
      onClick={() => onView(s)}
    >
      {/* Thumbnail */}
      <div
        style={{
          aspectRatio: '16/9', borderRadius: 9, background: `linear-gradient(145deg,${sc}10,${sc}06)`,
          border: `1px solid ${sc}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 11, position: 'relative', overflow: 'hidden', flexShrink: 0,
          boxShadow: hov ? `inset 0 0 20px ${sc}14` : 'none', transition: 'box-shadow .22s ease',
        }}
      >
        {thumbnail?.url && s.status === 'online' ? (
          isVideoMime(thumbnail.mime_type) ? (
            <video src={thumbnail.url} className="h-full w-full object-cover" muted preload="metadata" playsInline />
          ) : (
            <img src={thumbnail.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <Monitor size={30} color={sc} strokeWidth={1.2} style={{ opacity: hov ? 1 : 0.6, transition: 'opacity .2s ease' }} />
        )}
        <span
          style={{
            position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: '50%', background: sc,
            boxShadow: `0 0 7px ${sc}`, animation: s.status === 'online' ? 'pulse 2s ease-in-out infinite' : 'blink 2.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Name */}
      <div style={{ fontSize: 14.5, fontWeight: 700, color: hov ? sc : T.text, transition: 'color .2s ease', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {s.name}
      </div>
      {showCompany && companyName && (
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, marginBottom: 3 }}>{companyName}</div>
      )}
      <div style={{ fontSize: 12, color: T.textSub, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <MapPin size={10} />{s.Venue?.name || 'Sin sede'}
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <StatusBadge status={s.status} />
        <code style={{ fontSize: 11, color: T.primary, background: T.primaryDim, border: `1px solid ${T.primary}22`, borderRadius: 5, padding: '2px 7px', fontFamily: FM }}>
          {s.device_id}
        </code>
      </div>
      {showActions ? (
        <div style={{ position: 'relative', height: 26 }}>
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, color: T.textSub,
              opacity: hov ? 0 : 1, transition: 'opacity .18s ease', pointerEvents: hov ? 'none' : 'auto',
            }}
          >
            <Clock size={10} /> {timeAgo(s.last_heartbeat)}
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 6,
              opacity: hov ? 1 : 0, transition: 'opacity .18s ease', pointerEvents: hov ? 'auto' : 'none',
            }}
          >
            <ActionDot icon={Eye} label="Ver detalle" onClick={() => onView(s)} color={T.primary} T={T} />
            <ActionDot icon={Pencil} label="Editar" onClick={() => onEdit && onEdit(s)} color={T.primary} T={T} />
            <ActionDot icon={Trash2} label="Eliminar" onClick={() => onDelete && onDelete(s)} color={T.red} T={T} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: T.textSub, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Clock size={10} /> {timeAgo(s.last_heartbeat)}
        </div>
      )}
    </div>
  );
}
