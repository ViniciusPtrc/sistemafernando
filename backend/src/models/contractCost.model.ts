import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import { CONTRACT_COST_ORIGINS, CONTRACT_COST_TYPES } from './enums';

const contractCostSchema = new Schema(
  {
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },

    origin: { type: String, enum: CONTRACT_COST_ORIGINS, required: true },
    /** Obrigatório quando origin === 'payable'. Valor/data/categoria vêm do Payable via lookup, não duplicados. */
    payableId: { type: Schema.Types.ObjectId, ref: 'Payable', default: null },

    type: { type: String, enum: CONTRACT_COST_TYPES, required: true, default: 'realizado' },

    /* --- só usados quando origin === 'manual' (sem Payable por trás) --- */
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    amountCents: { type: Number, default: 0 },
    date: { type: Date, default: null },

    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

contractCostSchema.index(
  { contractId: 1, payableId: 1 },
  { unique: true, partialFilterExpression: { payableId: { $type: 'objectId' } } },
);
// Um Payable só pode estar vinculado a um contrato de cada vez (evita contar o mesmo custo duas vezes).
contractCostSchema.index(
  { payableId: 1 },
  { unique: true, partialFilterExpression: { payableId: { $type: 'objectId' } } },
);

export type ContractCostDoc = HydratedDocument<InferSchemaType<typeof contractCostSchema>>;
export type ContractCostPlain = InferSchemaType<typeof contractCostSchema> & { _id: Types.ObjectId };
export const ContractCost = model('ContractCost', contractCostSchema);
