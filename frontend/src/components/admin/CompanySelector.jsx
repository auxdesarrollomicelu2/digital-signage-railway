import { useState, useEffect } from 'react';
import api from '../../api';
import Select from '../ui/Select';
import toast from 'react-hot-toast';

export default function CompanySelector({ 
  value, 
  onChange, 
  label = 'Empresa',
  includeAllOption = false,
  allOptionLabel = 'Todas las empresas',
  placeholder = 'Seleccionar empresa',
  required = false,
  className = ''
}) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const { data } = await api.get('/companies');
      setCompanies(data);
    } catch (err) {
      toast.error('Error cargando empresas');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }

  const options = [
    ...(includeAllOption ? [{ value: 'all', label: allOptionLabel }] : []),
    ...companies.map(company => ({
      value: company.id.toString(),
      label: company.name
    }))
  ];

  if (loading) {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          Cargando empresas...
        </div>
      </div>
    );
  }

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
