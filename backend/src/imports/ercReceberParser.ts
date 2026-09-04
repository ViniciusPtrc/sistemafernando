import * as XLSX from 'xlsx';

/**
 * Porta fiel de src/utils/excelContasReceberParser.ts (front-end).
 * Lê o export "Contas a Receber Anual" do ERP: uma linha por título seguida de
 * linhas de continuação (nome do cliente / histórico / situação da carteira).
 * As posições de coluna (0-indexadas) foram reverse-engineered e validadas
 * contra os totais do relatório — NÃO alterar sem revalidar.
 */

export interface RegistroContaReceberBruto {
  documento: string;
  codigoTitulo: string;
  banco: number | null;
  numeroConta: string;
  clienteNome: string;
  numeroContrato: string | null;
  situacaoCarteira: string | null;
  numeroBordo: number;
  emissao: string;
  valorBruto: number;
  vencimento: string;
  valorLiquido: number;
  dataPagamento: string | null;
  valorRecebido: number | null;
  temDesconto: boolean;
  recebido: boolean;
}

export interface ErroLinha {
  linha: number;
  motivo: string;
}

export interface TotalizadoresRelatorio {
  totalBruto: number | null;
  totalLiquido: number | null;
  totalRecebido: number | null;
  registrosImpressos: number | null;
}

export interface ResultadoParse {
  registros: RegistroContaReceberBruto[];
  erros: ErroLinha[];
  totalizadoresRelatorio: TotalizadoresRelatorio;
}

type Celula = string | number | undefined;
type LinhaPlanilha = Celula[];

const COL_TOTAL_GERAL = 18;
const COL_TOTAL_DIA = 19;
const COL_REGISTROS_IMPRESSOS_LABEL = 1;
const COL_REGISTROS_IMPRESSOS_VALOR = 7;

function isDocRow(linha: LinhaPlanilha | undefined): boolean {
  const v0 = linha?.[0];
  return typeof v0 === 'string' && v0.includes('-') && /\d/.test(v0);
}

function isLinhaTotalizadora(linha: LinhaPlanilha | undefined): boolean {
  if (!linha) return false;
  return (
    (typeof linha[COL_TOTAL_GERAL] === 'string' && (linha[COL_TOTAL_GERAL] as string).includes('Total')) ||
    (typeof linha[COL_TOTAL_DIA] === 'string' && (linha[COL_TOTAL_DIA] as string).includes('Total'))
  );
}

function primeiroNumeroEm(linha: LinhaPlanilha, indices: number[]): number | null {
  for (const i of indices) {
    if (typeof linha[i] === 'number') return linha[i] as number;
  }
  return null;
}

function extrairTotalizadoresRelatorio(matriz: LinhaPlanilha[]): TotalizadoresRelatorio {
  let totalBruto: number | null = null;
  let totalLiquido: number | null = null;
  let totalRecebido: number | null = null;
  let registrosImpressos: number | null = null;

  for (const linha of matriz) {
    if (linha[COL_TOTAL_GERAL] === 'Total Geral >>>>') {
      totalBruto = primeiroNumeroEm(linha, [23]);
      totalLiquido = primeiroNumeroEm(linha, [26, 27, 28, 29]);
      totalRecebido = primeiroNumeroEm(linha, [35]);
    }
    if (linha[COL_REGISTROS_IMPRESSOS_LABEL] === 'Registros Impressos:') {
      registrosImpressos = primeiroNumeroEm(linha, [COL_REGISTROS_IMPRESSOS_VALOR]);
    }
  }
  return { totalBruto, totalLiquido, totalRecebido, registrosImpressos };
}

function parseData(valor: Celula): string | null {
  if (typeof valor !== 'string') return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return `${ano}-${mes}-${dia}`;
}

function limparTexto(valor: Celula): string {
  return String(valor ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim();
}

function paraNumero(valor: Celula): number {
  return typeof valor === 'number' ? valor : 0;
}

function rotuloSituacao(bruto: string): string | null {
  const limpo = limparTexto(bruto);
  if (!limpo) return null;
  const maiusculo = limpo.toUpperCase();
  if (maiusculo.startsWith('CARTEIRA')) return 'Carteira Própria';
  if (maiusculo.startsWith('BANCO DO BRASIL') || maiusculo === 'BANCO DO' || maiusculo === 'BANCO') {
    return maiusculo.includes('BRASIL') ? 'Banco do Brasil' : 'Banco (não especificado)';
  }
  if (maiusculo.startsWith('BANCO ITAU') || maiusculo.startsWith('BANCO ITA')) return 'Banco Itaú';
  if (maiusculo.includes('FAT NOVO SEMGE')) return 'Faturamento SEMGE';
  if (maiusculo.includes('FAT ANTIGO SEMGE')) return 'Faturamento SEMGE (Antigo)';
  if (maiusculo.includes('CARNAVAL')) return 'Carnaval 2026';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

/** Assinatura: existe pelo menos uma linha cuja primeira célula parece "NNN-NNNNN-N". */
export function looksLikeErcReceber(buffer: Buffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer', raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matriz = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { header: 1, raw: true, defval: '' });
    let hits = 0;
    for (const linha of matriz.slice(0, 400)) {
      if (isDocRow(linha)) hits++;
      if (hits >= 3) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function parseErcReceber(buffer: Buffer): ResultadoParse {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { header: 1, raw: true, defval: '' });

  const registros: RegistroContaReceberBruto[] = [];
  const erros: ErroLinha[] = [];
  const n = matriz.length;
  let r = 0;

  while (r < n) {
    if (!isDocRow(matriz[r])) {
      r++;
      continue;
    }

    const linha = matriz[r];
    const documento = limparTexto(linha[0]);
    const emissao = parseData(linha[4]);
    const codigoTituloRaw = linha[8];
    const banco = typeof linha[11] === 'number' ? (linha[11] as number) : null;
    const numeroConta = limparTexto(linha[12]);
    const nomeParts: string[] = [String(linha[15] ?? '')];
    const historicoParts: string[] = [String(linha[17] ?? '')];
    const bordo = typeof linha[20] === 'number' ? (linha[20] as number) : 0;
    const valDoc = paraNumero(linha[23]);
    const vencData = parseData(linha[24]);
    const vencValor = paraNumero(linha[26]);
    const pagData = parseData(linha[30]);
    const pagValor = paraNumero(linha[35]);
    const des = limparTexto(linha[37]);
    const sta = limparTexto(linha[39]);

    let rr = r + 1;
    let sitRaw = '';
    let sitEncontrado = false;
    while (rr < n && !isDocRow(matriz[rr])) {
      if (isLinhaTotalizadora(matriz[rr])) break;

      const nomeCont = matriz[rr]?.[15];
      if (nomeCont) nomeParts.push(String(nomeCont));

      const histCont = matriz[rr]?.[17];
      if (typeof histCont === 'string' && histCont) {
        historicoParts.push(histCont);
        if (sitEncontrado) {
          sitRaw += ` ${histCont}`;
        } else if (histCont.includes('Sit:')) {
          sitEncontrado = true;
          sitRaw = histCont.split('Sit:')[1] ?? '';
        }
      }
      rr++;
      if (rr - r > 20) break;
    }

    const clienteNome = limparTexto(nomeParts.filter(Boolean).join(' '));
    const historicoFull = historicoParts.filter(Boolean).join(' ').split('Sit:')[0];
    const contratoMatch = /Contrato\s+(\d+)/.exec(historicoFull);
    const numeroContrato = contratoMatch ? contratoMatch[1] : null;
    const recebido = Boolean(pagData) || sta === 'B';

    if (!documento || !emissao || !vencData || !valDoc) {
      erros.push({
        linha: r + 1,
        motivo: !valDoc ? 'valor do documento não numérico ou ausente' : 'data de emissão/vencimento em formato inválido',
      });
    } else {
      registros.push({
        documento,
        codigoTitulo: typeof codigoTituloRaw === 'number' ? String(Math.trunc(codigoTituloRaw)) : limparTexto(codigoTituloRaw),
        banco,
        numeroConta,
        clienteNome,
        numeroContrato,
        situacaoCarteira: rotuloSituacao(sitRaw),
        numeroBordo: bordo,
        emissao,
        valorBruto: Math.round(valDoc * 100) / 100,
        vencimento: vencData,
        valorLiquido: Math.round(vencValor * 100) / 100,
        dataPagamento: pagData,
        valorRecebido: recebido ? Math.round(pagValor * 100) / 100 : null,
        temDesconto: des === 'S',
        recebido,
      });
    }

    r = rr;
  }

  return { registros, erros, totalizadoresRelatorio: extrairTotalizadoresRelatorio(matriz) };
}
