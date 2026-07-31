import { useState, useCallback } from 'react';
import usePermissions from './usePermissions';

export default function useVenueFilters() {
  const { isSuperAdmin } = usePermissions();
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== 'all') {
      params.append('company_id', selectedCompanyId);
    }

    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }

    return params.toString();
  }, [isSuperAdmin, selectedCompanyId, searchTerm]);

  const resetFilters = useCallback(() => {
    if (isSuperAdmin) {
      setSelectedCompanyId('all');
    }
    setSearchTerm('');
  }, [isSuperAdmin]);

  return {
    selectedCompanyId,
    setSelectedCompanyId,
    searchTerm,
    setSearchTerm,
    buildQueryParams,
    resetFilters,
    isSuperAdmin,
  };
}
