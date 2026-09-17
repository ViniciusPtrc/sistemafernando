import { calcularResultado } from './formacaoPrecoCalculo';
import type { LinhaCombustivel, LinhaCusto, LinhaMaoDeObra, RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

/**
 * Simulação plurianual (100% cliente, não persiste): projeta os anos seguintes do MESMO
 * contrato a partir do ano 1 (o rascunho salvo, nunca alterado) aplicando reajustes por
 * categoria — sem exigir que o usuário refaça a entrada de dados a cada ano. Equipamentos
 * e depreciação de veículos ficam congelados (sem novo investimento nos anos seguintes).
 */

export interface ReajusteItemAno {
  itemId: string;
  descricao: string;
  /** % de aumento aplicado ano a ano sobre o valor do ano anterior (índice 0 = ano1→ano2, índice 1 = ano2→ano3…). */
  percentPorAno: number[];
}

export interface PlanoReajustePlurianual {
  /** Quantos anos além do ano 1 simular (padrão 2 → anos 2 e 3). */
  anosAdicionais: number;
  /** Dissídio/reajuste salarial — sobre o salário-base de toda a mão de obra (direta + indireta). */
  salarioPercentPorAno: number[];
  /** Assistência médica, moradia, uniforme/EPI, alimentação e outros custos de mão de obra (despesas médicas + subcontratações). */
  beneficiosPercentPorAno: number[];
  /** Reajuste por item de materiais de aplicação (ex.: manutenção preventiva/corretiva costumam ter dinâmicas diferentes). */
  materiaisAplicacaoItens: ReajusteItemAno[];
  /** Reajuste por item de outros materiais (ex.: materiais de instalação e insumos). */
  outrosMateriaisItens: ReajusteItemAno[];
  manutencaoVeiculosPercentPorAno: number[];
  combustivelPercentPorAno: number[];
  /** Reajuste do preço/receita mensal do contrato — 0 por padrão (mantém o preço fechado do ano 1). */
  receitaPercentPorAno: number[];
}

export interface AnoProjetado {
  ano: number;
  rascunho: RascunhoFormacaoPreco;
  resultado: ResultadoFormacaoPreco;
}

function fatorAcumulado(percentPorAno: number[], ano: number): number {
  let fator = 1;
  for (let i = 0; i < ano - 1; i++) fator *= 1 + (percentPorAno[i] ?? 0);
  return fator;
}

function multiplicarValorUnitario(itens: LinhaCusto[], fator: number): LinhaCusto[] {
  return itens.map((i) => ({ ...i, valorUnitario: i.valorUnitario * fator }));
}

function multiplicarPorItem(itens: LinhaCusto[], planos: ReajusteItemAno[], ano: number): LinhaCusto[] {
  return itens.map((item) => {
    const plano = planos.find((p) => p.itemId === item.id);
    const fator = plano ? fatorAcumulado(plano.percentPorAno, ano) : 1;
    return { ...item, valorUnitario: item.valorUnitario * fator };
  });
}

function multiplicarSalario(itens: LinhaMaoDeObra[], fator: number): LinhaMaoDeObra[] {
  return itens.map((i) => ({ ...i, salarioMensal: i.salarioMensal * fator }));
}

function multiplicarPrecoLitro(itens: LinhaCombustivel[], fator: number): LinhaCombustivel[] {
  return itens.map((i) => ({ ...i, precoLitro: i.precoLitro * fator }));
}

function construirRascunhoAno(f: RascunhoFormacaoPreco, plano: PlanoReajustePlurianual, ano: number): RascunhoFormacaoPreco {
  if (ano === 1) return f;

  const fatorSalario = fatorAcumulado(plano.salarioPercentPorAno, ano);
  const fatorBeneficios = fatorAcumulado(plano.beneficiosPercentPorAno, ano);
  const fatorManutVeic = fatorAcumulado(plano.manutencaoVeiculosPercentPorAno, ano);
  const fatorCombustivel = fatorAcumulado(plano.combustivelPercentPorAno, ano);
  const fatorReceita = fatorAcumulado(plano.receitaPercentPorAno, ano);

  return {
    ...f,
    maoDeObraDireta: { ...f.maoDeObraDireta, itens: multiplicarSalario(f.maoDeObraDireta.itens, fatorSalario) },
    maoDeObraIndireta: { ...f.maoDeObraIndireta, itens: multiplicarSalario(f.maoDeObraIndireta.itens, fatorSalario) },
    assistenciaMedica: { itens: multiplicarValorUnitario(f.assistenciaMedica.itens, fatorBeneficios) },
    despesaMoradia: { itens: multiplicarValorUnitario(f.despesaMoradia.itens, fatorBeneficios) },
    uniformeEpi: { itens: multiplicarValorUnitario(f.uniformeEpi.itens, fatorBeneficios) },
    alimentacao: { itens: multiplicarValorUnitario(f.alimentacao.itens, fatorBeneficios) },
    outrosCustosMaoDeObra: {
      despesasMedicas: { itens: multiplicarValorUnitario(f.outrosCustosMaoDeObra.despesasMedicas.itens, fatorBeneficios) },
      subcontratacoes: { itens: multiplicarValorUnitario(f.outrosCustosMaoDeObra.subcontratacoes.itens, fatorBeneficios) },
    },
    materiaisAplicacao: { itens: multiplicarPorItem(f.materiaisAplicacao.itens, plano.materiaisAplicacaoItens, ano) },
    outrosMateriais: { itens: multiplicarPorItem(f.outrosMateriais.itens, plano.outrosMateriaisItens, ano) },
    veiculos: {
      ...f.veiculos,
      itensManutencao: multiplicarValorUnitario(f.veiculos.itensManutencao, fatorManutVeic),
      itensCombustivel: multiplicarPrecoLitro(f.veiculos.itensCombustivel, fatorCombustivel),
    },
    receitaMensalInformada: f.receitaMensalInformada == null ? null : f.receitaMensalInformada * fatorReceita,
  };
}

export function projetarAnos(f: RascunhoFormacaoPreco, plano: PlanoReajustePlurianual): AnoProjetado[] {
  const anos: AnoProjetado[] = [];
  for (let ano = 1; ano <= plano.anosAdicionais + 1; ano++) {
    const rascunhoAno = construirRascunhoAno(f, plano, ano);
    anos.push({ ano, rascunho: rascunhoAno, resultado: calcularResultado(rascunhoAno) });
  }
  return anos;
}

function zeros(n: number): number[] {
  return Array(n).fill(0);
}

/** Monta um plano vazio (0% em tudo), com uma linha por item já cadastrado em materiais — pronto para o usuário só preencher os percentuais. */
export function planoReajusteVazio(f: RascunhoFormacaoPreco, anosAdicionais = 2): PlanoReajustePlurianual {
  return {
    anosAdicionais,
    salarioPercentPorAno: zeros(anosAdicionais),
    beneficiosPercentPorAno: zeros(anosAdicionais),
    materiaisAplicacaoItens: f.materiaisAplicacao.itens.map((i) => ({ itemId: i.id, descricao: i.descricao || '(sem descrição)', percentPorAno: zeros(anosAdicionais) })),
    outrosMateriaisItens: f.outrosMateriais.itens.map((i) => ({ itemId: i.id, descricao: i.descricao || '(sem descrição)', percentPorAno: zeros(anosAdicionais) })),
    manutencaoVeiculosPercentPorAno: zeros(anosAdicionais),
    combustivelPercentPorAno: zeros(anosAdicionais),
    receitaPercentPorAno: zeros(anosAdicionais),
  };
}

/** Sincroniza o plano com os itens de materiais atuais do rascunho: adiciona linhas novas (0%) e mantém as já preenchidas. */
export function sincronizarPlanoComItens(plano: PlanoReajustePlurianual, f: RascunhoFormacaoPreco): PlanoReajustePlurianual {
  const sincronizar = (itens: LinhaCusto[], atuais: ReajusteItemAno[]): ReajusteItemAno[] =>
    itens.map((item) => atuais.find((a) => a.itemId === item.id) ?? { itemId: item.id, descricao: item.descricao || '(sem descrição)', percentPorAno: zeros(plano.anosAdicionais) });

  return {
    ...plano,
    materiaisAplicacaoItens: sincronizar(f.materiaisAplicacao.itens, plano.materiaisAplicacaoItens),
    outrosMateriaisItens: sincronizar(f.outrosMateriais.itens, plano.outrosMateriaisItens),
  };
}
