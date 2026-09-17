import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import { simularFluxoCaixa } from '@/utils/formacaoPrecoAnalises';
import type { RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

interface FluxoCaixaProjetadoProps {
  rascunho: RascunhoFormacaoPreco;
  resultado: ResultadoFormacaoPreco;
}

export function FluxoCaixaProjetado({ rascunho, resultado }: FluxoCaixaProjetadoProps) {
  const fluxo = simularFluxoCaixa(rascunho, resultado);

  return (
    <Card>
      <CardHeader><CardTitle>Fluxo de caixa projetado</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-graphite-500">
          Diferente do resultado econômico (DRE, por competência): aqui a receita entra deslocada pelo prazo de recebimento e os custos saem deslocados pelo prazo de
          pagamento — mostra quanto caixa a empresa precisa segurar antes de o contrato "se pagar".
        </p>

        {fluxo.necessidadeMaximaCaixa > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-negative-50 p-3 text-sm text-negative-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Necessidade máxima de caixa: <strong>{formatCurrency(fluxo.necessidadeMaximaCaixa)}</strong>
              {fluxo.mesDeMaiorNecessidade !== null && <> — no mês {fluxo.mesDeMaiorNecessidade}</>}
            </span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-[11px] font-medium text-graphite-400">
                <th className="py-1.5">Mês</th>
                <th className="py-1.5 text-right">Entradas</th>
                <th className="py-1.5 text-right">Saídas</th>
                <th className="py-1.5 text-right">Saldo do mês</th>
                <th className="py-1.5 text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-100">
              {fluxo.meses.map((m) => (
                <tr key={m.mes}>
                  <td className="py-1.5 text-graphite-700">{m.mes === 0 ? 'Investimento inicial' : `Mês ${m.mes}`}</td>
                  <td className="py-1.5 text-right text-positive-700">{m.entradas > 0 ? formatCurrency(m.entradas) : '—'}</td>
                  <td className="py-1.5 text-right text-negative-700">{m.saidas > 0 ? formatCurrency(m.saidas) : '—'}</td>
                  <td className="py-1.5 text-right text-graphite-700">{formatCurrency(m.saldoMensal)}</td>
                  <td className={m.saldoAcumulado < 0 ? 'py-1.5 text-right font-medium text-negative-700' : 'py-1.5 text-right font-medium text-graphite-900'}>
                    {formatCurrency(m.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
