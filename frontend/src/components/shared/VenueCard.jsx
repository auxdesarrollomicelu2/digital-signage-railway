import { useId, useRef, useState } from 'react';
import { Building2, MapPin, Monitor, Eye, Pencil, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { FD } from '../../styles/tokens';

const NEON = '#22e5e5';

// Tarjeta de sede
export default function VenueCard({ venue: v, empresaName, onViewScreens, onEdit, onDelete, onCoverUploaded, delay = 0 }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const coverInputId = useId();
  const color = T.primary;
  const screenCount = v.screenCount || 0;
  const hasCover = !!v.cover_url;

  function pickCover(e) {
    e.preventDefault();
    e.stopPropagation();
    fileRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      const { data } = await api.post(`/venues/${v.id}/cover`, formData);
      toast.success('Foto de sede actualizada');
      onCoverUploaded && onCoverUploaded(data.venue);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir la foto');
    } finally {
      setUploading(false);
    }
  }

  function glassBtn(extra) {
    return {
      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', backdropFilter: 'blur(10px) saturate(160%)',
      color: '#fff', cursor: 'pointer', transition: 'all .18s ease', flexShrink: 0, ...extra,
    };
  }

  return (
    <div
      className="enter"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={hasCover ? undefined : pickCover}
      style={{
        position: 'relative', aspectRatio: '4 / 3', height: '100%', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
        animationDelay: `${delay}ms`, background: '#0a0d12',
        boxShadow: hov
          ? `0 20px 44px -14px rgba(0,0,0,.6), 0 0 0 1px ${NEON}80, 0 0 22px 2px ${NEON}55, 0 0 44px 8px ${NEON}25`
          : '0 8px 22px -10px rgba(0,0,0,.45)',
        transition: 'box-shadow .35s ease',
      }}
    >
      {/* Fotografía — protagonista, toda la card es la imagen */}
      {hasCover ? (
        <img
          src={v.cover_url}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'transform .5s cubic-bezier(.22,1,.36,1)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(120% 100% at 50% 0%, ${color}28, transparent 60%), linear-gradient(180deg, #171c26, #0a0d12)`,
            transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'transform .5s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {uploading ? <Loader2 size={26} color="rgba(255,255,255,.5)" className="animate-spin" /> : <Building2 size={28} strokeWidth={1.1} color="rgba(255,255,255,.38)" />}
        </div>
      )}

      {/* Degradado — legibilidad, la foto sigue siendo protagonista */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,.22) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,.62) 82%, rgba(0,0,0,.94) 100%)',
        }}
      />

      {/* Empresa — badge discreto, solo texto, sin caja */}
      {empresaName && (
        <span
          style={{
            position: 'absolute', top: 14, left: 16, fontSize: 10.5, fontWeight: 700, color: '#fff',
            letterSpacing: '.03em', textShadow: '0 1px 6px rgba(0,0,0,.6)', opacity: 0.85,
          }}
        >
          {empresaName}
        </span>
      )}

      {/* Widget flotante de pantallas — visible en reposo, cede el lugar a los controles al hover */}
      <div
        style={{
          position: 'absolute', top: 12, right: 12,
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 7px',
          borderRadius: 99, background: 'rgba(10,13,18,.55)', backdropFilter: 'blur(10px) saturate(160%)',
          border: `1px solid ${color}44`, boxShadow: '0 4px 14px -6px rgba(0,0,0,.5)',
          opacity: hov ? 0 : 1, transform: hov ? 'translateY(-4px) scale(.94)' : 'translateY(0) scale(1)',
          transition: 'opacity .2s ease, transform .2s ease', pointerEvents: 'none',
        }}
      >
        <span style={{ width: 17, height: 17, borderRadius: '50%', background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          <Monitor size={9} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: FD, whiteSpace: 'nowrap' }}>
          {screenCount} pantalla{screenCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Controles — únicamente sobre la imagen, solo visibles al hover */}
      <div
        style={{
          position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6,
          opacity: hov ? 1 : 0, transform: hov ? 'translateY(0)' : 'translateY(-4px)', transition: 'opacity .2s ease, transform .2s ease',
        }}
      >
        <button type="button" title="Ver pantallas" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewScreens(); }} style={glassBtn({})}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${color}55`; e.currentTarget.style.borderColor = `${color}88`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'; }}>
          <Eye size={13} />
        </button>
        {/* <label htmlFor=...> es el mecanismo nativo del navegador para
            abrir el selector de archivos — a diferencia de disparar
            ref.click() desde un botón, no depende de gestos de usuario
            "sintéticos" y funciona siempre. */}
        <label
          htmlFor={coverInputId}
          title="Cambiar foto"
          onClick={(e) => e.stopPropagation()}
          style={glassBtn({})}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.85)'; e.currentTarget.style.color = '#0a0d12'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff'; }}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
        </label>
        <button type="button" title="Editar sede" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} style={glassBtn({})}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.blue}55`; e.currentTarget.style.borderColor = `${T.blue}88`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'; }}>
          <Pencil size={13} />
        </button>
        <button type="button" title="Eliminar sede" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} style={glassBtn({})}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.red}55`; e.currentTarget.style.borderColor = `${T.red}88`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'; }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* "display:none" puede hacer que algunos navegadores ignoren el
          .click() programático del input; oculto visualmente pero presente
          en el layout es el patrón confiable para disparar el selector de
          archivos desde un botón propio. */}
      <input
        ref={fileRef}
        id={coverInputId}
        type="file"
        accept="image/*"
        onClick={(e) => e.stopPropagation()}
        onChange={handleFileChange}
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
      />

      {/* Contenido flotante — mínimo: nombre, dirección, pantallas */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontSize: 16.5, fontWeight: 700, color: '#fff', fontFamily: FD, letterSpacing: '-.01em', lineHeight: 1.2,
            textShadow: '0 2px 10px rgba(0,0,0,.55)', overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {v.name}
        </div>
        {v.address && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.72)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <MapPin size={10} style={{ flexShrink: 0 }} /> {v.address}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'rgba(255,255,255,.68)', marginTop: 1 }}>
          <Monitor size={11} /> {screenCount}
        </div>
      </div>
    </div>
  );
}
