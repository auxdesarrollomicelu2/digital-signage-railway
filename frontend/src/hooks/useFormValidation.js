import { useState } from 'react';
import { validateField } from '../utils/validation';

export default function useFormValidation(initialValues, fieldRules, normalizers = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (fieldName, value) => {
    let processedValue = value;

    if (normalizers[fieldName]) {
      processedValue = normalizers[fieldName](value);
    }

    setValues(prev => ({
      ...prev,
      [fieldName]: processedValue
    }));

    if (touched[fieldName]) {
      const rules = fieldRules[fieldName] || [];
      const error = validateField(processedValue, rules);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    const rules = fieldRules[fieldName] || [];
    const error = validateField(values[fieldName], rules);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const validateAll = () => {
    const newErrors = {};
    let hasErrors = false;

    Object.keys(fieldRules).forEach(fieldName => {
      const rules = fieldRules[fieldName];
      const error = validateField(values[fieldName], rules);
      
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(fieldRules).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    return !hasErrors;
  };

  const resetForm = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  };

  const setFieldValue = (fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const setFieldError = (fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    setFieldValue,
    setFieldError,
    setValues
  };
}
