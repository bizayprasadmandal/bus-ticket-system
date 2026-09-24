import { useEffect, useState } from 'react';
import api from '../api';
import { PLATFORM_NAME } from '../constants/brand';

export function useCompanyBrand(): string {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/operators/my-company');
        const name = res.data?.data?.company_name;
        if (!cancelled && name) setCompanyName(name);
      } catch {
        // fall back to platform name
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return companyName || PLATFORM_NAME;
}
