import * as XLSX from 'xlsx';

/**
 * Parser posicional do relatório "Contas a Pagar" do ERP antigo (mesma família
 * do `ercReceberParser`, layout diferente). Uma linha por título seguida de
 * linhas de continuação (histórico em várias linhas, terminando com "Sit:").
 * As posições de coluna (0-indexadas) foram reverse-engineered a partir do
 * arquivo real "CP 2026 1 A 4.XLS" e validadas contra os totais do relatório —
 * NÃO alterar sem revalidar.
 *
 * Colunas:
 *   0  Vencto (só na 1ª linha do dia)      4  Código Financ. (ID único do título)
 *   6  Documento (inconsistente)           7  Emissão
 *   10 Código Origem                       11 Fornecedor
 *   15 Filial                              16 Histórico (+ continuação)
 *   22 Tipo Doc                            24 Bordero
 *   27 Val. Doc. (valor original)          29 Previsto: Data (= vencimento)
 *   33 Previsto: Valor (valor devido)      41 Pagamento/Aprovado: Valor (0 se em aberto)
 *   44 Sta (1º char)                       45 Sta (2º char: "B" = baixado/pago)
 *   18 "Total Geral >>>>"                  19 "Total Dia  >>>>"
 */

export interface RegistroContaPagarBruto {
  codigoFinanceiro: string;
  documento: string;
  fornecedorNome: string;
  emissao: string | null;
  vencimento: string;
  historico: string;
  situacao: string | null;
  parcela: string | null;
  tipoDoc: number | null;
  bordero: number | null;
  filial: number | null;
  valorDocumento: number;
  valorPrevisto: number;
  valorPago: number;
  pago: boolean;
  anotacao: string | null;
}

export interface ErroLinha {
  linha: number;
  motivo: string;
}

export interface TotalizadoresPagar {
  totalDocumento: number | null;
  totalPrevisto: number | null;
  totalPago: number | null;
  registrosImpressos: number | null;
}

export interface ResultadoParsePagar {
  registros: RegistroContaPagarBruto[];
  erros: ErroLinha[];
  totalizadores: TotalizadoresPagar;
}

type Celula = string | number | boolean | Date | undefined | null;
type LinhaPlanilha = Celula[];

const COL_VENCTO = 0;
const COL_FINANC = 4;
const COL_DOCUMENTO = 6;
const COL_EMISSAO = 7;
const COL_FORNECEDOR = 11;
const COL_FILIAL = 15;
const COL_HISTORICO = 16;
const COL_TIPO = 22;
const COL_BORDERO = 24;
const COL_VALDOC = 27;
const COL_PREVISTO_DATA = 29;
const COL_PREVISTO_VALOR = 33;
const COL_PAGO_VALOR = 41;
const COL_STA2 = 45;
const COL_TOTAL_GERAL = 18;
const COL_TOTAL_DIA = 19;
const COL_ANOTACAO = 2;

function num(v: Celula): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function isDocRow(linha: LinhaPlanilha | undefined): boolean {
  if (!linha) return false;
  const financ = num(linha[COL_FINANC]);
  const valdoc = num(linha[COL_VALDOC]);
  return financ !== null && financ > 1000 && valdoc !== null && !isLinhaTotalizadora(linha);
}

function isLinhaTotalizadora(linha: LinhaPlanilha | undefined): boolean {
  if (!linha) return false;
  const a = linha[COL_TOTAL_GERAL];
  const b = linha[COL_TOTAL_DIA];
  return (
    (typeof a === 'string' && a.includes('Total')) ||
    (typeof b === 'string' && b.includes('Total'))
  );
}

function parseData(valor: Celula): string | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, '0')}-${String(valor.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof valor !== 'string') return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const d = Number(dia);
  const mo = Number(mes);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
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

/** "Sit:BANCO" -> "BANCO"; "Sit:DESPESA FIXA" -> "DESPESA FIXA". */
function extrairSituacao(historicoBruto: string): string | null {
  const idx = historicoBruto.indexOf('Sit:');
  if (idx === -1) return null;
  const s = limparTexto(historicoBruto.slice(idx + 4));
  return s || null;
}

/** "INSS 124/180" / "100/180" -> "124/180" / "100/180". */
function extrairParcela(historico: string): string | null {
  const m = /\b(\d{1,4}\/\d{1,4})\b/.exec(historico);
  return m ? m[1] : null;
}

/** Assinatura: >= 3 linhas de título posicionais + marcador "Contas a Pagar" ou "Total". */
export function looksLikeErcPagar(buffer: Buffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matriz = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { header: 1, raw: true, defval: null });
    let docRows = 0;
    let marcador = false;
    for (const linha of matriz.slice(0, 120)) {
      if (isDocRow(linha)) docRows += 1;
      for (const c of linha ?? []) {
        if (typeof c === 'string') {
          if (/contas a pagar/i.test(c)) marcador = true;
          if (/total (dia|geral)\s*>+/i.test(c)) marcador = true;
        }
      }
      if (docRows >= 3 && marcador) return true;
    }
    return docRows >= 3 && marcador;
  } catch {
    return false;
  }
}

export function parseErcPagar(buffer: Buffer): ResultadoParsePagar {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { header: 1, raw: true, defval: null });

  const registros: RegistroContaPagarBruto[] = [];
  const erros: ErroLinha[] = [];
  const n = matriz.length;
  let r = 0;
  let venctoDia: string | null = null;

  while (r < n) {
    const linha = matriz[r];

    // atualiza a data do dia quando aparece no cabeçalho de grupo
    const venctoCabecalho = parseData(linha?.[COL_VENCTO]);
    if (venctoCabecalho) venctoDia = venctoCabecalho;

    if (!isDocRow(linha)) {
      r++;
      continue;
    }

    const codigoFinanceiro = String(Math.trunc(num(linha[COL_FINANC])!));
    const documentoRaw = linha[COL_DOCUMENTO];
    const documento =
      typeof documentoRaw === 'number' ? String(documentoRaw) : limparTexto(documentoRaw);
    const emissao = parseData(linha[COL_EMISSAO]);
    const vencimento = parseData(linha[COL_PREVISTO_DATA]) ?? venctoDia;
    const fornecedorParts: string[] = [String(linha[COL_FORNECEDOR] ?? '')];
    const historicoParts: string[] = [String(linha[COL_HISTORICO] ?? '')];
    const anotacaoParts: string[] = [];
    const filial = num(linha[COL_FILIAL]);
    const tipoDoc = num(linha[COL_TIPO]);
    const bordero = num(linha[COL_BORDERO]);
    const valorDocumento = paraNumero(linha[COL_VALDOC]);
    const valorPrevisto = paraNumero(linha[COL_PREVISTO_VALOR]);
    const valorPago = paraNumero(linha[COL_PAGO_VALOR]);
    const pago = limparTexto(linha[COL_STA2]).toUpperCase() === 'B';

    // linhas de continuação: histórico (col 16), fornecedor (col 11), anotação (col 2)
    let rr = r + 1;
    while (rr < n && !isDocRow(matriz[rr])) {
      if (isLinhaTotalizadora(matriz[rr])) break;
      const cont = matriz[rr];
      if (parseData(cont?.[COL_VENCTO])) break; // começou outro dia sem título ainda

      const hist = cont?.[COL_HISTORICO];
      if (typeof hist === 'string' && hist.trim()) historicoParts.push(hist);
      const forn = cont?.[COL_FORNECEDOR];
      if (typeof forn === 'string' && forn.trim()) fornecedorParts.push(forn);
      const anot = cont?.[COL_ANOTACAO];
      if (typeof anot === 'string' && anot.trim() && !/registros impressos/i.test(anot)) {
        anotacaoParts.push(anot.trim());
      }
      rr++;
      if (rr - r > 25) break;
    }

    const historicoBruto = historicoParts.filter(Boolean).join(' ');
    const historico = limparTexto(historicoBruto.split('Sit:')[0]);
    const situacao = extrairSituacao(historicoBruto);
    const parcela = extrairParcela(historico);
    const fornecedorNome = limparTexto(fornecedorParts.filter(Boolean).join(' '));
    const anotacao = anotacaoParts.length ? limparTexto(anotacaoParts.join(' ')) : null;

    if (!codigoFinanceiro || !vencimento || !valorPrevisto) {
      erros.push({
        linha: r + 1,
        motivo: !valorPrevisto
          ? 'valor previsto não numérico ou ausente'
          : !vencimento
            ? 'data de vencimento em formato inválido'
            : 'título sem código financeiro',
      });
    } else {
      registros.push({
        codigoFinanceiro,
        documento,
        fornecedorNome,
        emissao,
        vencimento,
        historico,
        situacao,
        parcela,
        tipoDoc,
        bordero,
        filial,
        valorDocumento: Math.round(valorDocumento * 100) / 100,
        valorPrevisto: Math.round(valorPrevisto * 100) / 100,
        valorPago: Math.round(valorPago * 100) / 100,
        pago,
        anotacao,
      });
    }

    r = rr;
  }

  return { registros, erros, totalizadores: extrairTotalizadores(matriz) };
}

function extrairTotalizadores(matriz: LinhaPlanilha[]): TotalizadoresPagar {
  let totalDocumento: number | null = null;
  let totalPrevisto: number | null = null;
  let totalPago: number | null = null;
  let registrosImpressos: number | null = null;

  for (const linha of matriz) {
    if (typeof linha[COL_TOTAL_GERAL] === 'string' && (linha[COL_TOTAL_GERAL] as string).includes('Total Geral')) {
      totalDocumento = num(linha[COL_VALDOC]);
      totalPrevisto = num(linha[COL_PREVISTO_VALOR]);
      totalPago = num(linha[COL_PAGO_VALOR]);
    }
    if (typeof linha[COL_ANOTACAO] === 'string' && /registros impressos/i.test(linha[COL_ANOTACAO] as string)) {
      for (let i = COL_ANOTACAO + 1; i <= COL_ANOTACAO + 6; i++) {
        if (typeof linha[i] === 'number') {
          registrosImpressos = linha[i] as number;
          break;
        }
      }
    }
  }
  return { totalDocumento, totalPrevisto, totalPago, registrosImpressos };
}
