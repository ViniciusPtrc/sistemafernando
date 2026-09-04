import { Building2, Check, ChevronDown } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useDisclosure } from '@/hooks/useDisclosure';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { ALL_COMPANIES } from '@/mock/companies';

export function CompanySelector() {
  const { companies, selectedCompany, setSelectedCompany, currentCompany } = useCompany();
  const { aberto, alternar, fechar } = useDisclosure();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        className="flex h-10 items-center gap-2.5 rounded-lg border border-graphite-300 bg-white py-1 pl-2 pr-3 text-sm font-medium text-graphite-700 hover:bg-graphite-50"
      >
        {currentCompany ? (
          <CompanyAvatar company={currentCompany} size="sm" />
        ) : (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-graphite-800 text-white">
            <Building2 className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="max-w-[180px] truncate">{currentCompany ? currentCompany.name : 'Todas as empresas'}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-graphite-400" />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={fechar} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-graphite-200 bg-white p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setSelectedCompany(ALL_COMPANIES);
                fechar();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-graphite-50 ${
                selectedCompany === ALL_COMPANIES ? 'bg-brand-50 text-brand-700' : 'text-graphite-700'
              }`}
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-graphite-800 text-white">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              Todas as empresas
              {selectedCompany === ALL_COMPANIES && <Check className="ml-auto h-4 w-4 flex-shrink-0 text-brand-600" />}
            </button>

            <div className="my-1 h-px bg-graphite-100" />

            {companies.map((empresa) => (
              <button
                key={empresa.id}
                type="button"
                onClick={() => {
                  setSelectedCompany(empresa.id);
                  fechar();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-graphite-50 ${
                  selectedCompany === empresa.id ? 'bg-brand-50 text-brand-700' : 'text-graphite-700'
                }`}
              >
                <CompanyAvatar company={empresa} size="sm" />
                <span className="truncate">{empresa.name}</span>
                {selectedCompany === empresa.id && <Check className="ml-auto h-4 w-4 flex-shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
