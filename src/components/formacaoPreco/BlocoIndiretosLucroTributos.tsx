import type { ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { ResultadoFormacaoPreco } from '@/types';

interface BlocoIndiretosLucroTributosProps {
  custosIndiretosPercent: number;
  lucroPercent: number;
  tributosSobreCustoPercent: number;
  tributosSobreReceitaPercent: number;
  resultado: ResultadoFormacaoPreco;
  onChangeCustosIndiretos: (v: number) => void;
  onChangeLucro: (v: number) => void;
  onChangeTributosSobreCusto: (v: number) => void;
  onChangeTributosSobreReceita: (v: number) => void;
}

function CampoPercentTabela({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        step="0.01"
        min={0}
        value={Number((value * 100).toFixed(4))}
        onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
        className="w-20 text-right"
      />
      <span className="text-xs text-graphite-400">%</span>
    </div>
  );
}

function LinhaTabela({
  item,
  percentual,
  base,
  total,
  destaque,
}: {
  item: ReactNode;
  percentual?: ReactNode;
  base?: number;
  total: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_110px_140px_140px] items-center gap-2 px-4 py-2.5 text-sm ${destaque ? 'bg-graphite-50 font-semibold text-graphite-900' : 'text-graphite-700'}`}
    >
      <span>{item}</span>
      <div className="flex justify-end">{percentual}</div>
      <span className="text-right text-graphite-500">{base === undefined ? '' : formatCurrency(base)}</span>
      <span className={`text-right ${destaque ? 'font-bold' : 'font-medium'}`}>{formatCurrency(total)}</span>
    </div>
  );
}

/**
 * Mesma estrutura em tabela da planilha-modelo do DFP: 2. CUSTOS INDIRETOS → LUCRO →
 * TRIBUTOS, cada bloco com Item | Percentual (%) | Base de Cálculo (R$) | Total (R$),
 * e as linhas de totais acumulados (TOTAL 2., Total dos Custos, Total dos Custos + Lucro).
 * Todos os percentuais são aplicados sobre o preço adotado (base de cálculo) — o preço
 * mínimo teórico quando ainda não há contrato fechado, ou a receita real informada
 * quando já há. Quando o contrato está fechado, o Lucro deixa de ser uma meta em % e
 * passa a ser o resultado real (residual) do preço fechado menos os custos.
 */
export function BlocoIndiretosLucroTributos({
  custosIndiretosPercent,
  lucroPercent,
  tributosSobreCustoPercent,
  tributosSobreReceitaPercent,
  resultado,
  onChangeCustosIndiretos,
  onChangeLucro,
  onChangeTributosSobreCusto,
  onChangeTributosSobreReceita,
}: BlocoIndiretosLucroTributosProps) {
  const base = resultado.precoAdotado ?? 0;
  const contratoFechado = resultado.contratoFechado;
  const cabecalho = (
    <div className="grid grid-cols-[1fr_110px_140px_140px] gap-2 px-4 py-2 text-[11px] font-medium text-graphite-400">
      <span>Item</span>
      <span className="text-right">Percentual (%)</span>
      <span className="text-right">Base de Cálculo (R$)</span>
      <span className="text-right">Total (R$)</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-lg border border-graphite-200">
        <div className="border-b border-graphite-200 bg-graphite-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-graphite-500">2. Custos Indiretos</div>
        {cabecalho}
        <div className="flex flex-col divide-y divide-graphite-100 border-t border-graphite-100">
          <LinhaTabela
            item="Admin. central"
            percentual={<CampoPercentTabela value={custosIndiretosPercent} onChange={onChangeCustosIndiretos} />}
            base={base}
            total={resultado.custosIndiretosValor}
          />
          <LinhaTabela item="Total dos Custos Indiretos (TOTAL 2.)" total={resultado.custosIndiretosValor} destaque />
          <LinhaTabela item="Total dos Custos" total={resultado.totalCustos} destaque />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-graphite-200">
        <div className="border-b border-graphite-200 bg-graphite-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-graphite-500">Lucro</div>
        {contratoFechado && (
          <p className="border-b border-graphite-100 bg-graphite-50/50 px-4 py-2 text-[11px] text-graphite-500">
            Contrato já fechado — o lucro é o resultado real (receita menos custos), este percentual não é usado no cálculo.
          </p>
        )}
        {cabecalho}
        <div className="flex flex-col divide-y divide-graphite-100 border-t border-graphite-100">
          <LinhaTabela
            item="Lucro"
            percentual={
              contratoFechado ? (
                <span className="text-sm text-graphite-500">{formatPercent(base > 0 ? (resultado.lucroValor / base) * 100 : 0)} (real)</span>
              ) : (
                <CampoPercentTabela value={lucroPercent} onChange={onChangeLucro} />
              )
            }
            base={base}
            total={resultado.lucroValor}
          />
          <LinhaTabela item="Total dos Custos + Lucro" total={resultado.totalCustosMaisLucro} destaque />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-graphite-200">
        <div className="border-b border-graphite-200 bg-graphite-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-graphite-500">Tributos</div>
        {cabecalho}
        <div className="flex flex-col divide-y divide-graphite-100 border-t border-graphite-100">
          <LinhaTabela
            item="% Total dos tributos sobre o custo (ex.: Simples Nacional)"
            percentual={<CampoPercentTabela value={tributosSobreCustoPercent} onChange={onChangeTributosSobreCusto} />}
            base={base}
            total={resultado.tributosSobreCustoValor}
          />
          <LinhaTabela
            item="% Total dos tributos sobre a receita (ISS + PIS + COFINS + CPRB…)"
            percentual={<CampoPercentTabela value={tributosSobreReceitaPercent} onChange={onChangeTributosSobreReceita} />}
            base={base}
            total={resultado.tributosSobreReceitaValor}
          />
          <LinhaTabela item="Total dos Tributos" total={resultado.tributosValor} destaque />
        </div>
      </div>

      <p className="text-right text-sm text-graphite-600">
        TOTAL DOS SERVIÇOS ({contratoFechado ? 'preço do contrato fechado' : 'preço mínimo'}):{' '}
        <strong className="text-graphite-900">{resultado.precoAdotado === null ? 'N/A' : formatCurrency(resultado.precoAdotado)}</strong>
      </p>
    </div>
  );
}
