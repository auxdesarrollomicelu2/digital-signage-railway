import { useState, useCallback } from 'react';
import usePermissions from './usePermissions';

export default function useScreenFilters() {
  const { isSuperAdmin } = usePermissions();
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [selectedVenueId, setSelectedVenueId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== 'all') {
      params.append('company_id', selectedCompanyId);
    }

    if (selectedVenueId && selectedVenueId !== 'all') {
      params.append('venue_id', selectedVenueId);
    }

    if (selectedStatus) {
      params.append('status', selectedStatus);
    }

    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }

    return params.toString();
  }, [isSuperAdmin, selectedCompanyId, selectedVenueId, selectedStatus, searchTerm]);

  const resetFilters = useCallback(() => {
    if (isSuperAdmin) {
      setSelectedCompanyId('all');
    }
    setSelectedVenueId('all');
    setSelectedStatus('');
    setSearchTerm('');
  }, [isSuperAdmin]);

  return {
    selectedCompanyId,
    setSelectedCompanyId,
    selectedVenueId,
    setSelectedVenueId,
    selectedStatus,
    setSelectedStatus,
    searchTerm,
    setSearchTerm,
    buildQueryParams,
    resetFilters,
    isSuperAdmin,
  };
}
