import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    admin_email: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entity_type: { type: String, default: '' },
    entity_id: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
