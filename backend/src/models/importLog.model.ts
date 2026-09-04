import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { IMPORT_SOURCES, IMPORT_STATUS, IMPORT_TYPES } from './enums';

const importErrorSchema = new Schema(
  {
    row: { type: Number, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
);

const importLogSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: IMPORT_TYPES, required: true },
    source: { type: String, enum: IMPORT_SOURCES, default: 'legacy', index: true },
    fileName: { type: String, default: '' },
    totalRows: { type: Number, default: 0 },
    insertedRows: { type: Number, default: 0 },
    updatedRows: { type: Number, default: 0 },
    ignoredRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    status: { type: String, enum: IMPORT_STATUS, default: 'processing' },
    errors: { type: [importErrorSchema], default: [] },
    /** Avisos não-bloqueantes (ex.: possível divergência de filial, status derivado). */
    warnings: { type: [importErrorSchema], default: [] },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, suppressReservedKeysWarning: true },
);

importLogSchema.index({ createdAt: -1 });

export type ImportLogDoc = HydratedDocument<InferSchemaType<typeof importLogSchema>>;
export const ImportLog = model('ImportLog', importLogSchema);
