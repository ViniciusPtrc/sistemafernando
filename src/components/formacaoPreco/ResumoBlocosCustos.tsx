import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import type { ResultadoFormacaoPreco } from '@/types';

interface ResumoBlocosCustosProps {
  resultado: ResultadoFormacaoPreco;
}

interface LinhaBloco {
  codigo: string;
  label: string;
  valor: number;
  nivel?: 1 | 2;
  destaque?: boolean;
}

/**
 * Recapitula os totais por bloco (1.1, 1.2 com 1.2.1/1.2.2, 1.3, 1.4 e o TOTAL 1.
 * geral) na mesma hierarquia de numeração da planilha-modelo do DFP — cada linha
 * aqui corresponde a um "TOTAL x.y" daquela planilha.
 */
export function ResumoBlocosCustos({ resultado }: ResumoBlocosCustosProps) {
  const linhas: LinhaBloco[] = [
    { codigo: '1.1', label: 'Mão de obra (direta + indireta + uniforme/EPI + alimentação)', valor: resultado.maoDeObra.total },
    { codigo: '1.2', label: 'Materiais', valor: resultado.materiais.total },
    { codigo: '1.2.1', label: 'Materiais de aplicação', valor: resultado.materiais.aplicacao, nivel: 2 },
    { codigo: '1.2.2', label: 'Outros materiais', valor: resultado.materiais.outros, nivel: 2 },
    { codigo: '1.3', label: 'Equipamentos de aplicação direta', valor: resultado.equipamentos.total },
    { codigo: '1.4', label: 'Veículos', valor: resultado.veiculos.total },
    { codigo: 'TOTAL 1.', label: 'Total dos Custos Diretos', valor: resultado.totalCustosDiretos, destaque: true },
  ];

  return (
    <Card>
      <div className="border-b border-graphite-200 p-4">
        <h3 className="text-sm font-semibold text-graphite-900">Resumo dos blocos de custo</h3>
        <p className="text-xs text-graphite-500">Mesma numeração e hierarquia da planilha-modelo do DFP — cada linha é o total daquele bloco.</p>
      </div>
      <div className="flex flex-col divide-y divide-graphite-100">
        {linhas.map((linha) => (
          <div
            key={linha.codigo}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${linha.destaque ? 'bg-graphite-50' : ''} ${linha.nivel === 2 ? 'pl-8' : ''}`}
          >
            <span className={linha.destaque ? 'font-semibold text-graphite-900' : linha.nivel === 2 ? 'text-graphite-500' : 'font-medium text-graphite-700'}>
              <span className="mr-2 text-xs font-mono text-graphite-400">{linha.codigo}</span>
              {linha.label}
            </span>
            <span className={linha.destaque ? 'text-base font-bold text-graphite-900' : linha.nivel === 2 ? 'text-graphite-600' : 'font-semibold text-graphite-900'}>
              {formatCurrency(linha.valor)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
