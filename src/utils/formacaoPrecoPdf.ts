import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent } from './format';
import type { RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

const REGIME_LABEL: Record<string, string> = {
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  '': 'Não informado',
};

const MARGIN = 40;

/** `jspdf-autotable` anexa `lastAutoTable` à instância em runtime, mas não expõe isso no tipo de `jsPDF`. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function addTitulo(doc: jsPDF, texto: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(texto, MARGIN, y);
  return y + 16;
}

function garantirEspaco(doc: jsPDF, y: number, altura = 60): number {
  const alturaPagina = doc.internal.pageSize.getHeight();
  if (y + altura > alturaPagina - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/**
 * Gera o PDF da Planilha de Custos e Formação de Preços (DFP) para a simulação atual —
 * texto real (não imagem), pronto pra imprimir/anexar ao processo. 100% cliente.
 */
export function gerarPdfFormacaoPreco(f: RascunhoFormacaoPreco, resultado: ResultadoFormacaoPreco, opts?: { nomeEmpresa?: string }): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Planilha de Custos e Formação de Preços', MARGIN, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(f.nome || 'Sem nome', MARGIN, y);
  y += 20;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { cellWidth: 380 } },
    body: [
      ['Órgão:', f.orgao || '—'],
      ['Objeto:', f.objeto || '—'],
      ['Nº do Pregão:', f.numeroPregao || '—'],
      ['Empresa:', opts?.nomeEmpresa || '—'],
      ['Regime tributário:', REGIME_LABEL[f.regimeTributario] ?? '—'],
      ['Duração do contrato:', `${f.mesesContrato} meses`],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
    ],
  });
  y = finalY(doc) + 20;

  y = addTitulo(doc, '1. Custos Diretos', y);
  autoTable(doc, {
    startY: y,
    head: [['Bloco', 'Total (R$)']],
    body: [
      ['1.1 Mão de obra (direta + indireta + uniforme/EPI + alimentação)', formatCurrency(resultado.maoDeObra.total)],
      ['1.2 Materiais', formatCurrency(resultado.materiais.total)],
      ['   1.2.1 Materiais de aplicação', formatCurrency(resultado.materiais.aplicacao)],
      ['   1.2.2 Outros materiais', formatCurrency(resultado.materiais.outros)],
      ['1.3 Equipamentos de aplicação direta', formatCurrency(resultado.equipamentos.total)],
      ['1.4 Veículos', formatCurrency(resultado.veiculos.total)],
    ],
    foot: [['TOTAL 1. — Total dos Custos Diretos', formatCurrency(resultado.totalCustosDiretos)]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 44, 52] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 110 } },
  });
  y = finalY(doc) + 20;
  y = garantirEspaco(doc, y, 140);

  const base = resultado.precoAdotado ?? 0;
  y = addTitulo(doc, '2. Custos Indiretos, Lucro e Tributos', y);
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Percentual (%)', 'Base de Cálculo (R$)', 'Total (R$)']],
    body: [
      ['Admin. central', formatPercent(f.custosIndiretosPercent * 100), formatCurrency(base), formatCurrency(resultado.custosIndiretosValor)],
      ['Total dos Custos Indiretos (TOTAL 2.)', '', '', formatCurrency(resultado.custosIndiretosValor)],
      ['Total dos Custos', '', '', formatCurrency(resultado.totalCustos)],
      [resultado.contratoFechado ? 'Lucro (real, residual)' : 'Lucro', resultado.contratoFechado ? '—' : formatPercent(f.lucroPercent * 100), formatCurrency(base), formatCurrency(resultado.lucroValor)],
      ['Total dos Custos + Lucro', '', '', formatCurrency(resultado.totalCustosMaisLucro)],
      ['% Tributos sobre o custo', formatPercent(f.tributosSobreCustoPercent * 100), formatCurrency(base), formatCurrency(resultado.tributosSobreCustoValor)],
      ['% Tributos sobre a receita', formatPercent(f.tributosSobreReceitaPercent * 100), formatCurrency(base), formatCurrency(resultado.tributosSobreReceitaValor)],
      ['Total dos Tributos', '', '', formatCurrency(resultado.tributosValor)],
    ],
    foot: [[`TOTAL DOS SERVIÇOS (${resultado.contratoFechado ? 'preço do contrato fechado' : 'preço mínimo'})`, '', '', resultado.precoAdotado === null ? 'N/A' : formatCurrency(resultado.precoAdotado)]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 44, 52] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 80 }, 2: { halign: 'right', cellWidth: 100 }, 3: { halign: 'right', cellWidth: 100 } },
  });
  y = finalY(doc) + 20;
  y = garantirEspaco(doc, y, 160);

  y = addTitulo(doc, 'Resumo executivo', y);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 44, 52] },
    columnStyles: { 1: { halign: 'right', cellWidth: 120 } },
    body: [
      [
        resultado.contratoFechado ? `Preço do contrato — total (${f.mesesContrato} meses)` : 'Preço mínimo necessário',
        resultado.contratoFechado
          ? resultado.valorGlobalContrato === null
            ? 'N/A'
            : formatCurrency(resultado.valorGlobalContrato)
          : resultado.precoAdotado === null
            ? 'N/A'
            : formatCurrency(resultado.precoAdotado),
      ],
      ['Valor mensal', resultado.valorMensal === null ? 'N/A' : formatCurrency(resultado.valorMensal)],
      ['Valor anual (base do DRE — ano 1)', resultado.valorAnual === null ? 'N/A' : formatCurrency(resultado.valorAnual)],
      [resultado.contratoFechado ? 'Margem real (ano 1)' : 'Margem-alvo', formatPercent(base > 0 ? (resultado.lucroValor / base) * 100 : 0)],
      ['Investimento inicial', formatCurrency(resultado.investimentoInicial)],
      ['Capital de giro necessário', formatCurrency(resultado.capitalGiroNecessario)],
      ['ROI anualizado', resultado.roiAnualPercent === null ? 'N/A' : formatPercent(resultado.roiAnualPercent)],
      ['Payback', resultado.paybackMeses === null ? 'N/A' : `${resultado.paybackMeses.toFixed(1)} meses`],
    ],
  });
  y = finalY(doc) + 20;
  y = garantirEspaco(doc, y, 220);

  if (resultado.dre.length > 0) {
    y = addTitulo(doc, `DRE estimado ${resultado.contratoFechado ? '(ano 1)' : ''}`, y);
    autoTable(doc, {
      startY: y,
      head: [['Item', '% da receita', 'Valor (R$)']],
      body: resultado.dre.map((l) => [l.label, formatPercent(l.percentualDaReceita), formatCurrency(l.valor)]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [40, 44, 52] },
      columnStyles: { 1: { halign: 'right', cellWidth: 80 }, 2: { halign: 'right', cellWidth: 110 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0 && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('(=)')) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = finalY(doc) + 20;
    y = garantirEspaco(doc, y, 120);
  }

  if (resultado.totalServicosDfp !== null) {
    y = addTitulo(doc, 'Conferência com o DFP oficial', y);
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [40, 44, 52] },
      columnStyles: { 1: { halign: 'right', cellWidth: 120 } },
      body: [
        ['Receita anual informada', resultado.receitaAnualInformada === null ? 'N/A' : formatCurrency(resultado.receitaAnualInformada)],
        ['Total dos Serviços (DFP)', formatCurrency(resultado.totalServicosDfp)],
        ['Resultado do contrato', resultado.resultadoContratoInformado === null ? 'N/A' : formatCurrency(resultado.resultadoContratoInformado)],
      ],
    });
    y = finalY(doc) + 20;
    y = garantirEspaco(doc, y, 100);
  }

  if (resultado.comparacaoReferencia) {
    const c = resultado.comparacaoReferencia;
    y = addTitulo(doc, 'Comparação com preço de referência', y);
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [40, 44, 52] },
      columnStyles: { 1: { halign: 'right', cellWidth: 120 } },
      body: [
        ['Preço de referência', formatCurrency(c.precoReferencia)],
        ['Viável?', c.viavel ? 'Sim' : 'Não'],
        ['Lucro real', formatCurrency(c.lucroReal)],
        ['Margem real', formatPercent(c.margemRealPct)],
        ['Diferença sobre o preço mínimo', c.diferenca === null ? 'N/A' : formatCurrency(c.diferenca)],
      ],
    });
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${p} de ${paginas}`, doc.internal.pageSize.getWidth() - MARGIN - 60, doc.internal.pageSize.getHeight() - 20);
  }

  const nomeArquivo = `formacao-preco-${(f.nome || 'simulacao').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
