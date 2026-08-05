import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Monitor, Clock, PlayCircle, ChevronRight, X } from 'lucide-react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import StatusBadge from './StatusBadge';
import Btn from './Btn';
import timeAgo from '../../utils/timeAgo';
import { FD, FM } from '../../styles/tokens';

/**
 * Modal con el listado de pantallas de una sede
 */
export default function SedeScreensModal({ sede, onClose }) {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  useLockBodyScroll(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/screens?venue_id=${sede.id}`)
      .then(({ data }) => { if (active) setScreens(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sede.id]);

  // Portal a document.body — ver Modal.jsx para la explicación completa del
  // bug de containing block que esto evita.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(14px)' }} />
      <div className="sweep" style={{ '--sc': T.primary, '--so': 0.7, position: 'relative', zIndex: 1, width: '100%', maxWidth: 680, maxHeight: '88vh', borderRadius: 20, animation: 'modalIn .3s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.primaryDim, border: `1px solid ${T.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={16} color={T.primary} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, fontFamily: FD }}>{sede.name}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  {sede.address && <><MapPin size={10} /> {sede.address} · </>}<Monitor size={10} /> {screens.length} pantalla{screens.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.redDim; e.currentTarget.style.color = T.red; e.currentTarget.style.transform = 'rotate(90deg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.textSub; e.currentTarget.style.transform = 'rotate(0deg)'; }}
            >
              <X size={13} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '44px 22px', textAlign: 'center', fontSize: 12.5, color: T.textMuted }}>Cargando pantallas…</div>
          ) : screens.length === 0 ? (
            <div style={{ padding: '44px 22px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: T.inputBg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', animation: 'float 3s ease-in-out infinite' }}>
                <Monitor size={22} color={T.textMuted} strokeWidth={1.3} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5 }}>Sin pantallas registradas</div>
              <div style={{ fontSize: 12.5, color: T.textMuted }}>Esta sede aún no tiene dispositivos asignados.</div>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
              {screens.map((s, i) => {
                const sc = s.status === 'online' ? T.green : T.red;
                return (
                  <div
                    key={s.id}
                    className="enter"
                    onClick={() => navigate(`/screens/${s.id}`)}
                    style={{ animationDelay: `${i * 40}ms`, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', transition: 'all .18s ease', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${sc}0D`; e.currentTarget.style.borderColor = `${sc}44`; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 7px ${sc}`, flexShrink: 0, animation: s.status === 'online' ? 'pulse 2s ease-in-out infinite' : 'blink 2.5s ease-in-out infinite' }} />
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${sc}14`, border: `1px solid ${sc}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Monitor size={14} color={sc} strokeWidth={1.4} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                        <code style={{ fontFamily: FM, fontSize: 10, color: T.primary }}>{s.device_id}</code>
                      </div>
                    </div>
                    {s.playing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: T.greenDim, border: `1px solid ${T.green}28`, fontSize: 11, color: T.green, flexShrink: 0 }}>
                        <PlayCircle size={10} /> {s.playing.title}
                      </div>
                    )}
                    <StatusBadge status={s.status} />
                    <span style={{ fontSize: 11, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <Clock size={9} /> {timeAgo(s.last_heartbeat)}
                    </span>
                    <ChevronRight size={13} color={T.textMuted} style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: '10px 18px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <Btn variant="ghost" size="sm" onClick={onClose} style={{ color: T.textSub }}>Cerrar</Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
