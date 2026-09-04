import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readXlsxMatrix } from '../parseSpreadsheet';
import { adaptTotvsReceivable, looksLikeTotvsPosicao } from '../adapters/totvsReceivableAdapter';
import { coerceImportSource } from '../sources';
import type { AdapterContext } from '../adapters/types';

const COMPANY = '507f1f77bcf86cd799439011';
const CTX: AdapterContext = { companyObjectId: COMPANY, kind: 'receivable', sourceFile: 'totvs.xlsx' };

const FIXTURE = join(__dirname, 'fixtures', 'totvs-posicao-clientes.xlsx');
function fixtureMatrix() {
  return readXlsxMatrix(readFileSync(FIXTURE)).rows as (string | number | boolean | null)[][];
}

const HEADER = [
  'Prefixo',
  'No. Titulo',
  'Tipo',
  'Vlr.Titulo',
  'DT Emissao',
  'Vencimento',
  'DT Baixa',
  'Valor baixado',
  'Saldo líquido',
];
const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const CLIENTE = 'Dados do cliente: 03304064/0001 - ACME LOCACOES LTDA (ACME)';

/* --------------------------------- fixture real --------------------------------- */

test('arquivo TOTVS válido: 30 títulos, totais batem com o subtotal da filial', () => {
  const matrix = fixtureMatrix();
  assert.equal(looksLikeTotvsPosicao(matrix), true);

  const res = adaptTotvsReceivable(matrix, CTX);
  assert.deepEqual(res.missingRequired, []);
  assert.equal(res.errors.length, 0);
  assert.equal(res.candidates.length, 30);

  for (const c of res.candidates) {
    assert.equal(c.companyObjectId, COMPANY);
    assert.equal(c.source, 'import');
    assert.equal(c.importSource, 'totvs');
    assert.equal(c.kind, 'receivable');
    assert.equal(c.category, 'cat-r-4');
    assert.ok(c.amountCents > 0);
    assert.ok(c.dueDate instanceof Date && !Number.isNaN(c.dueDate.getTime()));
    assert.ok(c.externalId && c.externalId.length === 40);
    assert.equal(c.externalCustomerId.length > 0, true);
  }

  const total = res.candidates.reduce((s, c) => s + c.amountCents, 0);
  assert.equal(total, 33_018_598); // Vlr.Titulo da filial: R$ 330.185,98

  const paid = res.candidates.filter((c) => c.status === 'paid');
  const open = res.candidates.filter((c) => c.status === 'overdue' || c.status === 'pending');
  assert.equal(paid.length, 20);
  assert.equal(open.length, 10);

  const recebido = paid.reduce((s, c) => s + (c.receivedAmountCents ?? 0), 0);
  assert.equal(recebido, 26_858_243); // Valor baixado da filial: R$ 268.582,43

  const emAberto = open.reduce((s, c) => s + c.amountCents, 0);
  assert.equal(emAberto, 6_160_355); // Saldo líquido da filial: R$ 61.603,55

  // identidade estável e sem colisão (o nº de título se repete entre prefixos/tipos)
  assert.equal(new Set(res.candidates.map((c) => c.externalId)).size, 30);

  for (const c of paid) assert.ok(c.paymentDate instanceof Date);
  for (const c of open) assert.equal(c.paymentDate, null);
});

test('mapeamento identificado é exposto para o preview', () => {
  const res = adaptTotvsReceivable(fixtureMatrix(), CTX);
  const campos = res.mapping.map((m) => m.field);
  assert.ok(campos.includes('Documento'));
  assert.ok(campos.includes('Valor'));
  assert.ok(campos.includes('Vencimento'));
  assert.ok(campos.includes('Data de pagamento'));
  assert.ok(campos.includes('Cliente / CNPJ / Código'));
});

test('sem coluna de situação => registra aviso de status derivado', () => {
  const res = adaptTotvsReceivable(fixtureMatrix(), CTX);
  assert.ok(res.warnings.some((w) => /derivado/i.test(w.message)));
});

test('reimportar o mesmo arquivo gera externalId idêntico (base da deduplicação)', () => {
  const a = adaptTotvsReceivable(fixtureMatrix(), CTX);
  const b = adaptTotvsReceivable(fixtureMatrix(), CTX);
  assert.deepEqual(
    a.candidates.map((c) => c.externalId).sort(),
    b.candidates.map((c) => c.externalId).sort(),
  );
  // e todos únicos dentro do lote
  assert.equal(new Set(a.candidates.map((c) => c.externalId)).size, a.candidates.length);
});

/* --------------------------------- casos de borda --------------------------------- */

test('arquivo vazio => sem candidatos, campos obrigatórios sinalizados', () => {
  const res = adaptTotvsReceivable([], CTX);
  assert.equal(res.candidates.length, 0);
  assert.equal(res.missingRequired.length, 3);
  assert.ok(res.errors.length >= 1);
});

test('coluna obrigatória ausente (Vencimento) => missingRequired + nenhum candidato', () => {
  const header = HEADER.filter((h) => h !== 'Vencimento');
  const matrix = [
    header,
    [CLIENTE],
    ['A', '000000123', 'NF', '1.000,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '1.000,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.ok(res.missingRequired.includes('Vencimento'));
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Vencimento/i.test(e.message)));
});

test('valor inválido => linha vira erro, não é importada', () => {
  const matrix = [
    HEADER,
    [CLIENTE],
    ['A', '000000123', 'NF', 'abc', d(2026, 8, 1), d(2026, 8, 10), '', '0', '0'],
    ['A', '000000124', 'NF', '500,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '500,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].documentNumber, '124');
  assert.ok(res.errors.some((e) => /Valor inválido/i.test(e.message)));
});

test('data de vencimento inválida => linha vira erro', () => {
  const matrix = [
    HEADER,
    [CLIENTE],
    ['A', '000000200', 'NF', '900,00', d(2026, 8, 1), 'trinta de agosto', '', '0', '900,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /vencimento inválida/i.test(e.message)));
});

test('cliente não identificado (título antes de qualquer "Dados do cliente:")', () => {
  const matrix = [
    HEADER,
    ['A', '000000300', 'NF', '100,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '100,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Cliente não identificado/i.test(e.message)));
});

test('status textual desconhecido => erro "Status desconhecido", linha ignorada', () => {
  const header = [...HEADER, 'Situação'];
  const matrix = [
    header,
    [CLIENTE],
    ['A', '000000400', 'NF', '100,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '100,00', 'Renegociado'],
    ['A', '000000401', 'NF', '100,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '100,00', 'Pago'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].status, 'paid');
  assert.ok(res.errors.some((e) => /Status desconhecido/i.test(e.message)));
});

test('status derivado: valor baixado > 0 e saldo 0 => paid; saldo > 0 e vencido => overdue', () => {
  const matrix = [
    HEADER,
    [CLIENTE],
    ['A', '1', 'NF', '1.000,00', d(2026, 8, 1), d(2026, 8, 10), d(2026, 8, 9), '1.000,00', '0'],
    ['A', '2', 'NF', '1.000,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '1.000,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  const byDoc = Object.fromEntries(res.candidates.map((c) => [c.documentNumber, c]));
  assert.equal(byDoc['1'].status, 'paid');
  assert.equal(byDoc['1'].receivedAmountCents, 100_000);
  assert.ok(byDoc['1'].paymentDate instanceof Date);
  assert.equal(byDoc['2'].status, 'overdue');
  assert.equal(byDoc['2'].receivedAmountCents, null);
});

test('número do título é normalizado (zeros à esquerda removidos)', () => {
  const matrix = [
    HEADER,
    [CLIENTE],
    ['A', '000002974', 'NF', '180,00', d(2026, 8, 4), d(2026, 8, 25), d(2026, 8, 25), '180,00', '0'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates[0].documentNumber, '2974');
  assert.equal(res.candidates[0].titleCode, '000002974');
});

test('colunas extras são ignoradas, não rejeitam o arquivo (§18)', () => {
  const header = [...HEADER, 'Centro de custo', 'Observação interna', 'Vendedor'];
  const matrix = [
    header,
    [CLIENTE],
    ['A', '9', 'NF', '250,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '250,00', 'CC-1', 'nota', 'João'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].amountCents, 25_000);
});

test('linhas vazias e de subtotal são puladas', () => {
  const matrix = [
    HEADER,
    ['Nome da filial: 0201 - ACME EVENTOS LTDA', '', '', '1.000,00'],
    [CLIENTE, '', '', '250,00'],
    [null, null, null, null, null, null, null, null, null],
    ['A', '9', 'NF', '250,00', d(2026, 8, 1), d(2026, 8, 10), '', '0', '250,00'],
    ['Total Geral >>>>', '', '', '250,00'],
  ];
  const res = adaptTotvsReceivable(matrix, CTX);
  assert.equal(res.candidates.length, 1);
  assert.equal(res.errors.length, 0);
  assert.equal(res.candidates[0].collectionChannel, 'ACME EVENTOS LTDA');
});

test('coerceImportSource normaliza entrada do form-data', () => {
  assert.equal(coerceImportSource('totvs'), 'totvs');
  assert.equal(coerceImportSource('TOTVS'), 'totvs');
  assert.equal(coerceImportSource('legacy'), 'legacy');
  assert.equal(coerceImportSource('sistema_antigo'), 'legacy'); // desconhecido => legacy
  assert.equal(coerceImportSource(undefined), 'legacy');
});

test('looksLikeTotvsPosicao é falso para planilha genérica', () => {
  const generic = [
    ['Cliente', 'Documento', 'Valor', 'Vencimento'],
    ['Fulano', 'NF-1', '100,00', '2026-08-10'],
  ];
  assert.equal(looksLikeTotvsPosicao(generic), false);
});
