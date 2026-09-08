import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import { CONTRACT_STATUS } from './enums';

const contractSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    number: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerDocument: { type: String, default: '', trim: true },

    contractedValueCents: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },

    status: { type: String, enum: CONTRACT_STATUS, default: 'ativo' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

contractSchema.index({ companyId: 1, number: 1 }, { unique: true });
contractSchema.index({ companyId: 1, status: 1 });
contractSchema.index({ customerName: 1 });

export type ContractDoc = HydratedDocument<InferSchemaType<typeof contractSchema>>;
export type ContractPlain = InferSchemaType<typeof contractSchema> & { _id: Types.ObjectId };
export const Contract = model('Contract', contractSchema);
