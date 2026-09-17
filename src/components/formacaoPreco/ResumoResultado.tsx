import { CheckCircle2, Clock, PiggyBank, Percent, TrendingDown, TrendingUp, Wallet, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FinancialCard } from '@/components/dashboard/FinancialCard';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { ResultadoFormacaoPreco } from '@/types';

interface ResumoResultadoProps {
  resultado: ResultadoFormacaoPreco;
  lucroPercentAlvo: number;
}

export function ResumoResultado({ resultado, lucroPercentAlvo }: ResumoResultadoProps) {
  const { comparacaoReferencia, contratoFechado } = resultado;
  const temConferenciaDfp = resultado.totalServicosDfp !== null;
  const margemRealPct = contratoFechado && resultado.precoAdotado ? (resultado.lucroValor / resultado.precoAdotado) * 100 : null;

  return (
    <div className="flex flex-col gap-4">
      {contratoFechado && (
        <p className="rounded-lg bg-graphite-50 px-4 py-2 text-xs text-graphite-600">
          Contrato já fechado (receita mensal informada) — os números abaixo mostram a viabilidade real desse preço, não uma meta a atingir.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialCard titulo="Total de custos diretos" valor={formatCurrency(resultado.totalCustosDiretos)} icone={<TrendingDown className="h-4 w-4" />} tom="negativo" />
        <FinancialCard
          titulo={contratoFechado ? 'Preço do contrato (fechado)' : 'Preço mínimo necessário'}
          valor={
            contratoFechado
              ? resultado.valorGlobalContrato === null
                ? 'N/A'
                : formatCurrency(resultado.valorGlobalContrato)
              : resultado.precoAdotado === null
                ? 'N/A'
                : formatCurrency(resultado.precoAdotado)
          }
          icone={<Wallet className="h-4 w-4" />}
          tom="destaque"
          linhaDetalhe={
            contratoFechado
              ? `já negociado — valor total do contrato (${resultado.valorMensal === null ? 'N/A' : formatCurrency(resultado.valorMensal)}/mês)`
              : 'p/ bater a margem-alvo'
          }
        />
        <FinancialCard
          titulo={contratoFechado ? 'Margem real' : 'Margem-alvo'}
          valor={formatPercent(contratoFechado ? margemRealPct ?? 0 : lucroPercentAlvo * 100)}
          icone={<Percent className="h-4 w-4" />}
          linhaDetalhe={formatCurrency(resultado.lucroValor)}
        />
        <FinancialCard
          titulo="Tributos no preço"
          valor={formatCurrency(resultado.tributosValor)}
          icone={<TrendingUp className="h-4 w-4" />}
          linhaDetalhe={`+ ${formatCurrency(resultado.custosIndiretosValor)} de administração`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialCard
          titulo="Preço de equilíbrio"
          valor={resultado.precoEquilibrio === null ? 'N/A' : formatCurrency(resultado.precoEquilibrio)}
          icone={<Wallet className="h-4 w-4" />}
          linhaDetalhe="resultado econômico = zero (sem lucro)"
        />
        <FinancialCard
          titulo="Markup sobre o custo"
          valor={resultado.markupPercent === null ? 'N/A' : formatPercent(resultado.markupPercent)}
          icone={<Percent className="h-4 w-4" />}
          linhaDetalhe="lucro ÷ custo total — não confundir com margem"
        />
        <FinancialCard
          titulo="Valor mensal do contrato"
          valor={resultado.valorMensal === null ? 'N/A' : formatCurrency(resultado.valorMensal)}
          icone={<Wallet className="h-4 w-4" />}
          linhaDetalhe={
            resultado.valorAnual === null
              ? undefined
              : `${formatCurrency(resultado.valorAnual)}/ano · ${resultado.valorGlobalContrato === null ? 'N/A' : formatCurrency(resultado.valorGlobalContrato)} total`
          }
        />
        <FinancialCard
          titulo="Valor por unidade/equipamento"
          valor={resultado.valorPorUnidade === null ? 'N/A' : formatCurrency(resultado.valorPorUnidade)}
          icone={<Wallet className="h-4 w-4" />}
          linhaDetalhe={resultado.valorPorUnidade === null ? 'informe a quantidade em Dados do processo' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialCard titulo="Investimento inicial" valor={formatCurrency(resultado.investimentoInicial)} icone={<PiggyBank className="h-4 w-4" />} linhaDetalhe="equipamentos + veículos + capital de giro" />
        <FinancialCard titulo="Capital de giro necessário" valor={formatCurrency(resultado.capitalGiroNecessario)} icone={<PiggyBank className="h-4 w-4" />} />
        <FinancialCard
          titulo="ROI"
          valor={resultado.roiTotalPercent === null ? 'N/A' : formatPercent(resultado.roiTotalPercent)}
          icone={<TrendingUp className="h-4 w-4" />}
          linhaDetalhe={resultado.roiAnualPercent === null ? undefined : `${formatPercent(resultado.roiAnualPercent)}/ano`}
        />
        <FinancialCard
          titulo="Payback"
          valor={resultado.paybackMeses === null ? 'N/A' : `${resultado.paybackMeses.toFixed(1)} meses`}
          icone={<Clock className="h-4 w-4" />}
        />
      </div>

      {comparacaoReferencia && (
        <Card className={comparacaoReferencia.viavel ? 'border-positive-200 bg-positive-50/40' : 'border-negative-200 bg-negative-50/40'}>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {comparacaoReferencia.viavel ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-positive-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-negative-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-graphite-900">
                  {comparacaoReferencia.viavel ? 'Vale a pena no preço de referência informado' : 'Não vale a pena no preço de referência informado'}
                </p>
                <p className="mt-0.5 text-sm text-graphite-600">
                  Com preço de {formatCurrency(comparacaoReferencia.precoReferencia)}, a margem real seria de{' '}
                  <strong>{formatPercent(comparacaoReferencia.margemRealPct)}</strong> (lucro de {formatCurrency(comparacaoReferencia.lucroReal)}).
                </p>
              </div>
            </div>
            {comparacaoReferencia.diferenca !== null && (
              <div className="text-right">
                <p className="text-xs font-medium text-graphite-500">{comparacaoReferencia.diferenca >= 0 ? 'Folga sobre o preço mínimo' : 'Falta para o preço mínimo'}</p>
                <p className={comparacaoReferencia.diferenca >= 0 ? 'text-lg font-semibold text-positive-700' : 'text-lg font-semibold text-negative-700'}>
                  {formatCurrency(Math.abs(comparacaoReferencia.diferenca))}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {temConferenciaDfp && (
        <Card>
          <div className="border-b border-graphite-200 p-4">
            <h3 className="text-sm font-semibold text-graphite-900">Conferência com o DFP oficial</h3>
            <p className="text-xs text-graphite-500">
              Réplica exata do "Total dos Serviços" da planilha-modelo — use para conferir se esta simulação bate com o valor já entregue ao órgão.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-graphite-500">Receita anual informada</p>
              <p className="text-sm font-medium text-graphite-900">{resultado.receitaAnualInformada === null ? 'N/A' : formatCurrency(resultado.receitaAnualInformada)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Total dos Serviços (DFP)</p>
              <p className="text-sm font-semibold text-graphite-900">{resultado.totalServicosDfp === null ? 'N/A' : formatCurrency(resultado.totalServicosDfp)}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-500">Resultado do contrato</p>
              <p className={resultado.resultadoContratoInformado !== null && resultado.resultadoContratoInformado < 0 ? 'text-sm font-semibold text-negative-600' : 'text-sm font-semibold text-positive-700'}>
                {resultado.resultadoContratoInformado === null ? 'N/A' : formatCurrency(resultado.resultadoContratoInformado)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {resultado.dre.length > 0 && (
        <Card>
          <div className="border-b border-graphite-200 p-4">
            <h3 className="text-sm font-semibold text-graphite-900">DRE estimado {contratoFechado ? '(ano 1)' : ''}</h3>
            <p className="text-xs text-graphite-500">
              {contratoFechado
                ? 'Ano 1 do contrato — faturamento e custos anualizados. Anos seguintes entram na simulação plurianual à parte.'
                : 'Como o preço mínimo se decompõe — quanto cada item consome do faturamento.'}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-graphite-100">
            {resultado.dre.map((linha) => (
              <div key={linha.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className={linha.label.startsWith('(=)') ? 'font-semibold text-graphite-900' : 'text-graphite-600'}>{linha.label}</span>
                <div className="flex items-center gap-3">
                  <span className="w-14 text-right text-xs text-graphite-400">{formatPercent(linha.percentualDaReceita)}</span>
                  <span className={linha.label.startsWith('(=)') ? 'w-32 text-right font-semibold text-graphite-900' : 'w-32 text-right text-graphite-700'}>
                    {formatCurrency(linha.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
