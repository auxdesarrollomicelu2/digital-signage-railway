import { useState, useRef } from 'react';
import { Building2, Eye, Pencil, Power, Trash2, Camera, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FD, FM } from '../../styles/tokens';

const ROLE_LABEL = { super_admin: 'Super Admin', owner: 'Owner' };

function DataLine({ label, value, T }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {label && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}: </span>}
      {value}
    </div>
  );
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
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? `${color}55` : 'rgba(255,255,255,.12)',
        border: hov ? `1px solid ${color}88` : '1px solid rgba(255,255,255,.22)',
        backdropFilter: 'blur(10px) saturate(160%)',
        color: '#fff',
        transition: 'all .18s ease',
      }}
    >
      <Icon size={14} strokeWidth={2} />
    </button>
  );
}

// Tarjeta de empresa: identidad y estado de un vistazo, con foto de fondo revelada al hacer hover
export default function CompanyCard({ company, onView, onEdit, onToggleActive, onDelete, onUploadCover, onRemoveCover, delay = 0, sheenActive = false }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  const coverInputRef = useRef(null);
  const color = T.primary;
  const canDelete = company.role !== 'super_admin';
  const nit = company.document ? `${company.document_type || 'NIT'}: ${company.document}` : null;
  const hasCover = !!company.cover_url;

  function handleCoverChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onUploadCover) onUploadCover(company, file);
  }

  return (
    <div
      className="enter card card-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !hasCover && coverInputRef.current?.click()}
      title={hasCover ? undefined : 'Agregar imagen de fondo'}
      style={{
        position: 'relative', overflow: 'hidden', cursor: hasCover ? 'default' : 'pointer',
        animationDelay: `${delay}ms`, minHeight: 188, padding: 20,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: `linear-gradient(155deg, ${T.surfaceHigh}, ${T.bg})`,
        borderColor: hov ? `${color}55` : T.border,
        boxShadow: hov
          ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px -14px ${color}33, ${T.cardShadowHover}`
          : `0 1px 0 rgba(255,255,255,0.04) inset, ${T.cardShadow}`,
      }}
    >
      {hasCover && (
        <>
          {/* Oculta en reposo tras el overlay oscuro; hover = fade-in + zoom leve.
              Dos capas para que cualquier proporción (cuadrada, vertical, panorámica)
              se vea completa y centrada, sin recortes raros: un relleno ambiental
              desenfocado (cover) detrás, y la foto entera (contain) encima. */}
          <div
            style={{
              position: 'absolute', inset: 0, overflow: 'hidden',
              opacity: hov ? 1 : 0, transform: hov ? 'scale(1.045)' : 'scale(1)',
              transition: 'opacity .55s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1)',
              willChange: 'transform, opacity',
            }}
          >
            <img
              src={company.cover_url}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
                pointerEvents: 'none', filter: 'blur(22px) saturate(115%)', transform: 'scale(1.2)', opacity: 0.65,
              }}
            />
            <img
              src={company.cover_url}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center',
                pointerEvents: 'none',
              }}
            />
          </div>
          {/* En reposo: exactamente el mismo fondo oscuro que una card sin imagen — nada delata que hay una foto debajo */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(155deg, ${T.surfaceHigh}, ${T.bg})`,
              opacity: hov ? 0 : 1,
              transition: 'opacity .5s cubic-bezier(.22,1,.36,1)',
              pointerEvents: 'none',
            }}
          />
          {/* Al revelar la foto en hover, un velo oscuro leve mantiene legible el texto encima */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(155deg, rgba(6,8,12,.72), rgba(6,8,12,.58))',
              opacity: hov ? 1 : 0,
              transition: 'opacity .55s cubic-bezier(.22,1,.36,1)',
              pointerEvents: 'none',
            }}
          />
          {sheenActive && <div className="card-sheen-bar" />}

          {/* Cambiar / quitar imagen — solo visibles al hacer hover */}
          <div
            style={{
              position: 'absolute', top: 14, right: 32, zIndex: 2, display: 'flex', gap: 6,
              opacity: hov ? 1 : 0, transform: hov ? 'translateY(0)' : 'translateY(-4px)',
              transition: 'opacity .25s ease, transform .25s ease',
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
              title="Cambiar imagen de fondo"
              style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(4px)', color: '#fff',
              }}
            >
              <Camera size={12} strokeWidth={1.8} />
            </button>
            {onRemoveCover && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemoveCover(company); }}
                title="Quitar imagen de fondo"
                style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(4px)', color: '#fff',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.red}cc`; e.currentTarget.style.borderColor = T.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.16)'; }}
              >
                <X size={13} strokeWidth={2} />
              </button>
            )}
          </div>
        </>
      )}

      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />

      {/* Fila superior — identidad + estado */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
            background: `${color}26`, border: `1px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {company.logo_url ? (
              <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Building2 size={13} strokeWidth={1.8} color={color} />
            )}
          </div>
          <span style={{
            fontSize: 15.5, fontWeight: 800, color: '#fff', fontFamily: FD, letterSpacing: '-.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textShadow: hasCover ? '0 1px 8px rgba(0,0,0,.85)' : '0 1px 3px rgba(0,0,0,.4)',
          }}>
            {company.name}
          </span>
        </div>

        <span
          title={company.active ? 'Activa' : 'Inactiva'}
          style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 5,
            background: company.active ? T.green : T.red,
            boxShadow: `0 0 0 3px ${hasCover ? 'rgba(255,255,255,.14)' : (company.active ? T.greenDim : T.redDim)}, 0 0 10px 1px ${company.active ? T.green : T.red}90`,
          }}
        />
      </div>

      {/* Fila inferior — datos + acciones */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, fontFamily: FM,
            transform: hov ? 'translateX(-10px)' : 'translateX(0)',
            transition: 'transform .22s ease',
          }}
        >
          <DataLine value={nit} T={T} />
          <DataLine label="Usuario" value={company.username} T={T} />
          <DataLine label="email" value={company.email} T={T} />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 4, fontFamily: FD }}>
            {ROLE_LABEL[company.role] || company.role}
          </div>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: hov ? 8 : 0, flexShrink: 0,
            width: hov ? 'auto' : 0, overflow: 'hidden',
            opacity: hov ? 1 : 0, transform: hov ? 'translateX(0)' : 'translateX(8px)',
            pointerEvents: hov ? 'auto' : 'none',
            transition: 'opacity .22s ease, transform .22s ease, width .22s ease, gap .22s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ActionDot icon={Eye} label="Ver detalle" onClick={onView} color={color} T={T} />
          <ActionDot icon={Pencil} label="Editar" onClick={onEdit} color={T.blue} T={T} />
          <ActionDot
            icon={Power}
            label={company.active ? 'Desactivar' : 'Activar'}
            onClick={onToggleActive}
            color={company.active ? T.textSub : T.green}
            T={T}
          />
          {canDelete && <ActionDot icon={Trash2} label="Eliminar" onClick={onDelete} color={T.red} T={T} />}
        </div>
      </div>
    </div>
  );
}
