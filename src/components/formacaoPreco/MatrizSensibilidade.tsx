import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import { calcularMatrizSensibilidade } from '@/utils/formacaoPrecoAnalises';
import type { RascunhoFormacaoPreco } from '@/types';

interface MatrizSensibilidadeProps {
  rascunho: RascunhoFormacaoPreco;
}

/** Impacto de variações de custo no preço e no lucro — não altera a simulação, é só leitura. */
export function MatrizSensibilidade({ rascunho }: MatrizSensibilidadeProps) {
  const linhas = calcularMatrizSensibilidade(rascunho);

  return (
    <Card>
      <CardHeader><CardTitle>Análise de sensibilidade</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-xs text-graphite-500">Quanto o preço mínimo e o lucro mudam se materiais, combustível ou manutenção corretiva variarem.</p>
        {linhas.map((linha) => (
          <div key={linha.categoria} className="overflow-x-auto">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-500">{linha.categoria}</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium text-graphite-400">
                  <th className="py-1.5">Variação</th>
                  <th className="py-1.5 text-right">Custo total</th>
                  <th className="py-1.5 text-right">Preço mínimo</th>
                  <th className="py-1.5 text-right">Lucro</th>
                  <th className="py-1.5 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-100">
                {linha.pontos.map((p) => (
                  <tr key={p.variacaoPercent} className={p.variacaoPercent === 0 ? 'bg-graphite-50/60' : undefined}>
                    <td className="py-1.5 text-graphite-700">{p.variacaoPercent === 0 ? 'Atual' : `${p.variacaoPercent > 0 ? '+' : ''}${p.variacaoPercent}%`}</td>
                    <td className="py-1.5 text-right text-graphite-700">{formatCurrency(p.custoTotal)}</td>
                    <td className="py-1.5 text-right font-medium text-graphite-900">{p.preco === null ? 'N/A' : formatCurrency(p.preco)}</td>
                    <td className="py-1.5 text-right text-graphite-700">{formatCurrency(p.lucro)}</td>
                    <td className="py-1.5 text-right text-graphite-700">{p.margemPercent === null ? 'N/A' : `${p.margemPercent.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
