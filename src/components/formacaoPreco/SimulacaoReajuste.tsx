import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatPercent } from '@/utils/format';
import { simularReajuste } from '@/utils/formacaoPrecoAnalises';
import type { RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

interface SimulacaoReajusteProps {
  rascunho: RascunhoFormacaoPreco;
  resultado: ResultadoFormacaoPreco;
}

export function SimulacaoReajuste({ rascunho, resultado }: SimulacaoReajusteProps) {
  const [percentAnual, setPercentAnual] = useState(5);
  const anos = simularReajuste(rascunho, resultado, percentAnual / 100);

  return (
    <Card>
      <CardHeader><CardTitle>Simulação de reajuste anual</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-graphite-500">
          Reajuste aplicado só sobre a mão de obra (dissídio da categoria) — os demais custos ficam constantes nesta simulação. Não é um índice oficial: informe o
          percentual esperado (ex.: convenção coletiva, INPC/IPCA).
        </p>
        <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-graphite-500">
          Percentual de reajuste ao ano (%)
          <Input type="number" min={0} step="0.1" value={percentAnual} onChange={(e) => setPercentAnual(Number(e.target.value) || 0)} />
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium text-graphite-400">
                <th className="py-1.5">Ano</th>
                <th className="py-1.5 text-right">Mão de obra</th>
                <th className="py-1.5 text-right">Preço mínimo</th>
                <th className="py-1.5 text-right">Variação vs. ano 1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-100">
              {anos.map((a) => (
                <tr key={a.ano}>
                  <td className="py-1.5 text-graphite-700">Ano {a.ano}</td>
                  <td className="py-1.5 text-right text-graphite-700">{formatCurrency(a.maoDeObraTotal)}</td>
                  <td className="py-1.5 text-right font-medium text-graphite-900">{a.precoMinimo === null ? 'N/A' : formatCurrency(a.precoMinimo)}</td>
                  <td className="py-1.5 text-right text-graphite-600">{a.ano === 1 ? '—' : formatPercent(a.variacaoPercentSobreAno1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
