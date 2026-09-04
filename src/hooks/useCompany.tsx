import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Company, SelectedCompany } from '@/types';
import { ALL_COMPANIES, companies } from '@/mock/companies';

interface CompanyContextValue {
  companies: Company[];
  selectedCompany: SelectedCompany;
  setSelectedCompany: (id: SelectedCompany) => void;
  currentCompany: Company | null;
  isConsolidated: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = 'dashboard-financeiro:selected-company';

function lerCompanySalva(): SelectedCompany {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo && (salvo === ALL_COMPANIES || companies.some((empresa) => empresa.id === salvo))) {
      return salvo;
    }
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue com o padrão
  }
  return ALL_COMPANIES;
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<SelectedCompany>(lerCompanySalva);

  const setSelectedCompany = (id: SelectedCompany) => {
    setSelectedCompanyState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignora — preferência não será persistida nesta sessão
    }
  };

  const currentCompany = useMemo(
    () => (selectedCompany === ALL_COMPANIES ? null : companies.find((empresa) => empresa.id === selectedCompany) ?? null),
    [selectedCompany],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      selectedCompany,
      setSelectedCompany,
      currentCompany,
      isConsolidated: selectedCompany === ALL_COMPANIES,
    }),
    [selectedCompany, currentCompany],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany deve ser usado dentro de um CompanyProvider');
  }
  return context;
}
