import mongoose from 'mongoose';
import { env } from '../config/env';
import { Company } from '../models/company.model';
import { Category } from '../models/category.model';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { ImportLog } from '../models/importLog.model';
import { ymdToDate, todayUTC } from '../utils/dates';
import { reaisToCents } from '../utils/money';
import { buildExternalId } from './externalId';
import { mulberry32, pickFrom, intBetween, amountBetween, addDaysISO, todayISO } from './rng';
import {
  COMPANIES,
  CATEGORIES,
  CATEGORIAS_RECEITA,
  CATEGORIAS_DESPESA,
  PAYMENT_METHODS,
  CLIENTES_SINTETICOS,
  FORNECEDORES,
  DESCRICOES_RECEBER,
  DESCRICOES_PAGAR,
  VOLUME_RECEBER,
  SEED_RECEBER,
  VOLUME_PAGAR,
  SEED_PAGAR,
} from './seedData';
import locTudoReceber from '../data/contasReceberLocTudo.json';

interface RegistroLocTudo {
  documento: string;
  codigoTitulo: string;
  banco: number | null;
  numeroConta: string;
  clienteNome: string;
  descricao: string;
  numeroContrato: string | null;
  situacaoCarteira: string | null;
  emissao: string;
  valorBruto: number;
  vencimento: string;
  valorLiquido: number;
  dataPagamento: string | null;
  valorRecebido: number | null;
  recebido: boolean;
}

const today = todayUTC();

/* --------------------------------- LOC TUDO real --------------------------------- */

function buildLocTudoReceivables(companyId: mongoose.Types.ObjectId) {
  const registros = locTudoReceber as RegistroLocTudo[];
  return registros.map((r, i) => {
    const dueDate = ymdToDate(r.vencimento)!;
    const paymentDate = r.dataPagamento ? ymdToDate(r.dataPagamento) : null;
    const amountCents = reaisToCents(r.valorLiquido);
    const status: 'paid' | 'pending' = r.recebido ? 'paid' : 'pending';
    return {
      companyId,
      customerName: r.clienteNome,
      customerDocument: '',
      documentNumber: r.documento,
      description: r.descricao || 'Aluguel de Equipamentos',
      category: 'cat-r-4',
      categoryName: 'Locação',
      amountCents,
      grossAmountCents: reaisToCents(r.valorBruto),
      receivedAmountCents: r.valorRecebido != null ? reaisToCents(r.valorRecebido) : status === 'paid' ? amountCents : null,
      dueDate,
      paymentDate,
      status,
      paymentMethod: 'boleto' as const,
      collectionChannel: r.situacaoCarteira ?? '',
      contractNumber: r.numeroContrato ?? '',
      titleCode: r.codigoTitulo ?? '',
      notes: r.numeroContrato ? `Contrato nº ${r.numeroContrato}` : '',
      source: 'seed_real' as const,
      sourceFile: 'CONTAS A RECEBER ANUAL.XLS',
      externalId: buildExternalId({
        companyId: String(companyId),
        type: 'receivable',
        identifier: r.codigoTitulo || r.documento,
      }),
      createdAt: ymdToDate(r.emissao) ?? dueDate,
      updatedAt: new Date(),
      _seedIndex: i,
    };
  }).map(({ _seedIndex, ...doc }) => doc);
}

/* --------------------------------- Sintético --------------------------------- */

// `overdue` nunca é gravado: um `pending` com vencimento no passado já é tratado
// como vencido pela API (effectiveStatus). Assim o status se auto-mantém no tempo.
type SeedStatus = { status: 'paid' | 'pending' | 'canceled'; pago: string | null };

function statusReceber(random: () => number, vencISO: string): SeedStatus {
  const hoje = todayISO();
  const roll = random();
  if (vencISO > hoje) {
    if (roll < 0.12) return { status: 'paid', pago: addDaysISO(vencISO, -intBetween(random, 1, 10)) };
    if (roll < 0.15) return { status: 'canceled', pago: null };
    return { status: 'pending', pago: null };
  }
  if (roll < 0.72) return { status: 'paid', pago: addDaysISO(vencISO, intBetween(random, 0, 8)) };
  if (roll < 0.94) return { status: 'pending', pago: null }; // vencido (derivado)
  return { status: 'canceled', pago: null };
}

function statusPagar(random: () => number, vencISO: string): SeedStatus {
  const hoje = todayISO();
  const roll = random();
  if (vencISO > hoje) {
    if (roll < 0.1) return { status: 'paid', pago: addDaysISO(vencISO, -intBetween(random, 1, 10)) };
    if (roll < 0.13) return { status: 'canceled', pago: null };
    return { status: 'pending', pago: null };
  }
  if (roll < 0.78) return { status: 'paid', pago: addDaysISO(vencISO, intBetween(random, 0, 5)) };
  if (roll < 0.95) return { status: 'pending', pago: null }; // vencido (derivado)
  return { status: 'canceled', pago: null };
}

function buildSyntheticReceivables(companySlug: string, companyId: mongoose.Types.ObjectId) {
  const qtd = VOLUME_RECEBER[companySlug];
  if (!qtd) return [];
  const random = mulberry32(SEED_RECEBER[companySlug] ?? 20260828);
  const inicioJanela = addDaysISO(todayISO(), -150);
  const docs: any[] = [];

  for (let i = 0; i < qtd; i++) {
    const cliente = pickFrom(random, CLIENTES_SINTETICOS);
    const categoria = pickFrom(random, CATEGORIAS_RECEITA);
    const vencISO = addDaysISO(inicioJanela, intBetween(random, 0, 210));
    const { status, pago } = statusReceber(random, vencISO);
    const valorCents = amountBetween(random, 320, 48000, 10) * 100;
    const emissaoISO = addDaysISO(vencISO, -intBetween(random, 15, 45));
    const dueDate = ymdToDate(vencISO)!;

    docs.push({
      companyId,
      customerName: cliente.nome,
      customerDocument: cliente.documento,
      documentNumber: `NF-${10000 + i}-${companySlug.slice(0, 3)}`,
      description: pickFrom(random, DESCRICOES_RECEBER),
      category: categoria._id,
      categoryName: categoria.nome,
      amountCents: valorCents,
      grossAmountCents: valorCents,
      receivedAmountCents: status === 'paid' ? valorCents : null,
      dueDate,
      paymentDate: pago ? ymdToDate(pago) : null,
      status,
      paymentMethod: pickFrom(random, PAYMENT_METHODS),
      notes: random() < 0.15 ? 'Cliente solicitou envio de nota fiscal por e-mail.' : '',
      source: 'seed_synthetic',
      sourceFile: '',
      externalId: buildExternalId({
        companyId: String(companyId),
        type: 'receivable',
        identifier: `NF-${10000 + i}-${companySlug.slice(0, 3)}`,
      }),
      createdAt: ymdToDate(emissaoISO) ?? dueDate,
      updatedAt: new Date(),
    });
  }
  return docs;
}

function buildSyntheticPayables(companySlug: string, companyId: mongoose.Types.ObjectId) {
  const qtd = VOLUME_PAGAR[companySlug] ?? 60;
  const random = mulberry32(SEED_PAGAR[companySlug] ?? 20260829);
  const inicioJanela = addDaysISO(todayISO(), -150);
  const docs: any[] = [];

  for (let i = 0; i < qtd; i++) {
    const fornecedor = pickFrom(random, FORNECEDORES);
    const categoria = pickFrom(random, CATEGORIAS_DESPESA);
    const vencISO = addDaysISO(inicioJanela, intBetween(random, 0, 210));
    const { status, pago } = statusPagar(random, vencISO);
    const valorCents = amountBetween(random, 280, 32000, 10) * 100;
    const emissaoISO = addDaysISO(vencISO, -intBetween(random, 10, 40));
    const dueDate = ymdToDate(vencISO)!;

    docs.push({
      companyId,
      supplierName: fornecedor.nome,
      supplierDocument: fornecedor.documento,
      documentNumber: `NF-${20000 + i}-${companySlug.slice(0, 3)}`,
      description: pickFrom(random, DESCRICOES_PAGAR),
      category: categoria._id,
      categoryName: categoria.nome,
      amountCents: valorCents,
      dueDate,
      paymentDate: pago ? ymdToDate(pago) : null,
      status,
      paymentMethod: pickFrom(random, PAYMENT_METHODS),
      notes: random() < 0.12 ? 'Aguardando aprovação financeira para pagamento.' : '',
      source: 'seed_synthetic',
      sourceFile: '',
      externalId: buildExternalId({
        companyId: String(companyId),
        type: 'payable',
        identifier: `NF-${20000 + i}-${companySlug.slice(0, 3)}`,
      }),
      createdAt: ymdToDate(emissaoISO) ?? dueDate,
      updatedAt: new Date(),
    });
  }
  return docs;
}

/* --------------------------------- Runner --------------------------------- */

async function seed() {
  console.log('[seed] conectando ao MongoDB...');
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('[seed] conectado. Limpando coleções...');

  await Promise.all([
    Company.deleteMany({}),
    Category.deleteMany({}),
    Receivable.deleteMany({}),
    Payable.deleteMany({}),
    ImportLog.deleteMany({}),
  ]);

  await Category.insertMany(CATEGORIES.map((c) => ({ ...c })));
  console.log(`[seed] ${CATEGORIES.length} categorias`);

  const companies = await Company.insertMany(COMPANIES.map((c) => ({ ...c, status: 'ativo' })));
  const bySlug = new Map(companies.map((c) => [c.slug, c._id as mongoose.Types.ObjectId]));
  console.log(`[seed] ${companies.length} empresas: ${companies.map((c) => c.slug).join(', ')}`);

  // Receivables
  const locTudoId = bySlug.get('loc-tudo')!;
  const receivables = [
    ...buildLocTudoReceivables(locTudoId),
    ...buildSyntheticReceivables('alugue-tudo-evento', bySlug.get('alugue-tudo-evento')!),
    ...buildSyntheticReceivables('alugue-tudo-comercio', bySlug.get('alugue-tudo-comercio')!),
  ];
  // dedupe por (companyId+externalId) dentro do próprio lote
  const seenR = new Set<string>();
  const receivablesUniq = receivables.filter((d) => {
    const k = `${d.companyId}|${d.externalId}`;
    if (seenR.has(k)) return false;
    seenR.add(k);
    return true;
  });
  await Receivable.insertMany(receivablesUniq, { ordered: false, timestamps: false } as any);
  console.log(`[seed] ${receivablesUniq.length} contas a receber (${receivables.length - receivablesUniq.length} duplicadas ignoradas)`);

  // Payables
  const payables = [
    ...buildSyntheticPayables('loc-tudo', locTudoId),
    ...buildSyntheticPayables('alugue-tudo-evento', bySlug.get('alugue-tudo-evento')!),
    ...buildSyntheticPayables('alugue-tudo-comercio', bySlug.get('alugue-tudo-comercio')!),
  ];
  const seenP = new Set<string>();
  const payablesUniq = payables.filter((d) => {
    const k = `${d.companyId}|${d.externalId}`;
    if (seenP.has(k)) return false;
    seenP.add(k);
    return true;
  });
  await Payable.insertMany(payablesUniq, { ordered: false, timestamps: false } as any);
  console.log(`[seed] ${payablesUniq.length} contas a pagar (${payables.length - payablesUniq.length} duplicadas ignoradas)`);

  const [rc, pc] = await Promise.all([Receivable.countDocuments(), Payable.countDocuments()]);
  console.log(`\n[seed] concluído. receivables=${rc} payables=${pc}`);
  console.log('[seed] hoje (UTC):', today.toISOString().slice(0, 10));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] falhou:', err);
  process.exit(1);
});
