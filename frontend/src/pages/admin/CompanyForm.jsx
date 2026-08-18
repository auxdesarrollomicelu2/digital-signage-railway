import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Building2, KeyRound, ShieldCheck, Eye, EyeOff,
  AlertTriangle, AlertCircle, Check, Plus, X,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import useFormValidation from '../../hooks/useFormValidation';
import { validationRules, normalizers, validateField } from '../../utils/validation';
import Input from '../../components/ui/Input';
import FormSelect from '../../components/shared/FormSelect';
import Btn from '../../components/shared/Btn';
import { useTheme } from '../../context/ThemeContext';
import { FD, EASE } from '../../styles/tokens';

const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -28 : 28 }),
};

function FieldGrid({ children }) {
  return <div style={{ display: 'grid', gap: '18px 16px' }} className="company-form-grid">{children}</div>;
}

// Centra el bloque en vez de estirarlo al ancho completo, para pasos con pocos campos
function CenteredFieldGrid({ children }) {
  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <div style={{ display: 'grid', gap: '18px 16px' }} className="company-form-grid">{children}</div>
    </div>
  );
}

const STEP_CIRCLE = 36;

// Indicador de pasos: círculos conectados por una línea que se rellena con el progreso real
function Stepper({ steps, current, maxReached, onJump, T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '2px 2px 0' }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReached;
        const Icon = s.icon;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < steps.length - 1 ? 1 : '0 0 auto' }}>
            <button
              type="button"
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'transparent', border: 'none', cursor: reachable ? 'pointer' : 'default', padding: 0, flexShrink: 0,
              }}
            >
              <motion.div
                animate={{
                  backgroundColor: done || active ? s.color : T.inputBg,
                  borderColor: done || active ? s.color : T.border,
                  scale: active ? 1.08 : 1,
                }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{
                  width: STEP_CIRCLE, height: STEP_CIRCLE, borderRadius: '50%', border: '1.5px solid', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: done || active ? T.bg : T.textSub,
                  boxShadow: active ? `0 0 0 5px ${s.color}1f, 0 0 18px -4px ${s.color}` : 'none',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                      <Check size={16} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="icon" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} style={{ display: 'flex' }}>
                      <Icon size={16} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? T.text : T.textSub, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </button>

            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 3, marginTop: (STEP_CIRCLE - 3) / 2, marginLeft: -1, marginRight: -1, borderRadius: 3, background: T.border, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: i < current ? '100%' : '0%' }}
                  transition={{ duration: 0.45, ease: EASE }}
                  style={{ height: '100%', borderRadius: 3, background: s.color, boxShadow: `0 0 10px -1px ${s.color}` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { T } = useTheme();

  const initialValues = {
    name: '', username: '', email: '', password: '', currentPassword: '',
    role: 'owner', document_type: '', document: '', phone: '', active: true,
  };

  const fieldRules = {
    name: [(value) => validationRules.required(value, 'Nombre de la empresa')],
    username: [(value) => validationRules.required(value, 'Usuario'), validationRules.username, validationRules.noSpaces],
    email: [(value) => validationRules.required(value, 'Email'), validationRules.email],
    password: isEditing ? [] : [(value) => validationRules.required(value, 'Contraseña'), validationRules.minLength(6)],
    document_type: [(value) => validationRules.required(value, 'Tipo de documento')],
    document: [(value) => validationRules.required(value, 'Número de documento'), validationRules.documentNumber],
    phone: [validationRules.phone],
  };

  const fieldNormalizers = {
    email: normalizers.emailFormat,
    username: normalizers.usernameFormat,
    document: normalizers.numbersAndHyphens,
    phone: normalizers.numbersOnly,
  };

  const { values, errors, touched, handleChange, handleBlur, validateAll, setValues, setFieldError } = useFormValidation(initialValues, fieldRules, fieldNormalizers);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [direction, setDirection] = useState(1);
  // El botón "Siguiente" y el de enviar ("Crear empresa"/"Guardar cambios")
  // ocupan la misma posición en pantalla al cambiar de paso — un doble click
  // o el click-through del navegador puede caer sobre el botón nuevo apenas
  // aparece. Este guard ignora envíos que ocurran justo después de cambiar de paso.
  const lastStepChangeRef = useRef(Date.now());

  const color = T.primary;
  const STEPS = [
    { key: 'basic', label: 'Información', icon: Building2, color, fields: ['name', 'document_type', 'document', 'email', 'phone'] },
    { key: 'credentials', label: 'Credenciales', icon: KeyRound, color: T.blue, fields: ['username', 'password'] },
    { key: 'role', label: 'Rol y estado', icon: ShieldCheck, color: T.accent, fields: [] },
  ];
  const isLastStep = step === STEPS.length - 1;

  useEffect(() => { if (isEditing) loadCompany(); }, [id]);

  async function loadCompany() {
    try {
      setLoadingData(true);
      const { data } = await api.get(`/companies/${id}`);
      setValues({
        name: data.name || '', username: data.username || '', email: data.email || '',
        password: '', currentPassword: '', role: data.role || 'owner',
        document_type: data.document_type || '', document: data.document || '',
        phone: data.phone || '', active: data.active !== undefined ? data.active : true,
      });
    } catch {
      toast.error('Error cargando empresa');
      navigate('/admin/companies');
    } finally {
      setLoadingData(false);
    }
  }

  function validateStepFields(fields) {
    let ok = true;
    fields.forEach((f) => {
      const error = validateField(values[f], fieldRules[f] || []);
      handleBlur(f);
      if (error) ok = false;
    });
    return ok;
  }

  function goNext() {
    setFormError(null);
    const fields = STEPS[step].fields;
    if (!validateStepFields(fields)) {
      setFormError('Por favor corrige los errores antes de continuar');
      return;
    }
    if (STEPS[step].key === 'credentials' && isEditing && values.password && !values.currentPassword) {
      setFormError('Debes proporcionar la contraseña actual para cambiar la contraseña');
      return;
    }
    lastStepChangeRef.current = Date.now();
    setDirection(1);
    setStep((s) => {
      const next = Math.min(s + 1, STEPS.length - 1);
      setMaxReached((m) => Math.max(m, next));
      return next;
    });
  }

  function goBack() {
    setFormError(null);
    lastStepChangeRef.current = Date.now();
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function jumpTo(i) {
    if (i > maxReached) return;
    setFormError(null);
    lastStepChangeRef.current = Date.now();
    setDirection(i > step ? 1 : -1);
    setStep(i);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Ver comentario junto a lastStepChangeRef — ignora envíos que ocurran
    // justo al llegar al último paso (click-through sobre el botón nuevo).
    if (Date.now() - lastStepChangeRef.current < 400) return;

    setFormError(null);

    if (!validateAll()) {
      setFormError('Por favor corrige los errores en el formulario');
      const failingStep = STEPS.findIndex((s) => s.fields.some((f) => errors[f] || validateField(values[f], fieldRules[f] || [])));
      if (failingStep !== -1) { setDirection(-1); setStep(failingStep); setMaxReached((m) => Math.max(m, failingStep)); }
      return;
    }
    setLoading(true);
    try {
      const payload = { ...values };
      if (isEditing) {
        if (payload.password && !payload.currentPassword) {
          setFormError('Debes proporcionar la contraseña actual para cambiar la contraseña');
          setLoading(false);
          setStep(1);
          return;
        }
        if (!payload.password) { delete payload.password; delete payload.currentPassword; }
      } else {
        delete payload.currentPassword;
      }

      if (isEditing) {
        await api.put(`/companies/${id}`, payload);
        toast.success('Empresa actualizada exitosamente');
      } else {
        await api.post('/companies', payload);
        toast.success('Empresa creada exitosamente');
      }
      navigate('/admin/companies');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error guardando empresa');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '0 auto', width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.inputBg}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 12, fontSize: 12.5, color: T.textSub }}>Cargando datos…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
        <Link to="/admin/companies" style={{ color: T.textSub, textDecoration: 'none' }}>Empresas</Link>
        <ChevronRight size={13} color={T.textSub} />
        <span style={{ color: T.text, fontWeight: 600 }}>{isEditing ? 'Editar' : 'Nueva'}</span>
      </nav>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
        className="card"
        style={{
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
          background: `linear-gradient(135deg, ${color}22, ${T.surfaceHigh})`, border: `1px solid ${color}33`,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: FD, letterSpacing: '-.01em', margin: 0 }}>
            {isEditing ? 'Editar empresa' : 'Nueva empresa'}
          </h1>
          <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
            {isEditing ? 'Actualiza la información de la empresa' : 'Completa los datos para registrar una nueva empresa'}
          </p>
        </div>
      </motion.div>

      {/* Stepper */}
      <div style={{ padding: '4px 20px' }}>
        <Stepper steps={STEPS} current={step} maxReached={maxReached} onJump={jumpTo} T={T} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12,
              background: T.redDim, border: `1px solid ${T.red}44`,
            }}
          >
            <AlertCircle size={16} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>Revisa este paso</div>
              <div style={{ fontSize: 12, color: T.text, opacity: 0.85, marginTop: 2 }}>{formError}</div>
            </div>
            <button
              type="button" onClick={() => setFormError(null)}
              style={{ background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${STEPS[step].color}1c`, border: `1px solid ${STEPS[step].color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: STEPS[step].color, flexShrink: 0 }}>
              {(() => { const StepIcon = STEPS[step].icon; return <StepIcon size={14} />; })()}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FD, margin: 0 }}>
              {step === 0 && 'Información básica'}
              {step === 1 && 'Credenciales de acceso'}
              {step === 2 && 'Rol y estado'}
            </h3>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textSub, fontFamily: FD, fontWeight: 600 }}>
              Paso {step + 1} de {STEPS.length}
            </span>
          </div>

          <div style={{ padding: 20, overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: EASE }}
              >
                {step === 0 && (
                  <FieldGrid>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Input
                        label="Nombre de la empresa" required variant="dark"
                        value={values.name} onChange={(e) => handleChange('name', e.target.value)} onBlur={() => handleBlur('name')}
                        placeholder="Ej: Mi Empresa S.A.S" error={touched.name ? errors.name : ''}
                        autoFocus
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="Tipo de documento" required
                        value={values.document_type}
                        onChange={(v) => { handleChange('document_type', v); setFieldError('document_type', validateField(v, fieldRules.document_type)); }}
                        options={[
                          { value: 'NIT', label: 'NIT' },
                          { value: 'CC', label: 'Cédula de Ciudadanía' },
                          { value: 'CE', label: 'Cédula de Extranjería' },
                          { value: 'RUT', label: 'RUT' },
                        ]}
                      />
                      {errors.document_type && <p style={{ marginTop: 6, fontSize: 11, color: T.red }}>{errors.document_type}</p>}
                    </div>
                    <Input
                      label="Número de documento" required variant="dark"
                      value={values.document} onChange={(e) => handleChange('document', e.target.value)} onBlur={() => handleBlur('document')}
                      placeholder="Ej: 900123456-7" error={touched.document ? errors.document : ''}
                    />
                    <Input
                      label="Email" type="email" required variant="dark"
                      value={values.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => handleBlur('email')}
                      placeholder="contacto@empresa.com" error={touched.email ? errors.email : ''}
                    />
                    <Input
                      label="Teléfono" type="tel" variant="dark"
                      value={values.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={() => handleBlur('phone')}
                      placeholder="3001234567" error={touched.phone ? errors.phone : ''}
                    />
                  </FieldGrid>
                )}

                {step === 1 && (
                  <CenteredFieldGrid>
                    <div>
                      <Input
                        label="Usuario" required variant="dark" disabled={isEditing}
                        value={values.username} onChange={(e) => handleChange('username', e.target.value)} onBlur={() => handleBlur('username')}
                        placeholder="usuarioempresa" error={!isEditing && touched.username ? errors.username : ''}
                        style={{ fontFamily: 'monospace' }}
                        autoFocus
                      />
                      {isEditing && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: T.amberDim }}>
                          <AlertTriangle size={13} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 11, color: T.amber, margin: 0 }}>El usuario no se puede cambiar después de crear la empresa</p>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div style={{ position: 'relative' }}>
                        <Input
                          label="Contraseña actual" type={showCurrentPassword ? 'text' : 'password'} variant="dark"
                          value={values.currentPassword} onChange={(e) => handleChange('currentPassword', e.target.value)}
                          placeholder="Ingresa la contraseña actual"
                        />
                        <button
                          type="button" onClick={() => setShowCurrentPassword((v) => !v)} tabIndex={-1}
                          style={{ position: 'absolute', right: 12, top: 38, background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer' }}
                        >
                          {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <p style={{ marginTop: 6, fontSize: 11, color: T.textSub }}>Requerida si deseas cambiar la contraseña</p>
                      </div>
                    )}

                    <div style={{ position: 'relative' }}>
                      <Input
                        label={isEditing ? 'Nueva contraseña' : 'Contraseña'} required={!isEditing} variant="dark"
                        type={showPassword ? 'text' : 'password'} value={values.password}
                        onChange={(e) => handleChange('password', e.target.value)} onBlur={() => handleBlur('password')}
                        placeholder={isEditing ? 'Dejar vacío si no deseas cambiarla' : '••••••••'}
                        error={touched.password ? errors.password : ''}
                      />
                      <button
                        type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                        style={{ position: 'absolute', right: 12, top: 38, background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      {isEditing && !errors.password && <p style={{ marginTop: 6, fontSize: 11, color: T.textSub }}>Completar solo si deseas cambiarla</p>}
                    </div>
                  </CenteredFieldGrid>
                )}

                {step === 2 && (
                  <CenteredFieldGrid>
                    <FormSelect
                      label="Rol" required
                      value={values.role}
                      onChange={(v) => handleChange('role', v)}
                      options={[
                        { value: 'owner', label: 'Owner (Administrador de empresa)' },
                        { value: 'super_admin', label: 'Super Admin (Administrador del sistema)' },
                      ]}
                    />
                    <FormSelect
                      label="Estado" required
                      value={values.active ? 'true' : 'false'}
                      onChange={(v) => handleChange('active', v === 'true')}
                      options={[
                        { value: 'true', label: 'Activa' },
                        { value: 'false', label: 'Inactiva' },
                      ]}
                    />
                  </CenteredFieldGrid>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navegación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <Btn
            variant="secondary" type="button"
            onClick={step === 0 ? () => navigate('/admin/companies') : goBack}
          >
            {step === 0 ? 'Cancelar' : (<><ChevronLeft size={14} /> Atrás</>)}
          </Btn>

          {isLastStep ? (
            <Btn variant="primary" type="submit" disabled={loading} accentColor={color}>
              {loading ? 'Guardando…' : (
                <>
                  <Check size={14} />
                  {isEditing ? 'Guardar cambios' : 'Crear empresa'}
                </>
              )}
            </Btn>
          ) : (
            <Btn variant="primary" type="button" onClick={goNext} accentColor={STEPS[step].color}>
              Siguiente <ChevronRight size={14} />
            </Btn>
          )}
        </div>
      </form>
    </div>
  );
}
