import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, FileType, UploadCloud, Trash2, Eye, Pencil, Check, Image as ImageIcon, Video, HardDrive } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import useMediaFilters from '../hooks/useMediaFilters';
import useDebouncedValue from '../hooks/useDebouncedValue';
import FilterSearchInput from '../components/shared/FilterSearchInput';
import FilterChipBar from '../components/shared/FilterChipBar';
import FilterBarRow from '../components/shared/FilterBarRow';
import MediaDrawer from '../components/shared/MediaDrawer';
import MediaViewer from '../components/shared/MediaViewer';
import DeleteModal from '../components/shared/DeleteModal';
import { useTheme } from '../context/ThemeContext';
import { isVideoMime } from '../utils/mediaType';
import { FD, EASE } from '../styles/tokens';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Widget flotante estilo versat.ai — pequeña cápsula con vidrio esmerilado
// sobre la imagen, con el dato real del archivo (tamaño), no decorativo.
function FloatingWidget({ icon: Icon, label, color }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px 4px 6px',
        borderRadius: 99, background: 'rgba(10,13,18,.55)', backdropFilter: 'blur(10px) saturate(160%)',
        border: `1px solid ${color}40`, boxShadow: '0 4px 14px -6px rgba(0,0,0,.5)',
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon size={9} />
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', fontFamily: FD, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, strongWhite = false, onClick, T }) {
  const [hov, setHov] = useState(false);
  const hoverBg = strongWhite ? 'rgba(255,255,255,.85)' : `${color}30`;
  const hoverBorder = strongWhite ? 'rgba(255,255,255,.9)' : color;
  const hoverColor = strongWhite ? '#0a0d12' : color;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', border: `1px solid ${hov ? hoverBorder : 'rgba(255,255,255,.18)'}`,
        background: hov ? hoverBg : 'rgba(10,13,18,.55)', backdropFilter: 'blur(10px)',
        color: hov ? hoverColor : '#fff', transition: 'all .16s ease', transform: hov ? 'translateY(-1px) scale(1.05)' : 'translateY(0) scale(1)',
      }}
    >
      <Icon size={13} />
    </button>
  );
}

// forwardRef: AnimatePresence (mode="popLayout") necesita adjuntar un ref al
// elemento saliente para medirlo al animar la salida — sin esto React tira
// el warning "Function components cannot be given refs".
const MediaCard = forwardRef(function MediaCard({ item, onView, onEdit, onDelete, onRename, T, delay = 0 }, ref) {
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.original_name);
  const inputRef = useRef(null);
  const video = isVideoMime(item.mime_type);
  const accent = video ? T.amber : T.blue;

  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.select());
  }, [editing]);

  function startEdit(e) {
    e.stopPropagation();
    setNameDraft(item.original_name);
    setEditing(true);
  }

  function commit() {
    const trimmed = nameDraft.trim();
    setEditing(false);
    if (trimmed && trimmed !== item.original_name) onRename(item, trimmed);
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="card"
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hov ? accent + '44' : T.border}`,
        boxShadow: hov ? `0 20px 40px -18px ${accent}38, 0 0 0 1px ${accent}22` : T.cardShadow,
        transition: 'border-color .25s ease, box-shadow .25s ease',
      }}
    >
      <div
        onClick={() => onView(item)}
        style={{ aspectRatio: '4/3', position: 'relative', overflow: 'hidden', background: `linear-gradient(145deg,${accent}12,${accent}06)`, cursor: 'zoom-in' }}
      >
        {video ? (
          <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" playsInline />
        ) : (
          <img
            src={item.url} alt={item.original_name} className="h-full w-full object-cover" loading="lazy"
            style={{ transform: hov ? 'scale(1.045)' : 'scale(1)', transition: 'transform .5s cubic-bezier(.22,1,.36,1)' }}
          />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.4) 0%, transparent 26%, transparent 68%, rgba(0,0,0,.55) 100%)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 9, left: 9 }}>
          <FloatingWidget icon={video ? Video : ImageIcon} label={video ? 'Video' : 'Imagen'} color={accent} />
        </div>
        <div style={{ position: 'absolute', bottom: 9, left: 9 }}>
          <FloatingWidget icon={HardDrive} label={formatSize(item.size)} color={T.primary} />
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 6 }}
          transition={{ duration: 0.2, ease: EASE }}
          style={{ position: 'absolute', top: 9, right: 9, display: 'flex', gap: 6 }}
        >
          <QuickAction icon={Eye} label="Ver" color={T.primary} strongWhite T={T} onClick={(e) => { e.stopPropagation(); onView(item); }} />
          <QuickAction icon={Pencil} label="Editar" color={T.blue} T={T} onClick={(e) => { e.stopPropagation(); onEdit(item); }} />
          <QuickAction icon={Trash2} label="Eliminar" color={T.red} T={T} onClick={(e) => { e.stopPropagation(); onDelete(item); }} />
        </motion.div>

        {video && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <motion.span
              animate={{ scale: hov ? 1.08 : 1, opacity: hov ? 1 : 0.85 }}
              transition={{ duration: 0.25, ease: EASE }}
              style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(10,13,18,.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: `1px solid ${accent}55` }}
            >
              <Video size={17} />
            </motion.span>
          </div>
        )}
      </div>

      <div onClick={() => onEdit(item)} style={{ padding: '11px 13px' }}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
              onBlur={commit}
              style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text, background: T.inputBg, border: `1px solid ${T.primary}`, borderRadius: 6, padding: '4px 7px', outline: 'none', minWidth: 0 }}
            />
            <button onMouseDown={(e) => e.preventDefault()} onClick={commit} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: T.primaryDim, color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Check size={11} />
            </button>
          </div>
        ) : (
          <p
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={startEdit}
            title={`${item.original_name} — doble clic para renombrar`}
            style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
          >
            {item.original_name}
          </p>
        )}
      </div>
    </motion.div>
  );
});

export default function MediaPage() {
  const { T } = useTheme();
  const [media, setMedia] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);

  const {
    selectedCompanyId,
    setSelectedCompanyId,
    searchTerm,
    setSearchTerm,
    mimeType,
    setMimeType,
    buildQueryParams,
    getUploadCompanyId,
    isSuperAdmin,
  } = useMediaFilters();

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/companies').then(({ data }) => setCompanies(data)).catch(() => {});
  }, [isSuperAdmin]);

  const filterFields = useMemo(() => {
    const fields = [];
    if (isSuperAdmin) {
      fields.push({
        id: 'company', label: 'Empresa', icon: Building2, type: 'select', emptyValue: 'all',
        options: [{ value: 'all', label: 'Todas las empresas' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))],
      });
    }
    fields.push({
      id: 'mimeType', label: 'Tipo de archivo', icon: FileType, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todos los tipos' },
        { value: 'image', label: 'Solo imágenes' },
        { value: 'video', label: 'Solo videos' },
      ],
    });
    return fields;
  }, [isSuperAdmin, companies]);

  function handleFilterChange(id, value) {
    if (id === 'company') setSelectedCompanyId(value);
    else if (id === 'mimeType') setMimeType(value);
  }

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => { loadMedia(); }, [selectedCompanyId, mimeType, debouncedSearchTerm]);

  async function loadMedia() {
    try {
      const queryString = buildQueryParams();
      const url = queryString ? `/media?${queryString}` : '/media';
      const { data } = await api.get(url);
      setMedia(data);
    } catch {
      toast.error('Error cargando media');
    }
  }

  async function uploadFiles(files) {
    if (!files || files.length === 0) return;

    const uploadCompanyId = getUploadCompanyId();

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));

      if (uploadCompanyId) {
        formData.append('company_id', uploadCompanyId);
      }

      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${files.length} archivo(s) subido(s)`);
      loadMedia();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error subiendo archivos');
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(item) {
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/media/${deleteTarget.id}`);
      toast.success('Archivo eliminado');
      if (drawerItem?.id === deleteTarget.id) setDrawerItem(null);
      loadMedia();
    } catch {
      toast.error('Error eliminando archivo');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleRename(item, newName) {
    const prevMedia = media;
    setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, original_name: newName } : m)));
    setDrawerItem((prev) => (prev && prev.id === item.id ? { ...prev, original_name: newName } : prev));
    try {
      await api.put(`/media/${item.id}`, { original_name: newName });
      toast.success('Archivo renombrado');
    } catch (err) {
      setMedia(prevMedia);
      toast.error(err.response?.data?.error || 'Error renombrando archivo');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  function openViewer(item) {
    const idx = media.findIndex((m) => m.id === item.id);
    if (idx >= 0) setViewerIndex(idx);
  }

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
          Gestión
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
          Media
        </h1>
        <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
          {media.length} archivo{media.length !== 1 ? 's' : ''}
        </p>
      </div>

      <FilterBarRow>
        <FilterChipBar
          fields={filterFields}
          values={{ company: selectedCompanyId, mimeType }}
          onChange={handleFilterChange}
          style={{ flex: '0 1 auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <FilterSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nombre de archivo…"
            style={{ flex: '0 1 240px', minWidth: 160 }}
          />
          <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>
            {media.length} resultado{media.length !== 1 ? 's' : ''}
          </span>
        </div>
      </FilterBarRow>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="card"
        style={{
          padding: '30px 20px', textAlign: 'center', cursor: 'pointer',
          border: `1.5px dashed ${dragActive ? T.primary : T.border}`,
          background: dragActive ? T.primaryDim : T.surface,
          transition: 'border-color .2s ease, background .2s ease',
        }}
      >
        <input
          ref={fileInputRef} type="file" multiple accept="image/*,video/*"
          onChange={(e) => uploadFiles(e.target.files)}
          style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
        />
        {uploading ? (
          <div>
            <p style={{ fontSize: 13.5, color: T.text, marginBottom: 8 }}>Subiendo…</p>
            <div style={{ width: 140, height: 4, borderRadius: 99, background: T.inputBg, margin: '0 auto', overflow: 'hidden' }}>
              <motion.div
                animate={{ x: ['-100%', '160%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '40%', height: '100%', background: T.primary, borderRadius: 99 }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <UploadCloud size={22} color={T.primary} strokeWidth={1.5} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Arrastra archivos aquí o haz clic para seleccionar</p>
            <p style={{ fontSize: 11.5, color: T.textSub }}>Imágenes y videos (MOV, MP4, WEBM…), máx. 50 MB</p>
          </div>
        )}
      </div>

      {media.length === 0 ? (
        <div className="card" style={{ padding: 44, textAlign: 'center', color: T.textSub, fontSize: 13 }}>
          No hay archivos subidos.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
          <AnimatePresence mode="popLayout">
            {media.map((item, i) => (
              <MediaCard
                key={item.id}
                item={item}
                onView={openViewer}
                onEdit={setDrawerItem}
                onDelete={handleDelete}
                onRename={handleRename}
                T={T}
                delay={Math.min(i, 10) * 0.03}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <MediaDrawer
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onRename={handleRename}
        onDelete={(item) => handleDelete(item)}
        onOpenViewer={(item) => { setDrawerItem(null); openViewer(item); }}
      />

      <MediaViewer
        items={media}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onNavigate={setViewerIndex}
      />

      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.original_name}
      />
    </div>
  );
}
