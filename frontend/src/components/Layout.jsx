import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Monitor, Building2, Image as ImageIcon,
  Users, ShieldCheck, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import usePermissions from '../hooks/usePermissions';
import { useTheme } from '../context/ThemeContext';
import Backdrop from './Backdrop';
import ClickSpark from './ClickSpark';
import { FD, FB } from '../styles/tokens';

const SIDEBAR_KEY = 'ds_sidebar_collapsed';

// Mismas rutas y roles reales que antes — solo cambia el ícono/estilo (copia del mockup ControlCenter V3)
const navItems = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/screens', label: 'Pantallas', Icon: Monitor },
  { to: '/venues', label: 'Sedes', Icon: Building2 },
  { to: '/media', label: 'Media', Icon: ImageIcon },
];

const adminNavItems = [
  { to: '/admin/companies', label: 'Empresas', Icon: Users },
  { to: '/admin/audit', label: 'Auditoría', Icon: ShieldCheck },
];

function NavItem({ to, label, Icon, end, collapsed, T, sp }) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink to={to} end={end} title={collapsed ? label : undefined} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <motion.div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          whileTap={{ scale: 0.97 }}
          animate={{ x: hov && !isActive ? 2 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '11px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 11, marginBottom: 2, position: 'relative', overflow: 'hidden',
            background: isActive ? `${sp}1c` : hov ? 'rgba(255,255,255,.05)' : 'transparent',
            color: isActive ? sp : hov ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.48)',
            transition: 'background .18s ease, color .18s ease',
          }}
        >
          {isActive && (
            <motion.span
              layoutId="sidebar-active-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 2.5, height: 16, borderRadius: '0 3px 3px 0', background: sp, boxShadow: `0 0 10px ${sp}`,
              }}
            />
          )}
          <div style={{ transform: isActive ? 'scale(1.08)' : 'scale(1)', transition: 'transform .18s ease', flexShrink: 0, filter: isActive ? `drop-shadow(0 0 5px ${sp}88)` : 'none' }}>
            <Icon size={17} strokeWidth={isActive ? 2.1 : 1.7} />
          </div>
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, letterSpacing: isActive ? '-.01em' : 0, fontFamily: FB, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          )}
          {collapsed && hov && (
            <div style={{
              position: 'absolute', left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)',
              background: T.surface, border: `1px solid ${sp}44`, borderRadius: 9, padding: '6px 11px',
              fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', boxShadow: T.cardShadow, zIndex: 50,
            }}>
              {label}
            </div>
          )}
        </motion.div>
      )}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const { T } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return globalThis.localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        globalThis.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const sp = T.primary;

  return (
    <ClickSpark sparkColor={sp} sparkSize={10} sparkRadius={18} sparkCount={8} duration={450}>
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: FB, position: 'relative', overflow: 'hidden' }}>
      <Backdrop />

      <aside
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', flexShrink: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', background: T.sidebarBg,
          borderRight: '1px solid rgba(255,255,255,.06)',
          width: collapsed ? 72 : 220, minWidth: collapsed ? 72 : 220,
          transition: 'width .38s cubic-bezier(.22,1,.36,1), min-width .38s cubic-bezier(.22,1,.36,1)',
          overflowY: 'auto', overflowX: 'hidden',
        }}
      >
        <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${sp}88, transparent)`, flexShrink: 0 }} />
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: collapsed ? '20px 0' : '20px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid rgba(255,255,255,.05)',
            flexShrink: 0,
          }}
        >
          <img
            src="/isotipo.png"
            alt="Digital Signage"
            style={{
              width: 50, height: 50, flexShrink: 0, objectFit: 'contain',
              filter: `drop-shadow(0 0 8px ${sp}77)`,
            }}
          />
          {!collapsed && (
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-.01em', fontFamily: FD, whiteSpace: 'nowrap' }}>
                Digital Signage
              </div>
              <div style={{ fontSize: 10, color: sp, opacity: .8 }}>Panel de control</div>
            </div>
          )}
        </div>

        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} T={T} sp={sp} />
          ))}

          {isSuperAdmin && (
            <>
              {!collapsed ? (
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)',
                  letterSpacing: '.12em', textTransform: 'uppercase', padding: '14px 6px 5px',
                  borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 6,
                }}>
                  Administración
                </div>
              ) : (
                <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '10px 6px' }} />
              )}
              {adminNavItems.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} T={T} sp={sp} />
              ))}
            </>
          )}
        </nav>

        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#050F0C',
              background: `linear-gradient(135deg, ${sp}, #00A885)`,
            }}>
              {initials}
            </span>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap' }}>
                  {user?.role}
                </div>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Salir"
                title="Salir"
                style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,.3)',
                  cursor: 'pointer', display: 'flex', flexShrink: 0, transition: 'color .15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Salir"
              title="Salir"
              style={{
                width: '100%', display: 'flex', justifyContent: 'center', marginTop: 4,
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,.3)',
                cursor: 'pointer', padding: '6px 0',
              }}
            >
              <LogOut size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
              padding: collapsed ? '7px 0' : '7px 10px', borderRadius: 9,
              border: 'none', background: 'transparent', color: 'rgba(255,255,255,.25)',
              cursor: 'pointer', fontSize: 11.5, fontWeight: 500, fontFamily: FB, marginTop: 4,
              transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.6)'; e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.25)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight
              size={14}
              style={{ transition: 'transform .3s ease', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
            {!collapsed && 'Contraer'}
          </button>
        </div>
      </aside>

      <div
        style={{
          flex: 1, minWidth: 0, maxWidth: '100%', position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginLeft: collapsed ? 72 : 220,
          transition: 'margin-left .38s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <main style={{ padding: '28px 24px 96px', width: '100%', flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
    </ClickSpark>
  );
}
