import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatPercent } from '@/utils/format';
import { AJUSTE_BASE, AJUSTE_CONSERVADOR, AJUSTE_OTIMISTA, calcularCenarios, type AjusteCenario } from '@/utils/formacaoPrecoAnalises';
import type { RascunhoFormacaoPreco } from '@/types';

interface PainelCenariosProps {
  rascunho: RascunhoFormacaoPreco;
}

function LinhaAjuste({ titulo, ajuste, onChange }: { titulo: string; ajuste: AjusteCenario; onChange: (a: AjusteCenario) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_100px_100px_100px_110px]">
      <span className="col-span-2 self-center text-xs font-semibold text-graphite-700 sm:col-span-1">{titulo}</span>
      <label className="flex flex-col gap-0.5 text-[11px] text-graphite-500">
        Materiais (%)
        <Input type="number" step="1" value={ajuste.materiaisPercent * 100} onChange={(e) => onChange({ ...ajuste, materiaisPercent: Number(e.target.value) / 100 })} />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] text-graphite-500">
        Combustível (%)
        <Input type="number" step="1" value={ajuste.combustivelPercent * 100} onChange={(e) => onChange({ ...ajuste, combustivelPercent: Number(e.target.value) / 100 })} />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] text-graphite-500">
        Manutenção (%)
        <Input type="number" step="1" value={ajuste.manutencaoPercent * 100} onChange={(e) => onChange({ ...ajuste, manutencaoPercent: Number(e.target.value) / 100 })} />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] text-graphite-500">
        Lucro (p.p.)
        <Input type="number" step="0.5" value={ajuste.lucroPercentPontos * 100} onChange={(e) => onChange({ ...ajuste, lucroPercentPontos: Number(e.target.value) / 100 })} />
      </label>
    </div>
  );
}

/** Cenários calculados ao vivo — os percentuais de ajuste são editáveis, sem "melhor/pior" pré-julgado, só os números. */
export function PainelCenarios({ rascunho }: PainelCenariosProps) {
  const [conservador, setConservador] = useState(AJUSTE_CONSERVADOR);
  const [otimista, setOtimista] = useState(AJUSTE_OTIMISTA);

  const cenarios = calcularCenarios(rascunho, { base: AJUSTE_BASE, conservador, otimista });

  return (
    <Card>
      <CardHeader><CardTitle>Cenários (base / conservador / otimista)</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 border-b border-graphite-100 pb-4">
          <LinhaAjuste titulo="Conservador" ajuste={conservador} onChange={setConservador} />
          <LinhaAjuste titulo="Otimista" ajuste={otimista} onChange={setOtimista} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium text-graphite-400">
                <th className="py-1.5">Cenário</th>
                <th className="py-1.5 text-right">Custo total</th>
                <th className="py-1.5 text-right">Preço mínimo</th>
                <th className="py-1.5 text-right">Lucro</th>
                <th className="py-1.5 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-100">
              {cenarios.map((c) => (
                <tr key={c.nome}>
                  <td className="py-1.5 font-medium text-graphite-800">{c.nome}</td>
                  <td className="py-1.5 text-right text-graphite-700">{formatCurrency(c.resultado.totalCustosComContingencia)}</td>
                  <td className="py-1.5 text-right font-medium text-graphite-900">{c.resultado.precoMinimo === null ? 'N/A' : formatCurrency(c.resultado.precoMinimo)}</td>
                  <td className="py-1.5 text-right text-graphite-700">{formatCurrency(c.resultado.lucroValor)}</td>
                  <td className="py-1.5 text-right text-graphite-700">
                    {c.resultado.precoMinimo ? formatPercent((c.resultado.lucroValor / c.resultado.precoMinimo) * 100) : 'N/A'}
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
