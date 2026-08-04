import { useState, useEffect } from 'react';
import api from '../../api';
import Select from '../ui/Select';
import toast from 'react-hot-toast';

export default function VenueSelector({ 
  value, 
  onChange, 
  label = 'Sede',
  companyId = null,
  includeAllOption = false,
  allOptionLabel = 'Todas las sedes',
  placeholder = 'Seleccionar sede',
  required = false,
  className = ''
}) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, [companyId]);

  async function loadVenues() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyId && companyId !== 'all') {
        params.append('company_id', companyId);
      }
      const queryString = params.toString();
      const url = queryString ? `/venues?${queryString}` : '/venues';
      const { data } = await api.get(url);
      setVenues(data);
    } catch (err) {
      toast.error('Error cargando sedes');
      console.error('Error loading venues:', err);
    } finally {
      setLoading(false);
    }
  }

  const options = [
    ...(includeAllOption ? [{ value: 'all', label: allOptionLabel }] : []),
    ...venues.map(venue => ({
      value: venue.id.toString(),
      label: venue.name
    }))
  ];

  if (loading) {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          Cargando sedes...
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
