import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import { ENTRY_STATUS, ENTRY_SOURCES, IMPORT_SOURCES, PAYMENT_METHODS } from './enums';

const payableSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    supplierName: { type: String, required: true, trim: true },
    supplierDocument: { type: String, default: '', trim: true },

    documentNumber: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'cat-d-10' },
    categoryName: { type: String, default: 'Outras Despesas' },

    amountCents: { type: Number, required: true },
    /** Valor original do documento, antes de juros/multa/desconto. */
    grossAmountCents: { type: Number, default: 0 },
    /** Valor efetivamente pago (null enquanto em aberto). */
    paidAmountCents: { type: Number, default: null },
    /** Saldo em aberto do título (0 quando quitado). */
    remainingAmountCents: { type: Number, default: null },

    issueDate: { type: Date, default: null },
    dueDate: { type: Date, required: true },
    paymentDate: { type: Date, default: null },

    status: { type: String, enum: ENTRY_STATUS, default: 'pending' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'boleto' },

    /** Número da parcela do título, quando houver (ex.: "124/180"). */
    installment: { type: String, default: '' },
    /** Código interno do título no sistema de origem. */
    titleCode: { type: String, default: '' },
    /** Situação/carteira de origem do pagamento (ex.: "BANCO", "DESPESA FIXA"). */
    bank: { type: String, default: '' },
    /** Centro de custo, quando o arquivo de origem fornecer. */
    costCenter: { type: String, default: '' },
    /** Conta/plano de contas, quando o arquivo de origem fornecer. */
    account: { type: String, default: '' },

    notes: { type: String, default: '' },

    source: { type: String, enum: ENTRY_SOURCES, default: 'manual' },
    /** Fonte do arquivo quando `source === 'import'`. Registros antigos ficam em 'legacy'. */
    importSource: { type: String, enum: IMPORT_SOURCES, default: 'legacy' },
    sourceFile: { type: String, default: '' },
    /** Código do fornecedor no sistema de origem. */
    externalCustomerId: { type: String, default: '' },
    externalId: { type: String, required: true },
  },
  { timestamps: true },
);

payableSchema.index({ companyId: 1, dueDate: -1 });
payableSchema.index({ companyId: 1, status: 1 });
payableSchema.index({ companyId: 1, importSource: 1 });
payableSchema.index({ supplierName: 1 });
payableSchema.index({ createdAt: -1 });
payableSchema.index({ companyId: 1, externalId: 1 }, { unique: true });

export type PayableDoc = HydratedDocument<InferSchemaType<typeof payableSchema>>;
export type PayablePlain = InferSchemaType<typeof payableSchema> & { _id: Types.ObjectId };
export const Payable = model('Payable', payableSchema);
