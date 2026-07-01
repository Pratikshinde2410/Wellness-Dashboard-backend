import mongoose from 'mongoose';

const uploadLogSchema = new mongoose.Schema(
  {
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    admin_email: { type: String, required: true },
    filename: { type: String, default: 'unknown.csv' },
    total_rows: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const UploadLog = mongoose.model('UploadLog', uploadLogSchema);
