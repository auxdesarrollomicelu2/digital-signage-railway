import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, ChevronDown, Plus, X, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import SelectDropdown from './SelectDropdown';
import { FB } from '../../styles/tokens';

/**
 * Barra de filtros global (botón "Filtros" → dropdown "agregar filtro por"
 */
export default function FilterChipBar({ fields, values, onChange, resultCount, style }) {
  const { T } = useTheme();
  const [activeIds, setActiveIds] = useState(() => fields.filter((f) => hasValue(f, values[f.id])).map((f) => f.id));
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const availableFields = fields.filter((f) => !activeIds.includes(f.id));

  function addFilter(id) {
    setActiveIds((prev) => [...prev, id]);
    setOpen(false);
  }

  function removeFilter(field) {
    setActiveIds((prev) => prev.filter((id) => id !== field.id));
    onChange(field.id, field.emptyValue ?? '');
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, ...style }}>
      <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 16px', height: 40, borderRadius: 11, fontSize: 13, fontWeight: 700, fontFamily: FB,
            color: '#052018', cursor: 'pointer', border: 'none',
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryMid})`,
            boxShadow: `0 6px 18px -4px ${T.primary}55, inset 0 1px 0 rgba(255,255,255,.25)`,
          }}
        >
          <Filter size={13} />
          <span>Filtros</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ display: 'flex' }}>
            <ChevronDown size={12} />
          </motion.span>
          <motion.span
            aria-hidden
            initial={{ left: '-60%' }}
            animate={{ left: ['-60%', '160%'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
            style={{
              position: 'absolute', top: 0, width: '45%', height: '100%',
              background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,.18) 40%, rgba(255,255,255,.55) 50%, rgba(255,255,255,.18) 60%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </button>

        <AnimatePresence>
          {open && availableFields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 60, minWidth: 220,
                background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 12,
                boxShadow: '0 20px 48px -12px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03)', overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', background: T.inputBg,
                  borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, color: T.textSub,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                }}
              >
                <Filter size={11} color={T.primary} /> Agregar filtro por
              </div>
              {availableFields.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => addFilter(f.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                      background: 'transparent', border: 'none', borderBottom: `1px solid ${T.border}`,
                      color: T.text, fontSize: 13, fontFamily: FB, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                      transition: 'background .12s ease, color .12s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.primaryDim; e.currentTarget.style.color = T.primary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text; }}
                  >
                    {Icon && <Icon size={13} color={T.primary} />}
                    {f.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 1 }}>
        {activeIds.length === 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textSub, fontStyle: 'italic' }}>
            <Info size={13} /> No hay filtros aplicados
          </span>
        )}

        <AnimatePresence initial={false}>
          {activeIds.map((id) => {
            const field = fields.find((f) => f.id === id);
            if (!field) return null;
            return (
              <FilterChip
                key={id}
                field={field}
                value={values[id]}
                onChange={(v) => onChange(id, v)}
                onRemove={() => removeFilter(field)}
                T={T}
              />
            );
          })}
        </AnimatePresence>

        {availableFields.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
              borderRadius: 9, background: 'transparent', border: `1.5px dashed ${T.border}`, color: T.textSub,
              fontSize: 12, fontWeight: 600, fontFamily: FB, cursor: 'pointer', transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.color = T.primary; e.currentTarget.style.background = T.primaryDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.color = T.textSub; e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus size={12} /> Agregar
          </button>
        )}

        {typeof resultCount === 'number' && (
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.textSub }}>
            {resultCount} resultado{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

function hasValue(field, value) {
  if (field.type === 'daterange') return !!(value?.desde || value?.hasta);
  return value !== undefined && value !== null && value !== '' && value !== (field.emptyValue ?? '__none__');
}

function FilterChip({ field, value, onChange, onRemove, T }) {
  const Icon = field.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.4, x: -14 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: 'spring', stiffness: 480, damping: 18, mass: 0.7 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 6px 0 10px',
        background: T.inputBg, border: `1px solid ${T.primary}33`, borderRadius: 9,
        boxShadow: `0 1px 4px ${T.primary}0d`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: T.primary, whiteSpace: 'nowrap' }}>
        {Icon && <Icon size={12} />} {field.label}
      </span>
      <span style={{ width: 1, height: 16, background: `${T.primary}30`, flexShrink: 0 }} />

      {field.type === 'text' && (
        <input
          autoFocus
          type="text"
          value={value || ''}
          placeholder={field.placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', color: T.text, fontSize: 12.5, fontFamily: FB, width: 130 }}
        />
      )}

      {field.type === 'select' && (
        <SelectDropdown
          value={value ?? ''}
          onChange={onChange}
          options={field.options}
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', color: T.text, fontSize: 12.5, fontFamily: FB, colorScheme: T.mode }}
        />
      )}

      {field.type === 'custom' && field.render(value, onChange)}

      {field.type === 'daterange' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: T.textSub }}>Desde</span>
          <input
            type="date"
            value={value?.desde || ''}
            onChange={(e) => onChange({ ...value, desde: e.target.value })}
            style={{ border: 'none', background: 'transparent', outline: 'none', color: T.text, fontSize: 12.5, fontFamily: FB, colorScheme: T.mode }}
          />
          <span style={{ fontSize: 11, color: T.textSub }}>Hasta</span>
          <input
            type="date"
            value={value?.hasta || ''}
            onChange={(e) => onChange({ ...value, hasta: e.target.value })}
            style={{ border: 'none', background: 'transparent', outline: 'none', color: T.text, fontSize: 12.5, fontFamily: FB, colorScheme: T.mode }}
          />
        </div>
      )}

      <button
        type="button"
        title="Quitar filtro"
        onClick={onRemove}
        style={{
          width: 20, height: 20, borderRadius: 6, border: 'none', background: `${T.red}18`, color: T.red,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          transition: 'transform .18s ease, background .18s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${T.red}30`; e.currentTarget.style.transform = 'rotate(90deg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = `${T.red}18`; e.currentTarget.style.transform = 'rotate(0deg)'; }}
      >
        <X size={11} />
      </button>
    </motion.div>
  );
}
