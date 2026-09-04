import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { COMPANY_STATUS } from './enums';

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortName: { type: String, required: true, trim: true },
    document: { type: String, default: '', trim: true },
    status: { type: String, enum: COMPANY_STATUS, default: 'ativo' },
    color: { type: String, default: '#0f172a' },
    openingBalanceCents: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CompanyDoc = HydratedDocument<InferSchemaType<typeof companySchema>>;
export const Company = model('Company', companySchema);
