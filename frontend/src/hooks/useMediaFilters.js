import { useState, useCallback } from 'react';
import usePermissions from './usePermissions';

export default function useMediaFilters() {
  const { isSuperAdmin } = usePermissions();
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mimeType, setMimeType] = useState('');

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== 'all') {
      params.append('company_id', selectedCompanyId);
    }

    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }

    if (mimeType) {
      params.append('mime_type', mimeType);
    }

    return params.toString();
  }, [isSuperAdmin, selectedCompanyId, searchTerm, mimeType]);

  const getUploadCompanyId = useCallback(() => {
    if (!isSuperAdmin) {
      return null;
    }

    if (selectedCompanyId === 'all' || !selectedCompanyId) {
      return null;
    }

    return selectedCompanyId;
  }, [isSuperAdmin, selectedCompanyId]);

  return {
    selectedCompanyId,
    setSelectedCompanyId,
    searchTerm,
    setSearchTerm,
    mimeType,
    setMimeType,
    buildQueryParams,
    getUploadCompanyId,
    isSuperAdmin,
  };
}
