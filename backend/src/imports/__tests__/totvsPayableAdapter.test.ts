import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readXlsxMatrix } from '../parseSpreadsheet';
import { adaptTotvsPayable, looksLikeTotvsPosicaoFornecedores } from '../adapters/totvsPayableAdapter';
import type { AdapterContext } from '../adapters/types';

const COMPANY = '507f1f77bcf86cd799439011';
const CTX: AdapterContext = { companyObjectId: COMPANY, kind: 'payable', sourceFile: 'cp-totvs.xlsx' };

const FIXTURE = join(__dirname, 'fixtures', 'totvs-posicao-fornecedores.xlsx');
function fixtureMatrix() {
  return readXlsxMatrix(readFileSync(FIXTURE)).rows as (string | number | boolean | null)[][];
}

const HEADER = [
  'Filial',
  'Prefixo',
  'No. Titulo',
  'Parcela',
  'Tipo',
  'DT Emissao',
  'Vencimento',
  'Vencto Real',
  'Dados da natureza',
  'Vlr.Titulo',
  'Acrescimo',
  'Decrescimo',
  'Valores acessórios',
  'Abatimentos',
  'Juros',
  'Valor baixado',
  'Saldo líquido',
  'Atraso',
  'Historico',
  'Portador',
  'Nº do Cheque',
];
const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const FORNECEDOR = 'Dados do fornecedor: 00838000/0001 - RABELO E CUNHA LTDA(ALUGUEMAIS)';

/* --------------------------------- fixture real --------------------------------- */

test('arquivo TOTVS CP válido: 813 títulos, totais batem com o subtotal da filial', () => {
  const matrix = fixtureMatrix();
  assert.equal(looksLikeTotvsPosicaoFornecedores(matrix), true);

  const res = adaptTotvsPayable(matrix, CTX);
  assert.deepEqual(res.missingRequired, []);
  assert.equal(res.errors.length, 0);
  assert.equal(res.candidates.length, 813);

  for (const c of res.candidates) {
    assert.equal(c.companyObjectId, COMPANY);
    assert.equal(c.source, 'import');
    assert.equal(c.importSource, 'totvs');
    assert.equal(c.kind, 'payable');
    assert.ok(c.amountCents > 0);
    assert.ok(c.dueDate instanceof Date && !Number.isNaN(c.dueDate.getTime()));
    assert.ok(c.externalId && c.externalId.length === 40);
    assert.equal(c.externalCustomerId.length > 0, true);
  }

  const total = res.candidates.reduce((s, c) => s + c.amountCents, 0);
  assert.equal(total, 250_790_898); // Vlr.Titulo da filial: R$ 2.507.908,98

  const paid = res.candidates.filter((c) => c.status === 'paid');
  const open = res.candidates.filter((c) => c.status === 'overdue' || c.status === 'pending');
  assert.equal(paid.length, 660);
  assert.equal(open.length, 153);

  const pago = paid.reduce((s, c) => s + (c.paidAmountCents ?? 0), 0);
  assert.equal(pago, 221_139_660); // Valor baixado da filial: R$ 2.211.396,60

  const emAberto = open.reduce((s, c) => s + (c.remainingAmountCents ?? 0), 0);
  assert.equal(emAberto, 29_651_227); // Saldo líquido da filial: R$ 296.512,27

  // identidade estável e sem colisão (título genérico de folha se repete por funcionário)
  assert.equal(new Set(res.candidates.map((c) => c.externalId)).size, 813);

  for (const c of paid) assert.ok(c.paymentDate instanceof Date);
  for (const c of open) assert.equal(c.paymentDate, null);
});

test('categoria vem da coluna "Dados da natureza", não de heurística por histórico', () => {
  const res = adaptTotvsPayable(fixtureMatrix(), CTX);
  const combustivel = res.candidates.find((c) => c.category === '5.01.001');
  assert.ok(combustivel);
  assert.equal(combustivel!.categoryName, 'COMBUSTIVEL DIRETORIA');
});

test('mapeamento identificado é exposto para o preview', () => {
  const res = adaptTotvsPayable(fixtureMatrix(), CTX);
  const campos = res.mapping.map((m) => m.field);
  assert.ok(campos.includes('Documento'));
  assert.ok(campos.includes('Valor'));
  assert.ok(campos.includes('Vencimento'));
  assert.ok(campos.includes('Categoria'));
  assert.ok(campos.includes('Fornecedor / CNPJ / Código'));
});

test('sem coluna de situação => registra aviso de status derivado', () => {
  const res = adaptTotvsPayable(fixtureMatrix(), CTX);
  assert.ok(res.warnings.some((w) => /derivado/i.test(w.message)));
});

test('reimportar o mesmo arquivo gera externalId idêntico (base da deduplicação)', () => {
  const a = adaptTotvsPayable(fixtureMatrix(), CTX);
  const b = adaptTotvsPayable(fixtureMatrix(), CTX);
  assert.deepEqual(
    a.candidates.map((c) => c.externalId).sort(),
    b.candidates.map((c) => c.externalId).sort(),
  );
  assert.equal(new Set(a.candidates.map((c) => c.externalId)).size, a.candidates.length);
});

/* --------------------------------- casos de borda --------------------------------- */

test('arquivo vazio => sem candidatos, campos obrigatórios sinalizados', () => {
  const res = adaptTotvsPayable([], CTX);
  assert.equal(res.candidates.length, 0);
  assert.equal(res.missingRequired.length, 3);
  assert.ok(res.errors.length >= 1);
});

test('coluna obrigatória ausente (Vencimento) => missingRequired + nenhum candidato', () => {
  const header = HEADER.filter((h) => h !== 'Vencimento');
  const matrix = [
    header,
    [FORNECEDOR],
    ['0101', 'A', '000000123', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), '4.01.001 - X', '1.000,00', 0, 0, 0, 0, 0, '0', '1.000,00'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  assert.ok(res.missingRequired.includes('Vencimento'));
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Vencimento/i.test(e.message)));
});

test('valor inválido => linha vira erro, não é importada', () => {
  const matrix = [
    HEADER,
    [FORNECEDOR],
    ['0101', 'A', '000000123', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', 'abc', 0, 0, 0, 0, 0, '0', '0'],
    ['0101', 'A', '000000124', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', '500,00', 0, 0, 0, 0, 0, '0', '500,00'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].documentNumber, '124');
  assert.ok(res.errors.some((e) => /Valor inválido/i.test(e.message)));
});

test('fornecedor não identificado (título antes de qualquer "Dados do fornecedor:")', () => {
  const matrix = [
    HEADER,
    ['0101', 'A', '000000300', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', '100,00', 0, 0, 0, 0, 0, '0', '100,00'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Fornecedor não identificado/i.test(e.message)));
});

test('status derivado: valor baixado > 0 e saldo 0 => paid; saldo > 0 e vencido => overdue', () => {
  const matrix = [
    HEADER,
    [FORNECEDOR],
    ['0101', 'A', '1', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 9), '4.01.001 - X', '1.000,00', 0, 0, 0, 0, 0, '1.000,00', '0'],
    ['0101', 'A', '2', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', '1.000,00', 0, 0, 0, 0, 0, '0', '1.000,00'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  const byDoc = Object.fromEntries(res.candidates.map((c) => [c.documentNumber, c]));
  assert.equal(byDoc['1'].status, 'paid');
  assert.equal(byDoc['1'].paidAmountCents, 100_000);
  assert.ok(byDoc['1'].paymentDate instanceof Date);
  assert.equal(byDoc['2'].status, 'overdue');
  assert.equal(byDoc['2'].paidAmountCents, null);
});

test('colunas extras são ignoradas, não rejeitam o arquivo', () => {
  const header = [...HEADER, 'Centro de custo', 'Vendedor'];
  const matrix = [
    header,
    [FORNECEDOR],
    ['0101', 'A', '9', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', '250,00', 0, 0, 0, 0, 0, '0', '250,00', 0, '', '', '', 'CC-1', 'João'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].amountCents, 25_000);
});

test('linhas vazias e de subtotal são puladas', () => {
  const matrix = [
    HEADER,
    ['Nome da filial: 0201 - ACME EVENTOS LTDA', '', '', '1.000,00'],
    [FORNECEDOR, '', '', '250,00'],
    [null, null, null, null, null, null, null, null, null, null, null],
    ['0101', 'A', '9', '', 'NF', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 10), '4.01.001 - X', '250,00', 0, 0, 0, 0, 0, '0', '250,00'],
    ['Total Geral >>>>', '', '', '250,00'],
  ];
  const res = adaptTotvsPayable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.errors.length, 0);
});

test('looksLikeTotvsPosicaoFornecedores é falso para planilha genérica', () => {
  const generic = [
    ['Fornecedor', 'Documento', 'Valor', 'Vencimento'],
    ['Fulano', 'NF-1', '100,00', '2026-08-10'],
  ];
  assert.equal(looksLikeTotvsPosicaoFornecedores(generic), false);
});
