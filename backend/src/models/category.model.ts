import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const categorySchema = new Schema(
  {
    // usa o mesmo id textual do front (ex.: 'cat-r-4', 'cat-d-1')
    _id: { type: String, required: true },
    nome: { type: String, required: true },
    tipo: { type: String, enum: ['receita', 'despesa'], required: true },
    cor: { type: String, default: '#64748b' },
  },
  { timestamps: true },
);

export type CategoryDoc = HydratedDocument<InferSchemaType<typeof categorySchema>>;
export const Category = model('Category', categorySchema);
