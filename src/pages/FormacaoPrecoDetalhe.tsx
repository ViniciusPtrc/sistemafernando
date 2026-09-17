import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/ErrorState';
import { LinhaCustoTable } from '@/components/formacaoPreco/LinhaCustoTable';
import { LinhaMaoDeObraTable } from '@/components/formacaoPreco/LinhaMaoDeObraTable';
import { LinhaAtivoTable } from '@/components/formacaoPreco/LinhaAtivoTable';
import { LinhaCombustivelTable } from '@/components/formacaoPreco/LinhaCombustivelTable';
import { LinhaTributoTable } from '@/components/formacaoPreco/LinhaTributoTable';
import { PercentField } from '@/components/formacaoPreco/PercentField';
import { ResumoResultado } from '@/components/formacaoPreco/ResumoResultado';
import { CapitalRiscoInvestimento } from '@/components/formacaoPreco/CapitalRiscoInvestimento';
import { SimulacaoReajuste } from '@/components/formacaoPreco/SimulacaoReajuste';
import { FluxoCaixaProjetado } from '@/components/formacaoPreco/FluxoCaixaProjetado';
import { PainelCenarios } from '@/components/formacaoPreco/PainelCenarios';
import { MatrizSensibilidade } from '@/components/formacaoPreco/MatrizSensibilidade';
import { PainelValidacoes } from '@/components/formacaoPreco/PainelValidacoes';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import { getFormacaoPreco, criarFormacaoPreco, atualizarFormacaoPreco } from '@/services/formacaoPrecoService';
import { calcularResultado, formacaoPrecoVazia } from '@/utils/formacaoPrecoCalculo';
import { formatCurrency } from '@/utils/format';
import type { BlocoMaoDeObra, CapitalGiro, RascunhoFormacaoPreco, RegimeTributario } from '@/types';

const REGIME_OPCOES: { value: RegimeTributario; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

type Aba = 'custos' | 'capital' | 'simulacoes' | 'validacoes';
const ABAS: { value: Aba; label: string }[] = [
  { value: 'custos', label: 'Composição de custos' },
  { value: 'capital', label: 'Capital, risco e investimento' },
  { value: 'simulacoes', label: 'Simulações' },
  { value: 'validacoes', label: 'Validações' },
];

export default function FormacaoPrecoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, selectedCompany } = useCompany();
  const { notificar } = useToast();
  const novo = !id || id === 'nova';

  const [rascunho, setRascunho] = useState<RascunhoFormacaoPreco | null>(null);
  const [carregando, setCarregando] = useState(!novo);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<Aba>('custos');

  useEffect(() => {
    if (novo) {
      const companyIdPadrao = selectedCompany && selectedCompany !== 'all' ? selectedCompany : companies[0]?.id ?? '';
      setRascunho(formacaoPrecoVazia(companyIdPadrao));
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(false);
    getFormacaoPreco(id)
      .then((f) => {
        const { id: _id, criadoEm: _c, atualizadoEm: _a, resultado: _r, ...resto } = f;
        setRascunho(resto);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [id, novo, selectedCompany, companies]);

  const resultado = useMemo(() => (rascunho ? calcularResultado(rascunho) : null), [rascunho]);

  const atualizar = <K extends keyof RascunhoFormacaoPreco>(campo: K, valor: RascunhoFormacaoPreco[K]) => {
    setRascunho((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  };

  const atualizarMaoDeObra = (campo: 'maoDeObraDireta' | 'maoDeObraIndireta', patch: Partial<BlocoMaoDeObra>) => {
    setRascunho((atual) => (atual ? { ...atual, [campo]: { ...atual[campo], ...patch } } : atual));
  };

  const atualizarCapitalGiro = (patch: Partial<CapitalGiro>) => {
    setRascunho((atual) => (atual ? { ...atual, capitalGiro: { ...atual.capitalGiro, ...patch } } : atual));
  };

  const salvar = async () => {
    if (!rascunho) return;
    if (!rascunho.companyId) {
      notificar({ titulo: 'Selecione uma empresa', descricao: 'Escolha a empresa dona desta simulação.', variante: 'erro' });
      return;
    }
    if (!rascunho.nome.trim()) {
      notificar({ titulo: 'Dê um nome à simulação', descricao: 'Ex.: "SMED 2026 - Ano 1".', variante: 'erro' });
      return;
    }
    setSalvando(true);
    try {
      const salvo = novo ? await criarFormacaoPreco(rascunho) : await atualizarFormacaoPreco(id!, rascunho);
      notificar({ titulo: 'Simulação salva', descricao: salvo.nome, variante: 'sucesso' });
      if (novo) navigate(`/formacao-preco/${salvo.id}`, { replace: true });
    } catch (e) {
      notificar({ titulo: 'Não foi possível salvar', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  if (erro) return <ErrorState onTentarNovamente={() => setCarregando((c) => !c)} />;
  if (carregando || !rascunho || !resultado) {
    return <div className="h-96 animate-pulse rounded-xl bg-graphite-100" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/formacao-preco')} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          titulo={novo ? 'Nova simulação' : rascunho.nome || 'Simulação'}
          subtitulo="Formação de preço: custos diretos + indiretos + lucro + tributos."
          acoes={<Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>}
        />
      </div>

      <ResumoResultado resultado={resultado} lucroPercentAlvo={rascunho.lucroPercent} />

      <div className="flex flex-wrap gap-1 border-b border-graphite-200">
        {ABAS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setAba(item.value)}
            className={
              aba === item.value
                ? 'border-b-2 border-graphite-900 px-3 py-2 text-sm font-semibold text-graphite-900'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-graphite-500 hover:text-graphite-700'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba === 'custos' && (
        <>
      <Card>
        <CardHeader><CardTitle>Dados do processo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Nome da simulação *
            <Input value={rascunho.nome} onChange={(e) => atualizar('nome', e.target.value)} placeholder="SMED 2026 - Ano 1" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Empresa *
            <Select opcoes={companies.map((c) => ({ value: c.id, label: c.name }))} value={rascunho.companyId} onChange={(e) => atualizar('companyId', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Órgão / cliente
            <Input value={rascunho.orgao} onChange={(e) => atualizar('orgao', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Nº do pregão/processo
            <Input value={rascunho.numeroPregao} onChange={(e) => atualizar('numeroPregao', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500 sm:col-span-2">
            Objeto
            <Input value={rascunho.objeto} onChange={(e) => atualizar('objeto', e.target.value)} placeholder="Descrição do objeto da contratação" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Regime tributário
            <Select opcoes={REGIME_OPCOES} value={rascunho.regimeTributario} onChange={(e) => atualizar('regimeTributario', e.target.value as RegimeTributario)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Duração do contrato (meses)
            <Input type="number" min={1} value={rascunho.mesesContrato} onChange={(e) => atualizar('mesesContrato', Number(e.target.value) || 12)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Jornada integral de referência (h/dia)
            <Input type="number" min={0.1} step="0.1" value={rascunho.jornadaIntegralHorasDia} onChange={(e) => atualizar('jornadaIntegralHorasDia', Number(e.target.value) || 8)} />
            <span className="text-[11px] font-normal text-graphite-400">Usada para ratear o salário-base pela dedicação parcial ao contrato (ex.: CCT com jornada de 8,4h/dia).</span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Quantidade de itens/equipamentos atendidos (opcional)
            <Input
              type="number"
              min={0}
              value={rascunho.quantidadeUnidades ?? ''}
              onChange={(e) => atualizar('quantidadeUnidades', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Ex.: 597"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.1.1 Mão de obra direta</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-graphite-500">
            Salário-base é o valor de tempo integral (jornada definida acima em "Dados do processo"). "Dedicação (h/dia)" rateia esse valor proporcionalmente — ex.:
            metade da jornada = 50% do salário-base entra no custo do contrato.
          </p>
          <LinhaMaoDeObraTable
            itens={rascunho.maoDeObraDireta.itens}
            onChange={(itens) => atualizarMaoDeObra('maoDeObraDireta', { itens })}
            jornadaIntegralHorasDia={rascunho.jornadaIntegralHorasDia}
          />
          <div className="grid grid-cols-2 gap-3 border-t border-graphite-100 pt-4 sm:grid-cols-4">
            <PercentField
              label="Encargos sociais"
              value={rascunho.maoDeObraDireta.encargosSociaisPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraDireta', { encargosSociaisPercent: v })}
              valorCalculado={resultado.maoDeObra.direta.encargosSociaisValor}
            />
            <PercentField
              label="Horas extras"
              value={rascunho.maoDeObraDireta.horaExtraPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraDireta', { horaExtraPercent: v })}
              valorCalculado={resultado.maoDeObra.direta.horaExtraValor}
            />
            <PercentField
              label="Periculosidade"
              value={rascunho.maoDeObraDireta.periculosidadePercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraDireta', { periculosidadePercent: v })}
              valorCalculado={resultado.maoDeObra.direta.periculosidadeValor}
            />
            <PercentField
              label="Outros adicionais"
              value={rascunho.maoDeObraDireta.outrosAdicionaisPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraDireta', { outrosAdicionaisPercent: v })}
              valorCalculado={resultado.maoDeObra.direta.outrosAdicionaisValor}
            />
          </div>
          <p className="text-right text-sm text-graphite-600">
            Subtotal (I): {formatCurrency(resultado.maoDeObra.direta.subtotal)} · Total mão de obra direta: <strong className="text-graphite-900">{formatCurrency(resultado.maoDeObra.direta.total)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.1.2 Mão de obra indireta</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LinhaMaoDeObraTable
            itens={rascunho.maoDeObraIndireta.itens}
            onChange={(itens) => atualizarMaoDeObra('maoDeObraIndireta', { itens })}
            jornadaIntegralHorasDia={rascunho.jornadaIntegralHorasDia}
          />
          <div className="grid grid-cols-2 gap-3 border-t border-graphite-100 pt-4 sm:grid-cols-4">
            <PercentField
              label="Encargos sociais"
              value={rascunho.maoDeObraIndireta.encargosSociaisPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraIndireta', { encargosSociaisPercent: v })}
              valorCalculado={resultado.maoDeObra.indireta.encargosSociaisValor}
            />
            <PercentField
              label="Horas extras"
              value={rascunho.maoDeObraIndireta.horaExtraPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraIndireta', { horaExtraPercent: v })}
              valorCalculado={resultado.maoDeObra.indireta.horaExtraValor}
            />
            <PercentField
              label="Periculosidade"
              value={rascunho.maoDeObraIndireta.periculosidadePercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraIndireta', { periculosidadePercent: v })}
              valorCalculado={resultado.maoDeObra.indireta.periculosidadeValor}
            />
            <PercentField
              label="Outros adicionais"
              value={rascunho.maoDeObraIndireta.outrosAdicionaisPercent}
              onChange={(v) => atualizarMaoDeObra('maoDeObraIndireta', { outrosAdicionaisPercent: v })}
              valorCalculado={resultado.maoDeObra.indireta.outrosAdicionaisValor}
            />
          </div>
          <p className="text-right text-sm text-graphite-600">
            Subtotal (I): {formatCurrency(resultado.maoDeObra.indireta.subtotal)} · Total mão de obra indireta: <strong className="text-graphite-900">{formatCurrency(resultado.maoDeObra.indireta.total)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.1.3 Assistência médica</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-graphite-500">Rastreada para documentação, mas não entra no total de mão-de-obra (mesma regra da planilha-modelo do DFP).</p>
          <LinhaCustoTable
            itens={rascunho.assistenciaMedica.itens}
            onChange={(itens) => atualizar('assistenciaMedica', { itens })}
            rotuloVezesPorAno="Meses"
            rotuloValorUnitario="Custo unit. mensal (R$)"
            rotuloBotaoAdicionar="Adicionar item"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.1.4 Despesa moradia</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-graphite-500">Rastreada para documentação, mas não entra no total de mão-de-obra (mesma regra da planilha-modelo do DFP).</p>
          <LinhaCustoTable
            itens={rascunho.despesaMoradia.itens}
            onChange={(itens) => atualizar('despesaMoradia', { itens })}
            rotuloVezesPorAno="Meses"
            rotuloValorUnitario="Custo unit. mensal (R$)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Uniforme e EPI</CardTitle></CardHeader>
        <CardContent>
          <LinhaCustoTable
            itens={rascunho.uniformeEpi.itens}
            onChange={(itens) => atualizar('uniformeEpi', { itens })}
            rotuloQuantidade="Usuários"
            rotuloVezesPorAno="Peças/usuário"
            rotuloValorUnitario="Custo unit. (R$)"
            vezesPorAnoPadrao={1}
            rotuloBotaoAdicionar="Adicionar peça"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alimentação</CardTitle></CardHeader>
        <CardContent>
          <LinhaCustoTable
            itens={rascunho.alimentacao.itens}
            onChange={(itens) => atualizar('alimentacao', { itens })}
            rotuloVezesPorAno="Meses"
            rotuloValorUnitario="Custo unit. (R$)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.1.7 Outros custos relacionados com mão-de-obra</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-xs text-graphite-500">Rastreados para documentação, mas não entram no total de mão-de-obra (mesma regra da planilha-modelo do DFP).</p>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Despesas médicas (canteiro/campo)</h4>
            <LinhaCustoTable
              itens={rascunho.outrosCustosMaoDeObra.despesasMedicas.itens}
              onChange={(itens) => atualizar('outrosCustosMaoDeObra', { ...rascunho.outrosCustosMaoDeObra, despesasMedicas: { itens } })}
              rotuloVezesPorAno="Período (meses)"
              rotuloValorUnitario="Custo unit. mensal (R$)"
            />
          </div>
          <div className="border-t border-graphite-100 pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Subcontratações</h4>
            <LinhaCustoTable
              itens={rascunho.outrosCustosMaoDeObra.subcontratacoes.itens}
              onChange={(itens) => atualizar('outrosCustosMaoDeObra', { ...rascunho.outrosCustosMaoDeObra, subcontratacoes: { itens } })}
              rotuloVezesPorAno="Meses"
              rotuloValorUnitario="Salário/mês (R$)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.2.1 Materiais de aplicação</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-graphite-500">Consumo recorrente do serviço (ex.: peças de manutenção preventiva/corretiva). "Vezes/ano" = 12 para mensal, ou 1 para anual.</p>
          <LinhaCustoTable itens={rascunho.materiaisAplicacao.itens} onChange={(itens) => atualizar('materiaisAplicacao', { itens })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.2.2 Outros materiais</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-graphite-500">Normalmente um valor fechado vindo de cotação externa (ex.: kit de instalação) — use quantidade 1 e vezes/ano 1.</p>
          <LinhaCustoTable itens={rascunho.outrosMateriais.itens} onChange={(itens) => atualizar('outrosMateriais', { itens })} vezesPorAnoPadrao={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.3 Equipamentos de aplicação direta</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LinhaAtivoTable itens={rascunho.equipamentos.itens} onChange={(itens) => atualizar('equipamentos', { ...rascunho.equipamentos, itens })} />
          <div className="grid grid-cols-2 gap-3 border-t border-graphite-100 pt-4 sm:grid-cols-4">
            <PercentField
              label="Valor residual"
              value={rascunho.equipamentos.valorResidualPercent}
              onChange={(v) => atualizar('equipamentos', { ...rascunho.equipamentos, valorResidualPercent: v })}
              hint="% do custo de aquisição ao fim do contrato (ex.: 85% = 15% de depreciação)"
            />
            <PercentField
              label="Taxa mensal de capital"
              value={rascunho.equipamentos.capitalTaxaMensalPercent}
              onChange={(v) => atualizar('equipamentos', { ...rascunho.equipamentos, capitalTaxaMensalPercent: v })}
              hint="ao mês, sobre o capital imobilizado"
            />
            <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
              Período (meses)
              <Input
                type="number"
                min={0}
                value={rascunho.equipamentos.capitalPeriodoMeses}
                onChange={(e) => atualizar('equipamentos', { ...rascunho.equipamentos, capitalPeriodoMeses: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
          <p className="text-right text-sm text-graphite-600">
            Depreciação + remuneração de capital: <strong className="text-graphite-900">{formatCurrency(resultado.equipamentos.total)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1.4 Veículos</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Depreciação</h4>
            <LinhaAtivoTable itens={rascunho.veiculos.itensDepreciacao} onChange={(itens) => atualizar('veiculos', { ...rascunho.veiculos, itensDepreciacao: itens })} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-graphite-100 pt-4 sm:grid-cols-4">
              <PercentField
                label="Valor residual"
                value={rascunho.veiculos.valorResidualPercent}
                onChange={(v) => atualizar('veiculos', { ...rascunho.veiculos, valorResidualPercent: v })}
              />
              <PercentField
                label="Taxa mensal de capital"
                value={rascunho.veiculos.capitalTaxaMensalPercent}
                onChange={(v) => atualizar('veiculos', { ...rascunho.veiculos, capitalTaxaMensalPercent: v })}
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
                Período (meses)
                <Input
                  type="number"
                  min={0}
                  value={rascunho.veiculos.capitalPeriodoMeses}
                  onChange={(e) => atualizar('veiculos', { ...rascunho.veiculos, capitalPeriodoMeses: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-graphite-100 pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Manutenção</h4>
            <LinhaCustoTable
              itens={rascunho.veiculos.itensManutencao}
              onChange={(itens) => atualizar('veiculos', { ...rascunho.veiculos, itensManutencao: itens })}
              rotuloVezesPorAno="Vezes/ano"
              vezesPorAnoPadrao={1}
            />
          </div>

          <div className="border-t border-graphite-100 pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Combustível</h4>
            <LinhaCombustivelTable itens={rascunho.veiculos.itensCombustivel} onChange={(itens) => atualizar('veiculos', { ...rascunho.veiculos, itensCombustivel: itens })} />
          </div>

          <p className="text-right text-sm text-graphite-600">
            Total de veículos: <strong className="text-graphite-900">{formatCurrency(resultado.veiculos.total)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Custos indiretos, lucro e tributos</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-graphite-500">
            Percentuais aplicados sobre o <strong>preço final</strong> (não sobre o custo) — é assim que o preço mínimo é calculado "por dentro", igual ao DFP oficial.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PercentField label="Custos indiretos (administração)" value={rascunho.custosIndiretosPercent} onChange={(v) => atualizar('custosIndiretosPercent', v)} />
            <PercentField label="Lucro-alvo" value={rascunho.lucroPercent} onChange={(v) => atualizar('lucroPercent', v)} />
            <PercentField
              label="Tributos sobre o custo"
              value={rascunho.tributosSobreCustoPercent}
              onChange={(v) => atualizar('tributosSobreCustoPercent', v)}
              hint="ex.: Simples Nacional, quando aplicável"
            />
            <PercentField
              label="Tributos sobre a receita"
              value={rascunho.tributosSobreReceitaPercent}
              onChange={(v) => atualizar('tributosSobreReceitaPercent', v)}
              hint="ISS + PIS + COFINS + CPRB…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Composição dos tributos (documentação/auditoria)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-graphite-500">
            Detalhe aqui cada tributo (ISS, PIS, COFINS, CPRB, Simples Nacional…) para deixar rastreável de onde vêm os percentuais acima. Isto é só documentação —
            quem entra na conta do preço continua sendo os campos "Tributos sobre o custo/receita" logo acima.
          </p>
          <LinhaTributoTable
            itens={rascunho.tributos.itens}
            onChange={(itens) => atualizar('tributos', { itens })}
            tributosPercentTotal={rascunho.tributosSobreCustoPercent + rascunho.tributosSobreReceitaPercent}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Comparar com preço de referência do edital</CardTitle></CardHeader>
        <CardContent>
          <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-graphite-500">
            Preço-teto / referência (R$) — opcional
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rascunho.precoReferencia ?? ''}
              onChange={(e) => atualizar('precoReferencia', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Valor do edital/pregão"
            />
            <span className="text-[11px] font-normal text-graphite-400">Informe para ver se o contrato vale a pena no preço real do mercado, não só na margem-alvo.</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conferência com o DFP oficial</CardTitle></CardHeader>
        <CardContent>
          <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-graphite-500">
            Receita mensal já negociada/informada (R$) — opcional
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rascunho.receitaMensalInformada ?? ''}
              onChange={(e) => atualizar('receitaMensalInformada', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Ex.: 192348.45"
            />
            <span className="text-[11px] font-normal text-graphite-400">
              Reproduz a fórmula exata da planilha-modelo do DFP: o tributo sobre a receita é calculado sobre este valor × 12 (não sobre o preço mínimo acima), para
              conferir se esta simulação bate com o "Total dos Serviços" já entregue ao órgão.
            </span>
          </label>
        </CardContent>
      </Card>
        </>
      )}

      {aba === 'capital' && (
        <CapitalRiscoInvestimento
          contingenciaPercent={rascunho.contingenciaPercent}
          capitalGiro={rascunho.capitalGiro}
          resultado={resultado}
          onChangeContingencia={(v) => atualizar('contingenciaPercent', v)}
          onChangeCapitalGiro={atualizarCapitalGiro}
        />
      )}

      {aba === 'simulacoes' && (
        <div className="flex flex-col gap-6">
          <SimulacaoReajuste rascunho={rascunho} resultado={resultado} />
          <FluxoCaixaProjetado rascunho={rascunho} resultado={resultado} />
          <PainelCenarios rascunho={rascunho} />
          <MatrizSensibilidade rascunho={rascunho} />
        </div>
      )}

      {aba === 'validacoes' && <PainelValidacoes rascunho={rascunho} resultado={resultado} />}
    </div>
  );
}
