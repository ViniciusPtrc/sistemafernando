import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatPercent } from '@/utils/format';
import { planoReajusteVazio, projetarAnos, sincronizarPlanoComItens, type PlanoReajustePlurianual, type ReajusteItemAno } from '@/utils/formacaoPrecoProjecaoAnual';
import type { RascunhoFormacaoPreco } from '@/types';

interface SimulacaoPlurianualProps {
  rascunho: RascunhoFormacaoPreco;
}

function CampoPercentAno({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input type="number" step="0.01" value={Number((value * 100).toFixed(4))} onChange={(e) => onChange((Number(e.target.value) || 0) / 100)} className="w-20 text-right" />
      <span className="text-xs text-graphite-400">%</span>
    </div>
  );
}

function LinhaPercentPorAno({ label, valores, onChange }: { label: string; valores: number[]; onChange: (index: number, v: number) => void }) {
  return (
    <div className="grid grid-cols-[1fr_110px_110px] items-center gap-3 py-1.5 text-sm text-graphite-700">
      <span>{label}</span>
      <CampoPercentAno value={valores[0] ?? 0} onChange={(v) => onChange(0, v)} />
      <CampoPercentAno value={valores[1] ?? 0} onChange={(v) => onChange(1, v)} />
    </div>
  );
}

/**
 * Simulação plurianual: define reajustes por categoria (dissídio salarial, benefícios,
 * materiais item a item, manutenção de veículos, combustível) e projeta automaticamente
 * os anos 2 e 3 a partir do ano 1 já salvo — sem alterar os valores originais. Equipamentos
 * e depreciação de veículos ficam congelados (sem novo investimento).
 */
export function SimulacaoPlurianual({ rascunho }: SimulacaoPlurianualProps) {
  const [plano, setPlano] = useState<PlanoReajustePlurianual>(() => planoReajusteVazio(rascunho, 2));

  useEffect(() => {
    setPlano((atual) => sincronizarPlanoComItens(atual, rascunho));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho.materiaisAplicacao.itens, rascunho.outrosMateriais.itens]);

  const anos = projetarAnos(rascunho, plano);

  const atualizarPercentAno = (campo: keyof Pick<PlanoReajustePlurianual, 'salarioPercentPorAno' | 'beneficiosPercentPorAno' | 'manutencaoVeiculosPercentPorAno' | 'combustivelPercentPorAno' | 'receitaPercentPorAno'>, index: number, v: number) => {
    setPlano((atual) => {
      const novosValores = [...atual[campo]];
      novosValores[index] = v;
      return { ...atual, [campo]: novosValores };
    });
  };

  const atualizarItem = (campo: 'materiaisAplicacaoItens' | 'outrosMateriaisItens', itemId: string, index: number, v: number) => {
    setPlano((atual) => ({
      ...atual,
      [campo]: atual[campo].map((item: ReajusteItemAno) => (item.itemId === itemId ? { ...item, percentPorAno: item.percentPorAno.map((p, i) => (i === index ? v : p)) } : item)),
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Reajustes anuais (ano 2 e ano 3)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-graphite-500">
            Cada percentual é sobre o valor do <strong>ano anterior</strong> (composto, não sobre o ano 1). O ano 1 permanece exatamente como está salvo — nada aqui altera os
            dados originais. Equipamentos e depreciação de veículos ficam congelados (sem novo investimento).
          </p>

          <div className="grid grid-cols-[1fr_110px_110px] gap-3 border-b border-graphite-100 pb-1 text-[11px] font-medium text-graphite-400">
            <span>Categoria</span>
            <span className="text-right">Ano 2</span>
            <span className="text-right">Ano 3</span>
          </div>
          <div className="flex flex-col divide-y divide-graphite-100">
            <LinhaPercentPorAno label="Salário (dissídio) — mão de obra" valores={plano.salarioPercentPorAno} onChange={(i, v) => atualizarPercentAno('salarioPercentPorAno', i, v)} />
            <LinhaPercentPorAno
              label="Benefícios e outros custos de pessoal"
              valores={plano.beneficiosPercentPorAno}
              onChange={(i, v) => atualizarPercentAno('beneficiosPercentPorAno', i, v)}
            />
            <LinhaPercentPorAno
              label="Manutenção de veículos"
              valores={plano.manutencaoVeiculosPercentPorAno}
              onChange={(i, v) => atualizarPercentAno('manutencaoVeiculosPercentPorAno', i, v)}
            />
            <LinhaPercentPorAno label="Combustível" valores={plano.combustivelPercentPorAno} onChange={(i, v) => atualizarPercentAno('combustivelPercentPorAno', i, v)} />
            <LinhaPercentPorAno
              label="Preço/receita do contrato (repactuação)"
              valores={plano.receitaPercentPorAno}
              onChange={(i, v) => atualizarPercentAno('receitaPercentPorAno', i, v)}
            />
          </div>

          {plano.materiaisAplicacaoItens.length > 0 && (
            <div className="border-t border-graphite-100 pt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-graphite-400">Materiais de aplicação (item a item)</h4>
              <div className="flex flex-col divide-y divide-graphite-100">
                {plano.materiaisAplicacaoItens.map((item) => (
                  <LinhaPercentPorAno
                    key={item.itemId}
                    label={item.descricao}
                    valores={item.percentPorAno}
                    onChange={(i, v) => atualizarItem('materiaisAplicacaoItens', item.itemId, i, v)}
                  />
                ))}
              </div>
            </div>
          )}

          {plano.outrosMateriaisItens.length > 0 && (
            <div className="border-t border-graphite-100 pt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-graphite-400">Outros materiais (item a item)</h4>
              <div className="flex flex-col divide-y divide-graphite-100">
                {plano.outrosMateriaisItens.map((item) => (
                  <LinhaPercentPorAno
                    key={item.itemId}
                    label={item.descricao}
                    valores={item.percentPorAno}
                    onChange={(i, v) => atualizarItem('outrosMateriaisItens', item.itemId, i, v)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Projeção Ano 1 / Ano 2 / Ano 3</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium text-graphite-400">
                <th className="py-1.5">Item</th>
                {anos.map((a) => (
                  <th key={a.ano} className="py-1.5 text-right">Ano {a.ano}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-100">
              <tr>
                <td className="py-1.5 font-medium text-graphite-800">Faturamento (preço adotado)</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right font-medium text-graphite-900">
                    {a.resultado.precoAdotado === null ? 'N/A' : formatCurrency(a.resultado.precoAdotado)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Tributos</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.tributosValor)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Mão de obra</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.maoDeObra.total)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Materiais</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.materiais.total)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Equipamentos</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.equipamentos.total)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Veículos</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.veiculos.total)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">(-) Custos indiretos</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.custosIndiretosValor)}</td>
                ))}
              </tr>
              <tr className="bg-graphite-50">
                <td className="py-1.5 font-semibold text-graphite-900">(=) Lucro</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right font-bold text-graphite-900">{formatCurrency(a.resultado.lucroValor)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">Margem</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">
                    {a.resultado.precoAdotado ? formatPercent((a.resultado.lucroValor / a.resultado.precoAdotado) * 100) : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">
                  Investimento inicial <span className="text-[11px] text-graphite-400">(equip./veíc. só no ano 1)</span>
                </td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">{formatCurrency(a.resultado.investimentoInicial)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">ROI anual</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">
                    {a.resultado.roiAnualPercent === null ? 'N/A' : formatPercent(a.resultado.roiAnualPercent)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-graphite-600">Payback</td>
                {anos.map((a) => (
                  <td key={a.ano} className="py-1.5 text-right text-graphite-700">
                    {a.resultado.paybackMeses === null ? 'N/A' : `${a.resultado.paybackMeses.toFixed(1)} meses`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
