import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { looksLikeErcPagar, parseErcPagar } from '../ercPagarParser';
import { looksLikeErcReceber } from '../ercReceberParser';
import { normalizeErcPagar } from '../normalize';
import { categorizeDespesa } from '../categorize';

const COMPANY = '507f1f77bcf86cd799439011';
const CTX = { companyObjectId: COMPANY, sourceFile: 'CP 2026 1 A 4.XLS' };

const FIX_PAGAR = join(__dirname, 'fixtures', 'legacy-contas-pagar.xls');
const FIX_RECEBER = join(__dirname, 'fixtures', 'totvs-posicao-clientes.xlsx');
const buf = () => readFileSync(FIX_PAGAR);

/* --------------------------------- detecção --------------------------------- */

test('looksLikeErcPagar reconhece o relatório de Contas a Pagar', () => {
  assert.equal(looksLikeErcPagar(buf()), true);
});

test('looksLikeErcPagar é falso para outros layouts', () => {
  assert.equal(looksLikeErcPagar(readFileSync(FIX_RECEBER)), false);
  assert.equal(looksLikeErcReceber(buf()), false); // e o parser de receber não pega o de pagar
});

/* --------------------------------- parser --------------------------------- */

test('parseErcPagar: 22 títulos, totais batem com o rodapé "Total Geral"', () => {
  const { registros, erros, totalizadores } = parseErcPagar(buf());
  assert.equal(erros.length, 0);
  assert.equal(registros.length, 22);
  assert.equal(totalizadores.registrosImpressos, 22);

  const round = (n: number) => Math.round(n * 100) / 100;
  const somaDoc = round(registros.reduce((s, r) => s + r.valorDocumento, 0));
  const somaPrev = round(registros.reduce((s, r) => s + r.valorPrevisto, 0));
  const somaPago = round(registros.filter((r) => r.pago).reduce((s, r) => s + r.valorPago, 0));
  assert.equal(somaDoc, 32813.48); // Total Geral col Val.Doc
  assert.equal(somaPrev, 32882.79); // Total Geral col Previsto
  assert.equal(somaPago, 27555.54); // Total Geral col Pago
  assert.equal(totalizadores.totalPrevisto, 32882.79);
  assert.equal(totalizadores.totalPago, 27555.54);

  // datas ISO, código financeiro sempre presente
  for (const r of registros) {
    assert.match(r.vencimento, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.codigoFinanceiro.length > 0);
  }
  // 3 títulos em aberto (Sta em branco)
  assert.equal(registros.filter((r) => !r.pago).length, 3);
});

test('parser captura histórico multi-linha, situação e parcela', () => {
  const { registros } = parseErcPagar(buf());
  const hm = registros.find((r) => /HM CONTABILIDADE/i.test(r.fornecedorNome));
  assert.ok(hm);
  assert.match(hm!.historico, /HONORARIO MENSAL/i);
  assert.equal(hm!.situacao, 'DESPESA FIXA');

  const refis = registros.find((r) => /124\/180/.test(r.historico));
  assert.ok(refis);
  assert.equal(refis!.parcela, '124/180');
  assert.equal(refis!.situacao, 'BANCO');
});

/* --------------------------------- normalização --------------------------------- */

test('normalizeErcPagar produz candidatos de payable consistentes', () => {
  const { registros, erros } = parseErcPagar(buf());
  const res = normalizeErcPagar(registros, erros, CTX);

  assert.equal(res.candidates.length, 22);
  assert.equal(res.errors.length, 0);

  for (const c of res.candidates) {
    assert.equal(c.kind, 'payable');
    assert.equal(c.source, 'import');
    assert.equal(c.importSource, 'legacy');
    assert.equal(c.companyObjectId, COMPANY);
    assert.ok(c.amountCents > 0);
    assert.ok(c.dueDate instanceof Date && !Number.isNaN(c.dueDate.getTime()));
    assert.ok(c.externalId.length === 40);
    assert.ok(c.category.startsWith('cat-d-'));
  }

  const totalPrevistoCents = res.candidates.reduce((s, c) => s + c.amountCents, 0);
  assert.equal(totalPrevistoCents, 3288279); // R$ 32.882,79

  const pagos = res.candidates.filter((c) => c.status === 'paid');
  const abertos = res.candidates.filter((c) => c.status === 'overdue' || c.status === 'pending');
  assert.equal(pagos.length, 19);
  assert.equal(abertos.length, 3);

  const totalPagoCents = pagos.reduce((s, c) => s + (c.paidAmountCents ?? 0), 0);
  assert.equal(totalPagoCents, 2755554); // R$ 27.555,54

  const saldoAbertoCents = abertos.reduce((s, c) => s + (c.remainingAmountCents ?? 0), 0);
  assert.equal(saldoAbertoCents, 532725); // R$ 5.327,25

  for (const c of pagos) {
    assert.equal(c.remainingAmountCents, 0);
    assert.ok(c.paymentDate instanceof Date);
  }
  for (const c of abertos) {
    assert.equal(c.paidAmountCents, null);
    assert.equal(c.paymentDate, null);
  }
});

test('externalId é determinístico e único (base da deduplicação idempotente)', () => {
  const p1 = parseErcPagar(buf());
  const p2 = parseErcPagar(buf());
  const r1 = normalizeErcPagar(p1.registros, p1.erros, CTX);
  const r2 = normalizeErcPagar(p2.registros, p2.erros, CTX);
  assert.deepEqual(
    r1.candidates.map((c) => c.externalId).sort(),
    r2.candidates.map((c) => c.externalId).sort(),
  );
  assert.equal(new Set(r1.candidates.map((c) => c.externalId)).size, 22);
});

test('valor previsto inválido vira erro e não candidato', () => {
  const res = normalizeErcPagar(
    [
      {
        codigoFinanceiro: '99999',
        documento: '',
        fornecedorNome: 'FORNECEDOR TESTE',
        emissao: '2026-01-01',
        vencimento: '2026-02-10',
        historico: 'teste',
        situacao: null,
        parcela: null,
        tipoDoc: 1,
        bordero: 0,
        filial: 1,
        valorDocumento: 0,
        valorPrevisto: 0,
        valorPago: 0,
        pago: false,
        anotacao: null,
      },
    ],
    [],
    CTX,
  );
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Valor inválido/i.test(e.message)));
});

test('fornecedor ausente vira erro "Fornecedor não identificado"', () => {
  const res = normalizeErcPagar(
    [
      {
        codigoFinanceiro: '99998',
        documento: 'X',
        fornecedorNome: '',
        emissao: null,
        vencimento: '2026-02-10',
        historico: 'x',
        situacao: null,
        parcela: null,
        tipoDoc: null,
        bordero: null,
        filial: null,
        valorDocumento: 100,
        valorPrevisto: 100,
        valorPago: 0,
        pago: false,
        anotacao: null,
      },
    ],
    [],
    CTX,
  );
  assert.equal(res.candidates.length, 0);
  assert.ok(res.errors.some((e) => /Fornecedor não identificado/i.test(e.message)));
});

test('categorizeDespesa mapeia históricos comuns', () => {
  assert.equal(categorizeDespesa('DAS SIMPLES REF 12/2025').id, 'cat-d-3');
  assert.equal(categorizeDespesa('REFIS PARCELAMENTO INSS 124/180').id, 'cat-d-3');
  assert.equal(categorizeDespesa('HONORARIO MENSAL SERVICOS CONTABEIS').id, 'cat-d-1');
  assert.equal(categorizeDespesa('CONTA DE ENERGIA COELBA').id, 'cat-d-6');
  assert.equal(categorizeDespesa('algo totalmente aleatório').id, 'cat-d-10');
});
