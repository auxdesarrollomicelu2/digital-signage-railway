export const validationRules = {
  required: (value, fieldName = 'Campo') => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (!trimmed || trimmed === '') {
      return `${fieldName} es requerido`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    
    const trimmed = value.trim();
    const emailRegex = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    
    if (trimmed !== trimmed.toLowerCase()) {
      return 'El email debe estar en minúsculas';
    }
    
    if (!trimmed.includes('@')) {
      return 'El email debe contener @';
    }
    
    if (!trimmed.includes('.')) {
      return 'El email debe contener un dominio válido';
    }
    
    if (!emailRegex.test(trimmed)) {
      return 'Formato de email inválido';
    }
    
    return null;
  },

  documentNumber: (value) => {
    if (!value) return null;
    
    const trimmed = value.trim();
    const documentRegex = /^[0-9-]+$/;
    
    if (!documentRegex.test(trimmed)) {
      return 'Solo se permiten números y guiones (-)';
    }
    
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    
    const trimmed = value.trim();
    const phoneRegex = /^[0-9]+$/;
    
    if (!phoneRegex.test(trimmed)) {
      return 'Solo se permiten números';
    }
    
    return null;
  },

  username: (value) => {
    if (!value) return null;
    
    const trimmed = value.trim();
    
    if (trimmed !== trimmed.toLowerCase()) {
      return 'El usuario debe estar en minúsculas';
    }
    
    if (trimmed.includes(' ')) {
      return 'El usuario no puede contener espacios';
    }
    
    return null;
  },

  noSpaces: (value, fieldName = 'Campo') => {
    if (!value) return null;
    
    if (value.includes(' ')) {
      return `${fieldName} no puede contener espacios`;
    }
    
    return null;
  },

  minLength: (min) => (value, fieldName = 'Campo') => {
    if (!value) return null;
    
    const trimmed = value.trim();
    if (trimmed.length < min) {
      return `${fieldName} debe tener al menos ${min} caracteres`;
    }
    
    return null;
  }
};

export const normalizers = {
  trim: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  },

  lowercase: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  },

  numbersOnly: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^0-9]/g, '');
  },

  numbersAndHyphens: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^0-9-]/g, '');
  },

  noSpaces: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\s/g, '');
  },

  emailFormat: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase().trim().replace(/\s/g, '');
  },

  usernameFormat: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase().trim().replace(/\s/g, '');
  }
};

export function validateField(value, rules) {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

export function validateForm(values, fieldRules) {
  const errors = {};
  let hasErrors = false;

  Object.keys(fieldRules).forEach(fieldName => {
    const rules = fieldRules[fieldName];
    const value = values[fieldName];
    const error = validateField(value, rules);
    
    if (error) {
      errors[fieldName] = error;
      hasErrors = true;
    }
  });

  return { errors, hasErrors };
}
