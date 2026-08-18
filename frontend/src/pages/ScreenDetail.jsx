import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Globe, Copy, RotateCw, ListMusic, Image as ImageIcon, Video,
  PlayCircle, GripVertical, ChevronUp, ChevronDown, Trash2, X, ExternalLink, Zap,
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/shared/StatusBadge';
import Btn from '../components/shared/Btn';
import timeAgo from '../utils/timeAgo';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { FD, FM } from '../styles/tokens';

function isVideoMedia(item) {
  const mime = String(item?.mime_type || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  const url = String(item?.url || '').toLowerCase();
  return /\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv|mpeg|mpg|wmv|3gp|flv|ts)(\?|$)/i.test(url);
}

function playlistQueueSubtitle(length) {
  if (length === 0) return 'Aún no hay contenido asignado';
  if (length === 1) return '1 elemento en cola';
  return `${length} elementos en cola`;
}

// Con alias explícito `as: 'ScreenMedia'`, Sequelize devuelve exactamente esa clave
function getScreenMediaRows(data) {
  if (!data || typeof data !== 'object') return [];
  const rows = data.ScreenMedia ?? data.ScreenMedias ?? data.screenMedia ?? data.screenMedias;
  if (Array.isArray(rows)) return rows;
  return [];
}

export default function ScreenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { T } = useTheme();
  const [screen, setScreen] = useState(null);
  const [allMedia, setAllMedia] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  useLockBodyScroll(showMediaPicker);
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [pickerUploading, setPickerUploading] = useState(false);
  const [pickerDragActive, setPickerDragActive] = useState(false);
  const [playlistDragSource, setPlaylistDragSource] = useState(null);
  const [playlistDragOver, setPlaylistDragOver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Evita que el polling borre la playlist antes de guardar
  const playlistDirtyRef = useRef(false);
  const pickerFileInputRef = useRef(null);

  useEffect(() => {
    playlistDirtyRef.current = false;
    loadScreen({ initial: true });
    loadAllMedia();
    const interval = setInterval(() => loadScreen({ initial: false }), 10000);
    return () => clearInterval(interval);
  }, [id]);

  function markPlaylistDirty() {
    playlistDirtyRef.current = true;
  }

  async function loadScreen(opts = {}) {
    const { initial = false } = opts;
    try {
      const { data } = await api.get(`/screens/${id}`);
      const mediaRows = getScreenMediaRows(data);
      setScreen(data);
      if (playlistDirtyRef.current && !initial) return;
      if (mediaRows.length > 0) {
        const next = mediaRows
          .filter((sm) => sm.Media != null)
          .map((sm) => ({
            media_id: sm.Media.id,
            url: sm.Media.url,
            original_name: sm.Media.original_name,
            mime_type: sm.Media.mime_type,
            duration: sm.duration,
            position: sm.position,
          }));
        setPlaylist(next);
      } else {
        setPlaylist([]);
      }
    } catch (err) {
      console.error('[ScreenDetail] Error cargando pantalla:', err);
      toast.error(err.response?.data?.error || 'Error cargando pantalla');
    } finally {
      if (initial) setLoading(false);
    }
  }

  async function loadAllMedia() {
    try {
      const { data } = await api.get('/media');
      setAllMedia(data);
    } catch {
      /* ignore */
    }
  }

  async function uploadPickerFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    setPickerUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append('files', f));
      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newIds = Array.isArray(data) ? data.map((m) => m.id).filter(Boolean) : [];
      toast.success(`${fileList.length} archivo(s) subido(s)`);
      await loadAllMedia();
      if (newIds.length === 0) return;
      setSelectedMediaIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((nid) => next.add(nid));
        return Array.from(next);
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error subiendo archivos');
    } finally {
      setPickerUploading(false);
      if (pickerFileInputRef.current) pickerFileInputRef.current.value = '';
    }
  }

  function handlePickerDrop(e) {
    e.preventDefault();
    setPickerDragActive(false);
    uploadPickerFiles(e.dataTransfer.files);
  }

  function toggleMediaSelection(mediaId) {
    setSelectedMediaIds((prev) => (
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    ));
  }

  function addSelectedToPlaylist() {
    if (selectedMediaIds.length === 0) {
      toast.error('Selecciona al menos un archivo');
      return;
    }
    const existing = new Set(playlist.map((p) => p.media_id));
    const toAdd = allMedia.filter((m) => selectedMediaIds.includes(m.id) && !existing.has(m.id));
    if (toAdd.length === 0) {
      toast.error('Los elementos seleccionados ya están en la playlist');
      return;
    }
    markPlaylistDirty();
    const basePosition = playlist.length;
    const appended = toAdd.map((media, idx) => ({
      media_id: media.id,
      url: media.url,
      original_name: media.original_name,
      mime_type: media.mime_type,
      duration: 10,
      position: basePosition + idx,
    }));
    setPlaylist([...playlist, ...appended]);
    setSelectedMediaIds([]);
    setShowMediaPicker(false);
    toast.success(`${toAdd.length} item(s) agregado(s)`);
  }

  function removeFromPlaylist(index) {
    markPlaylistDirty();
    setPlaylist(playlist.filter((_, i) => i !== index));
  }

  function updateDuration(index, duration) {
    markPlaylistDirty();
    const updated = [...playlist];
    updated[index] = { ...updated[index], duration: Number.parseInt(duration, 10) || 10 };
    setPlaylist(updated);
  }

  function moveItem(index, direction) {
    markPlaylistDirty();
    const updated = [...playlist];
    const target = index + direction;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setPlaylist(updated.map((item, i) => ({ ...item, position: i })));
  }

  function reorderPlaylistDrop(from, to) {
    if (from === to) return;
    markPlaylistDirty();
    setPlaylist((prev) => {
      const item = prev[from];
      const next = prev.filter((_, i) => i !== from);
      next.splice(to, 0, item);
      return next.map((it, i) => ({ ...it, position: i }));
    });
  }

  function handlePlaylistDragStart(index, e) {
    setPlaylistDragSource(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handlePlaylistDragEnd() {
    setPlaylistDragSource(null);
    setPlaylistDragOver(null);
  }

  function handlePlaylistRowDragOver(index, e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setPlaylistDragOver(index);
  }

  function handlePlaylistRowDrop(toIndex, e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const from = raw === '' ? playlistDragSource : Number.parseInt(raw, 10);
    if (from == null || Number.isNaN(from)) {
      handlePlaylistDragEnd();
      return;
    }
    reorderPlaylistDrop(from, toIndex);
    handlePlaylistDragEnd();
  }

  async function savePlaylist() {
    const items = playlist.map((p, i) => ({ media_id: p.media_id, duration: p.duration, position: i }));
    const invalid = items.filter((it) => it.media_id == null || Number.isNaN(Number(it.media_id)));
    if (invalid.length > 0) {
      toast.error('Hay ítems sin ID de media. Quita y vuelve a agregar.');
      return;
    }
    try {
      await api.post(`/screens/${id}/playlist`, { items });
      playlistDirtyRef.current = false;
      toast.success('Playlist guardada y enviada al dispositivo');
      await loadScreen({ initial: false });
    } catch (err) {
      console.error('[ScreenDetail] Error guardando playlist:', err);
      const msg = err.response?.data?.error || err.message || 'Error guardando playlist';
      toast.error(typeof msg === 'string' ? msg : 'Error guardando playlist');
    }
  }

  async function sendCommand(type) {
    try {
      await api.post(`/screens/${id}/command`, { type });
      toast.success(`Comando "${type}" enviado`);
    } catch (err) {
      console.error('[ScreenDetail] Error comando:', err.response?.data || err);
      toast.error('Error enviando comando');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;
  }

  if (!screen) {
    return <div className="text-center py-12"><p className="text-gray-500">Pantalla no encontrada</p></div>;
  }

  // Construir la URL del player dinámicamente
  const getPlayerUrl = () => {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    
    if (isLocalhost) {
      // Desarrollo local: usar localhost con puerto 5174
      return `http://localhost:5174/?device=${screen.device_id}`;
    } else {
      // Producción Railway: usar dominio específico del player con HTTPS
      // Detectar si estamos en Railway (frontend-production) y usar player-production
      const playerHost = host.replace('frontend-production', 'player-production');
      return `https://${playerHost}/?device=${screen.device_id}`;
    }
  };

  const playerUrl = getPlayerUrl();

  async function copyPlayerUrl() {
    try {
      await navigator.clipboard.writeText(playerUrl);
      toast.success('URL copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar la URL');
    }
  }

  async function openPlayerInNewTab() {
    try {
      window.open(playerUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('No se pudo abrir el player');
    }
  }

  const online = screen.status === 'online';
  const sc = online ? T.green : T.red;
  const nowPlaying = online ? playlist[0] : null;

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Botón de regreso notorio + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Btn variant="secondary" onClick={() => navigate('/screens')} style={{ gap: 6 }}>
          <ArrowLeft size={15} /> Volver a pantallas
        </Btn>
        <span style={{ color: T.textSub, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{screen.name}</span>
        <StatusBadge status={screen.status} />
      </div>

      {/* Hero */}
      <div className="sweep card" style={{ '--sc': sc, '--so': 0.8, padding: '34px 38px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle,${sc}14 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-.03em', fontFamily: FD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {screen.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: T.textSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={12} /> {screen.Venue?.name || 'Sin sede'}
                </span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.textSub, display: 'inline-block' }} />
                <code style={{ fontSize: 12, color: T.primary, background: T.primaryDim, padding: '3px 8px', borderRadius: 6, fontFamily: FM }}>
                  {screen.device_id}
                </code>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => { setReloading(true); setTimeout(() => setReloading(false), 2000); sendCommand('reload'); }}
            >
              <RotateCw size={13} style={{ animation: reloading ? 'spin 1s linear infinite' : 'none' }} /> Recargar
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => sendCommand('refresh')}>
              <ListMusic size={13} /> Actualizar playlist
            </Btn>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
          {[
            ['Última actividad', timeAgo(screen.last_heartbeat)],
            ['Orientación', screen.orientation === 'portrait' ? 'Vertical' : 'Horizontal'],
            ['Playlist', `${playlist.length} elemento${playlist.length !== 1 ? 's' : ''}`],
          ].map(([l, v]) => (
            <div key={l} style={{ flex: '1 1 150px', padding: '13px 16px', borderRadius: 13, background: T.inputBg, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Reproduciendo ahora */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
              Reproduciendo ahora
            </div>
            {nowPlaying ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: T.greenDim, border: `1px solid ${T.green}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'pulse 2.5s ease-in-out infinite' }}>
                  {isVideoMedia(nowPlaying) ? <Video size={17} color={T.green} /> : <ImageIcon size={17} color={T.green} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.original_name}</div>
                  <div style={{ fontSize: 11, color: T.green, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <PlayCircle size={10} /> {isVideoMedia(nowPlaying) ? 'Video' : 'Imagen'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.textSub, fontSize: 12.5 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: T.inputBg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={14} color={T.textSub} />
                </div>
                Sin contenido activo
              </div>
            )}
          </div>

          {/* URL del Player — Abrir player + Copiar (sin cambios de comportamiento) */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Globe size={10} /> URL del Player
            </div>
            <div style={{ background: T.inputBg, border: `1px solid ${copied ? T.green : T.border}`, borderRadius: 9, padding: '9px 12px', marginBottom: 9, transition: 'border-color .3s ease' }}>
              <code style={{ fontSize: 11, color: T.textSub, fontFamily: FM, wordBreak: 'break-all', lineHeight: 1.5 }}>{playerUrl}</code>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" onClick={openPlayerInNewTab} style={{ flex: 1, padding: '9px' }}>
                <ExternalLink size={12} /> Abrir player
              </Btn>
              <Btn variant="secondary" accentColor={copied ? T.green : undefined} onClick={copyPlayerUrl} style={{ flex: 1, padding: '9px' }}>
                <Copy size={12} /> {copied ? '¡Copiada!' : 'Copiar'}
              </Btn>
            </div>
          </div>

          {/* Información del dispositivo */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
              Información del dispositivo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Nombre', screen.name],
                ['Sede', screen.Venue?.name || '—'],
                ['Device ID', screen.device_id, true],
                ['Orientación', screen.orientation === 'portrait' ? 'Vertical' : 'Horizontal'],
              ].map(([l, v, mono]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, color: T.textSub, flexShrink: 0 }}>{l}</span>
                  <span style={{
                    fontSize: 12.5, fontWeight: 600, color: mono ? T.primary : T.text,
                    fontFamily: mono ? FM : 'inherit', background: mono ? T.primaryDim : 'transparent',
                    padding: mono ? '1px 7px' : 0, borderRadius: mono ? 5 : 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Playlist */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.primary, fontFamily: FD }}>Playlist</div>
              <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{playlistQueueSubtitle(playlist.length)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" size="sm" onClick={() => setShowMediaPicker(true)}>
                <ImageIcon size={12} /> Agregar media
              </Btn>
              <Btn variant="primary" accentColor={T.green} size="sm" onClick={savePlaylist}>
                <Zap size={12} /> Guardar y publicar
              </Btn>
            </div>
          </div>

          {playlist.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 13, border: `2px dashed ${T.border}`, padding: '44px 22px', background: T.primaryDim + '50' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: T.primaryDim, border: `1px solid ${T.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>
                <ImageIcon size={24} color={T.primary} strokeWidth={1.4} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: FD }}>Sin contenido asignado</div>
              <div style={{ fontSize: 12.5, color: T.textSub, textAlign: 'center', lineHeight: 1.7, maxWidth: 280, marginBottom: 20 }}>
                Añade imágenes o videos desde tu biblioteca de media.
              </div>
              <Btn variant="primary" onClick={() => setShowMediaPicker(true)}>Abrir selector de media</Btn>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: 8, padding: '0 2px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: T.textSub }}>
                Arrastra el asa para reordenar · Usa las flechas si prefieres
              </p>
              <div style={{ borderRadius: 13, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                {playlist.map((item, index) => (
                  <div
                    key={`${item.media_id}-${index}`}
                    onDragOver={(e) => handlePlaylistRowDragOver(index, e)}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPlaylistDragOver(null); }}
                    onDrop={(e) => handlePlaylistRowDrop(index, e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: playlistDragOver === index ? T.primaryDim : T.surface,
                      borderBottom: index < playlist.length - 1 ? `1px solid ${T.border}` : 'none',
                      opacity: playlistDragSource === index ? 0.5 : 1,
                      transition: 'background .15s ease, opacity .15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => handlePlaylistDragStart(index, e)}
                        onDragEnd={handlePlaylistDragEnd}
                        title="Arrastrar para reordenar"
                        aria-label="Arrastrar para reordenar fila"
                        style={{ display: 'flex', border: 'none', background: 'transparent', color: T.textSub, cursor: 'grab', padding: 6, borderRadius: 6 }}
                      >
                        <GripVertical size={16} />
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Subir" style={{ background: 'transparent', border: 'none', color: T.textSub, cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.25 : 1, display: 'flex', padding: 1 }}>
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === playlist.length - 1} aria-label="Bajar" style={{ background: 'transparent', border: 'none', color: T.textSub, cursor: index === playlist.length - 1 ? 'default' : 'pointer', opacity: index === playlist.length - 1 ? 0.25 : 1, display: 'flex', padding: 1 }}>
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                    <span style={{ width: 18, textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.textSub, flexShrink: 0 }}>{index + 1}</span>
                    <div style={{ position: 'relative', width: 72, height: 48, borderRadius: 10, overflow: 'hidden', background: T.inputBg, flexShrink: 0, border: `1px solid ${T.border}` }}>
                      {isVideoMedia(item) ? (
                        <>
                          <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" playsInline />
                          <span style={{ position: 'absolute', left: 4, top: 4, borderRadius: 4, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 8.5, fontWeight: 700, padding: '1px 5px' }}>VIDEO</span>
                        </>
                      ) : (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.original_name}</p>
                      {isVideoMedia(item) && <p style={{ fontSize: 11, color: T.primary, margin: 0 }}>Duración según archivo de video</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isVideoMedia(item) ? (
                        <span style={{ borderRadius: 6, border: `1px solid ${T.primary}33`, background: T.primaryDim, padding: '3px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: T.primary }}>Auto</span>
                      ) : (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={item.duration}
                            onChange={(e) => updateDuration(index, e.target.value)}
                            style={{ width: 48, borderRadius: 7, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, textAlign: 'center', fontSize: 12.5, fontWeight: 600, padding: '4px 2px' }}
                          />
                          <span style={{ fontSize: 10.5, color: T.textSub }}>seg</span>
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromPlaylist(index)}
                        title="Quitar de la playlist"
                        aria-label="Quitar de la playlist"
                        style={{ display: 'flex', border: 'none', background: 'transparent', color: T.textSub, cursor: 'pointer', padding: 7, borderRadius: 8, transition: 'color .15s ease, background .15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = T.redDim; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = T.textSub; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selector de media — portal a document.body: si viviera dentro del
          árbol de la página, el transform que deja la animación de .enter
          lo convertiría en containing block y el modal quedaría pegado
          arriba del scroll en vez de centrado en el viewport real. */}
      {showMediaPicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => setShowMediaPicker(false)} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(14px)', animation: 'fadeIn .2s ease both' }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 880, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, boxShadow: '0 32px 80px -16px rgba(0,0,0,.7)', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: FD }}>Seleccionar media</div>
                <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>Elige archivos o súbelos con la zona inferior</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="primary" onClick={addSelectedToPlaylist}>Agregar seleccionados ({selectedMediaIds.length})</Btn>
                <button
                  onClick={() => { setSelectedMediaIds([]); setShowMediaPicker(false); }}
                  style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`, background: T.inputBg, color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
              <input
                ref={pickerFileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
                onChange={(e) => uploadPickerFiles(e.target.files)}
              />
              <button
                type="button"
                onDragOver={(e) => { e.preventDefault(); setPickerDragActive(true); }}
                onDragLeave={() => setPickerDragActive(false)}
                onDrop={handlePickerDrop}
                onClick={() => { if (!pickerUploading) pickerFileInputRef.current?.click(); }}
                disabled={pickerUploading}
                style={{
                  width: '100%', borderRadius: 13, border: `2px dashed ${pickerDragActive ? T.primary : T.border}`,
                  background: pickerDragActive ? T.primaryDim : 'transparent', padding: '18px 14px', textAlign: 'center',
                  cursor: pickerUploading ? 'wait' : 'pointer', marginBottom: 16, transition: 'all .2s ease',
                }}
              >
                {pickerUploading ? (
                  <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>Subiendo...</p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Arrastra archivos aquí o haz clic para subir</p>
                    <p style={{ fontSize: 11.5, color: T.textSub, marginTop: 3 }}>Imágenes y videos (incl. MOV, MP4…), máx. 50 MB</p>
                  </>
                )}
              </button>

              {allMedia.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>No hay más archivos en la biblioteca</p>
                  <p style={{ fontSize: 11.5, color: T.textSub, marginTop: 4 }}>Usa la zona de arriba para agregar el primero</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {allMedia.map((item) => {
                    const inPlaylist = playlist.some((p) => p.media_id === item.id);
                    const isSelected = selectedMediaIds.includes(item.id);
                    const borderColor = inPlaylist ? T.green + '55' : isSelected ? T.primary : T.border;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleMediaSelection(item.id)}
                        disabled={inPlaylist}
                        style={{
                          textAlign: 'left', borderRadius: 12, border: `1.5px solid ${borderColor}`,
                          overflow: 'hidden', background: T.surface, cursor: inPlaylist ? 'not-allowed' : 'pointer',
                          opacity: inPlaylist ? 0.5 : 1, boxShadow: isSelected ? `0 0 0 3px ${T.primaryDim}` : 'none',
                          transition: 'all .18s ease',
                        }}
                      >
                        <div style={{ aspectRatio: '16/9', background: T.inputBg, position: 'relative' }}>
                          {isVideoMedia(item) ? (
                            <>
                              <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" playsInline />
                              <span style={{ position: 'absolute', left: 5, top: 5, borderRadius: 5, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px' }}>VIDEO</span>
                            </>
                          ) : (
                            <img src={item.url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div style={{ padding: '8px 9px' }}>
                          <p style={{ fontSize: 11.5, color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.original_name}</p>
                          {inPlaylist && <p style={{ fontSize: 10.5, color: T.green, margin: '2px 0 0' }}>Ya agregado</p>}
                          {!inPlaylist && isSelected && <p style={{ fontSize: 10.5, color: T.primary, margin: '2px 0 0' }}>Seleccionado</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
