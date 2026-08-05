import { useState } from 'react';
import { Building2, Eye, Pencil, Power, Trash2, Mail, ShieldCheck, IdCard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FD } from '../../styles/tokens';
import IconBtn from './IconBtn';

const ROLE_LABEL = { super_admin: 'Super Admin', owner: 'Owner' };

function InfoRow({ icon: Icon, value, T }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.textSub, width: '100%', overflow: 'hidden' }}>
      <Icon size={11} style={{ flexShrink: 0, color: T.textMuted }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

/**
 * Tarjeta de empresa — ícono genérico arriba, punto de estado (verde activa /
 * rojo inactiva) en la esquina, NIT/email/rol como filas de info, y las
 * acciones agrupadas abajo a la derecha.
 */
export default function CompanyCard({ company, onView, onEdit, onToggleActive, onDelete, delay = 0 }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  const color = T.primary;
  const canDelete = company.role !== 'super_admin';
  const nit = company.document ? `${company.document_type || 'NIT'}: ${company.document}` : null;

  return (
    <div
      className="enter card card-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', padding: '22px 18px 16px', animationDelay: `${delay}ms`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        borderColor: hov ? `${color}55` : T.border,
      }}
    >
      {/* Punto de estado — verde activa, rojo inactiva */}
      <span
        title={company.active ? 'Activa' : 'Inactiva'}
        style={{
          position: 'absolute', top: 14, right: 14, width: 9, height: 9, borderRadius: '50%',
          background: company.active ? T.green : T.red,
          boxShadow: `0 0 0 3px ${company.active ? T.greenDim : T.redDim}, 0 0 10px 1px ${company.active ? T.green : T.red}80`,
        }}
      />

      {/* Insignia — muestra el logo de la empresa si existe, si no un ícono genérico */}
      <div
        style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0, marginBottom: 8, overflow: 'hidden',
          background: `${color}1c`, border: `1px solid ${color}40`, boxShadow: `0 0 22px -6px ${color}70`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {company.logo_url ? (
          <img src={company.logo_url} alt="" style={{ width: '62%', height: '62%', objectFit: 'contain' }} />
        ) : (
          <Building2 size={22} strokeWidth={1.4} color={color} />
        )}
      </div>

      {/* Nombre */}
      <div
        style={{
          fontSize: 15, fontWeight: 700, color: T.text, fontFamily: FD, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', marginBottom: 6,
        }}
      >
        {company.name}
      </div>

      {/* NIT / email / rol */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', marginBottom: 4 }}>
        <InfoRow icon={IdCard} value={nit} T={T} />
        <InfoRow icon={Mail} value={company.email} T={T} />
        <InfoRow icon={ShieldCheck} value={ROLE_LABEL[company.role] || company.role} T={T} />
      </div>

      {/* Acciones — agrupadas abajo a la derecha */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, alignSelf: 'flex-end' }}>
        <IconBtn icon={Eye} label="Ver detalle" onClick={onView} />
        <IconBtn icon={Pencil} label="Editar" onClick={onEdit} color={T.blue} />
        <IconBtn
          icon={Power}
          label={company.active ? 'Desactivar' : 'Activar'}
          onClick={onToggleActive}
          color={company.active ? T.textSub : T.green}
        />
        {canDelete && <IconBtn icon={Trash2} label="Eliminar" onClick={onDelete} color={T.red} />}
      </div>
    </div>
  );
}
