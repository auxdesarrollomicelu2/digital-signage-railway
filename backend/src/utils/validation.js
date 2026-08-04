const validator = {
  isRequired(value, fieldName = 'Campo') {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${fieldName} es requerido`);
    }
    return value;
  },

  isEmail(email) {
    if (!email) return true;
    
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    
    if (trimmed !== email.toLowerCase()) {
      throw new Error('El email debe estar en minúsculas sin espacios');
    }
    
    if (!emailRegex.test(trimmed)) {
      throw new Error('Formato de email inválido');
    }
    
    return true;
  },

  isUsername(username) {
    if (!username) return true;
    
    const trimmed = username.trim().toLowerCase();
    
    if (username !== trimmed) {
      throw new Error('El usuario debe estar en minúsculas sin espacios');
    }
    
    if (/\s/.test(username)) {
      throw new Error('El usuario no puede contener espacios');
    }
    
    if (username.length < 3) {
      throw new Error('El usuario debe tener al menos 3 caracteres');
    }
    
    return true;
  },

  isDocumentNumber(document) {
    if (!document) return true;
    
    const documentRegex = /^[0-9-]+$/;
    
    if (!documentRegex.test(document)) {
      throw new Error('El número de documento solo puede contener números y guiones');
    }
    
    return true;
  },

  isPhone(phone) {
    if (!phone) return true;
    
    const phoneRegex = /^[0-9]+$/;
    
    if (!phoneRegex.test(phone)) {
      throw new Error('El teléfono solo puede contener números');
    }
    
    return true;
  },

  minLength(value, min, fieldName = 'Campo') {
    if (!value) return true;
    
    if (value.length < min) {
      throw new Error(`${fieldName} debe tener al menos ${min} caracteres`);
    }
    
    return true;
  },

  maxLength(value, max, fieldName = 'Campo') {
    if (!value) return true;
    
    if (value.length > max) {
      throw new Error(`${fieldName} no puede tener más de ${max} caracteres`);
    }
    
    return true;
  },

  isRole(role) {
    const validRoles = ['super_admin', 'owner'];
    
    if (!validRoles.includes(role)) {
      throw new Error('El rol debe ser "super_admin" o "owner"');
    }
    
    return true;
  },

  isOrientation(orientation) {
    const validOrientations = ['landscape', 'portrait'];
    
    if (!validOrientations.includes(orientation)) {
      throw new Error('La orientación debe ser "landscape" o "portrait"');
    }
    
    return true;
  },

  isDeviceId(deviceId) {
    if (!deviceId) return true;
    
    if (deviceId.trim() !== deviceId) {
      throw new Error('El device_id no puede tener espacios al inicio o final');
    }
    
    if (deviceId.length < 3) {
      throw new Error('El device_id debe tener al menos 3 caracteres');
    }
    
    return true;
  },

  sanitize(value) {
    if (typeof value !== 'string') return value;
    
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  normalizeEmail(email) {
    if (!email) return email;
    return email.trim().toLowerCase();
  },

  normalizeUsername(username) {
    if (!username) return username;
    return username.trim().toLowerCase().replace(/\s/g, '');
  },

  normalizeDocument(document) {
    if (!document) return document;
    return document.replace(/[^0-9-]/g, '');
  },

  normalizePhone(phone) {
    if (!phone) return phone;
    return phone.replace(/[^0-9]/g, '');
  },

  normalizeName(name) {
    if (!name) return name;
    return name.trim();
  },

  normalizeDeviceId(deviceId) {
    if (!deviceId) return deviceId;
    return deviceId.trim();
  }
};

function validateCompanyData(data, isUpdate = false) {
  const errors = [];

  try {
    if (!isUpdate) {
      validator.isRequired(data.name, 'Nombre de la empresa');
      validator.isRequired(data.username, 'Usuario');
      validator.isRequired(data.password, 'Contraseña');
      validator.isRequired(data.email, 'Email');
      validator.isRequired(data.document_type, 'Tipo de documento');
      validator.isRequired(data.document, 'Número de documento');
    }

    if (data.name) {
      validator.isRequired(data.name, 'Nombre de la empresa');
    }

    if (data.email) {
      validator.isRequired(data.email, 'Email');
      validator.isEmail(data.email);
    }

    if (data.username) {
      validator.isRequired(data.username, 'Usuario');
      validator.isUsername(data.username);
    }

    if (data.password && !isUpdate) {
      validator.minLength(data.password, 6, 'Contraseña');
    }

    if (data.password && isUpdate && data.password.length > 0) {
      validator.minLength(data.password, 6, 'Nueva contraseña');
    }

    if (data.document_type) {
      validator.isRequired(data.document_type, 'Tipo de documento');
    }

    if (data.document) {
      validator.isRequired(data.document, 'Número de documento');
      validator.isDocumentNumber(data.document);
    }

    if (data.phone) {
      validator.isPhone(data.phone);
    }

    if (data.role) {
      validator.isRole(data.role);
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return true;
}

function normalizeCompanyData(data) {
  const normalized = { ...data };

  if (normalized.email) {
    normalized.email = validator.normalizeEmail(normalized.email);
  }

  if (normalized.username) {
    normalized.username = validator.normalizeUsername(normalized.username);
  }

  if (normalized.document) {
    normalized.document = validator.normalizeDocument(normalized.document);
  }

  if (normalized.phone) {
    normalized.phone = validator.normalizePhone(normalized.phone);
  }

  if (normalized.name) {
    normalized.name = normalized.name.trim();
  }

  return normalized;
}

function validateVenueData(data, isUpdate = false) {
  const errors = [];

  try {
    if (!isUpdate) {
      validator.isRequired(data.name, 'Nombre de la sede');
    }

    if (data.name) {
      validator.isRequired(data.name, 'Nombre de la sede');
      validator.minLength(data.name.trim(), 2, 'Nombre de la sede');
      validator.maxLength(data.name.trim(), 100, 'Nombre de la sede');
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return true;
}

function normalizeVenueData(data) {
  const normalized = { ...data };

  if (normalized.name) {
    normalized.name = validator.normalizeName(normalized.name);
  }

  if (normalized.address) {
    normalized.address = normalized.address.trim();
  }

  if (normalized.description) {
    normalized.description = normalized.description.trim();
  }

  return normalized;
}

function validateScreenData(data, isUpdate = false) {
  const errors = [];

  try {
    if (!isUpdate) {
      validator.isRequired(data.name, 'Nombre de la pantalla');
      validator.isRequired(data.venue_id, 'Sede');
    }

    if (data.name) {
      validator.isRequired(data.name, 'Nombre de la pantalla');
      validator.minLength(data.name.trim(), 2, 'Nombre de la pantalla');
      validator.maxLength(data.name.trim(), 100, 'Nombre de la pantalla');
    }

    if (data.device_id && data.device_id.trim() !== '') {
      validator.isDeviceId(data.device_id);
    }

    if (data.orientation) {
      validator.isOrientation(data.orientation);
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return true;
}

function normalizeScreenData(data) {
  const normalized = { ...data };

  if (normalized.name) {
    normalized.name = validator.normalizeName(normalized.name);
  }

  if (normalized.device_id) {
    normalized.device_id = validator.normalizeDeviceId(normalized.device_id);
  }

  return normalized;
}

module.exports = {
  validator,
  validateCompanyData,
  normalizeCompanyData,
  validateVenueData,
  normalizeVenueData,
  validateScreenData,
  normalizeScreenData,
};
