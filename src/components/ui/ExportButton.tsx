import { Download, FileSpreadsheet, FileText, Table2 } from 'lucide-react';
import type { FormatoExportacao } from '@/types';
import { useDisclosure } from '@/hooks/useDisclosure';

interface ExportButtonProps {
  onExportar: (formato: FormatoExportacao) => void;
  label?: string;
}

const OPCOES: { formato: FormatoExportacao; label: string; icone: typeof FileText }[] = [
  { formato: 'pdf', label: 'Exportar PDF', icone: FileText },
  { formato: 'excel', label: 'Exportar Excel', icone: FileSpreadsheet },
  { formato: 'csv', label: 'Exportar CSV', icone: Table2 },
];

export function ExportButton({ onExportar, label = 'Exportar' }: ExportButtonProps) {
  const { aberto, alternar, fechar } = useDisclosure();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        className="flex h-10 items-center gap-2 rounded-lg border border-graphite-300 bg-white px-3.5 text-sm font-medium text-graphite-700 hover:bg-graphite-50"
      >
        <Download className="h-4 w-4" />
        {label}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={fechar} />
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-graphite-200 bg-white p-1.5 shadow-lg">
            {OPCOES.map(({ formato, label: opcaoLabel, icone: Icone }) => (
              <button
                key={formato}
                type="button"
                onClick={() => {
                  onExportar(formato);
                  fechar();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-graphite-700 hover:bg-graphite-50"
              >
                <Icone className="h-4 w-4 text-graphite-400" />
                {opcaoLabel}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
