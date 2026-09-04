import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import { ENTRY_STATUS, ENTRY_SOURCES, IMPORT_SOURCES, PAYMENT_METHODS } from './enums';

const receivableSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    customerName: { type: String, required: true, trim: true },
    customerDocument: { type: String, default: '', trim: true },

    documentNumber: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'cat-r-5' },
    categoryName: { type: String, default: 'Outras Receitas' },

    amountCents: { type: Number, required: true },
    grossAmountCents: { type: Number, default: 0 },
    receivedAmountCents: { type: Number, default: null },

    dueDate: { type: Date, required: true },
    paymentDate: { type: Date, default: null },

    status: { type: String, enum: ENTRY_STATUS, default: 'pending' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'boleto' },

    collectionChannel: { type: String, default: '' },
    contractNumber: { type: String, default: '' },
    titleCode: { type: String, default: '' },
    notes: { type: String, default: '' },

    source: { type: String, enum: ENTRY_SOURCES, default: 'manual' },
    /** Fonte do arquivo quando `source === 'import'`. Registros antigos ficam em 'legacy'. */
    importSource: { type: String, enum: IMPORT_SOURCES, default: 'legacy' },
    sourceFile: { type: String, default: '' },
    /** Código do cliente no sistema de origem (ex.: raiz de CNPJ/filial do TOTVS). */
    externalCustomerId: { type: String, default: '' },
    externalId: { type: String, required: true },
  },
  { timestamps: true },
);

receivableSchema.index({ companyId: 1, dueDate: -1 });
receivableSchema.index({ companyId: 1, status: 1 });
receivableSchema.index({ companyId: 1, importSource: 1 });
receivableSchema.index({ customerName: 1 });
receivableSchema.index({ createdAt: -1 });
receivableSchema.index({ companyId: 1, externalId: 1 }, { unique: true });

export type ReceivableDoc = HydratedDocument<InferSchemaType<typeof receivableSchema>>;
export type ReceivablePlain = InferSchemaType<typeof receivableSchema> & { _id: Types.ObjectId };
export const Receivable = model('Receivable', receivableSchema);
