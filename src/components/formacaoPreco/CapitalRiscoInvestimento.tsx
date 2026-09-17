import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PercentField } from '@/components/formacaoPreco/PercentField';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { CapitalGiro, ResultadoFormacaoPreco } from '@/types';

interface CapitalRiscoInvestimentoProps {
  contingenciaPercent: number;
  capitalGiro: CapitalGiro;
  resultado: ResultadoFormacaoPreco;
  onChangeContingencia: (v: number) => void;
  onChangeCapitalGiro: (patch: Partial<CapitalGiro>) => void;
}

export function CapitalRiscoInvestimento({ contingenciaPercent, capitalGiro, resultado, onChangeContingencia, onChangeCapitalGiro }: CapitalRiscoInvestimentoProps) {
  const prazosIguais = capitalGiro.prazoRecebimentoDias === capitalGiro.prazoPagamentoDias;
  // Reverte o gross-up só do custo financeiro, mantendo a mesma proporção custo→preço do restante da base de custos.
  const precoSemCustoFinanceiro =
    resultado.precoMinimo !== null && resultado.totalCustosComContingencia > 0
      ? (resultado.precoMinimo * (resultado.totalCustosComContingencia - resultado.custoFinanceiroValor)) / resultado.totalCustosComContingencia
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Contingência / risco operacional</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-graphite-500">
            Buffer sobre os custos diretos para cobrir riscos como aumento de peças/combustível, equipamentos com mais defeito, manutenção acima do estimado ou
            serviços não previstos. Aplicado antes do gross-up (entra no preço mínimo).
          </p>
          <div className="max-w-xs">
            <PercentField label="Percentual de contingência" value={contingenciaPercent} onChange={onChangeContingencia} />
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-graphite-100 pt-3 sm:grid-cols-3 sm:text-right">
            <div>
              <p className="text-xs text-graphite-500">Custo antes da contingência</p>
              <p className="text-sm font-medium text-graphite-900">{formatCurrency(resultado.totalCustosDiretos)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Valor da contingência</p>
              <p className="text-sm font-medium text-graphite-900">{formatCurrency(resultado.contingenciaValor)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Custo após contingência (+ financeiro)</p>
              <p className="text-sm font-semibold text-graphite-900">{formatCurrency(resultado.totalCustosComContingencia)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Capital de giro</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-graphite-500">
            Baseado nos custos que geram desembolso de caixa (mão de obra, materiais, manutenção e combustível) — depreciação e remuneração de capital são registros
            contábeis, não saída de caixa. Necessidade = custo caixa mensal × (prazo de recebimento − prazo de pagamento) ÷ 30.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
              Prazo médio de recebimento (dias)
              <Input type="number" min={0} value={capitalGiro.prazoRecebimentoDias} onChange={(e) => onChangeCapitalGiro({ prazoRecebimentoDias: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
              Prazo médio de pagamento a fornecedores (dias)
              <Input type="number" min={0} value={capitalGiro.prazoPagamentoDias} onChange={(e) => onChangeCapitalGiro({ prazoPagamentoDias: Number(e.target.value) })} />
            </label>
          </div>
          {prazosIguais && (
            <p className="text-[11px] font-medium text-negative-600">A CONFIRMAR: prazos iguais (default 30/30) — ajuste com os prazos reais do contrato/fornecedores.</p>
          )}
          <p className="text-right text-sm text-graphite-600">
            Capital de giro necessário: <strong className="text-graphite-900">{formatCurrency(resultado.capitalGiroNecessario)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Custo financeiro</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-graphite-500">Taxa mensal aplicada sobre o capital de giro necessário, ao longo da duração do contrato (juros de capital de giro, antecipação de recebíveis etc.).</p>
          <div className="max-w-xs">
            <PercentField label="Taxa financeira mensal" value={capitalGiro.taxaFinanceiraMensalPercent} onChange={(v) => onChangeCapitalGiro({ taxaFinanceiraMensalPercent: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-graphite-100 pt-3 sm:grid-cols-2 sm:text-right">
            <div>
              <p className="text-xs text-graphite-500">Preço sem custo financeiro</p>
              <p className="text-sm text-graphite-700">{precoSemCustoFinanceiro === null ? 'N/A' : formatCurrency(precoSemCustoFinanceiro)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Custo financeiro embutido no preço</p>
              <p className="text-sm font-semibold text-graphite-900">{formatCurrency(resultado.custoFinanceiroValor)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Investimento inicial e retorno</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-graphite-500">
            Outros investimentos iniciais (R$) — ferramentas, estoque, estrutura…
            <Input type="number" min={0} step="0.01" value={capitalGiro.outrosInvestimentosIniciais} onChange={(e) => onChangeCapitalGiro({ outrosInvestimentosIniciais: Number(e.target.value) })} />
          </label>
          <div className="grid grid-cols-2 gap-3 border-t border-graphite-100 pt-3 sm:grid-cols-4 sm:text-right">
            <div>
              <p className="text-xs text-graphite-500">Investimento inicial total</p>
              <p className="text-sm font-semibold text-graphite-900">{formatCurrency(resultado.investimentoInicial)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">ROI (total do contrato)</p>
              <p className="text-sm font-medium text-graphite-900">{resultado.roiTotalPercent === null ? 'N/A' : formatPercent(resultado.roiTotalPercent)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">ROI anualizado</p>
              <p className="text-sm font-medium text-graphite-900">{resultado.roiAnualPercent === null ? 'N/A' : formatPercent(resultado.roiAnualPercent)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Payback</p>
              <p className="text-sm font-medium text-graphite-900">{resultado.paybackMeses === null ? 'N/A' : `${resultado.paybackMeses.toFixed(1)} meses`}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
