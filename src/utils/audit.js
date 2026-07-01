import { AuditLog } from '../models/AuditLog.js';

export async function logAudit(req, action, entityType = '', entityId = '', details = {}) {
  try {
    await AuditLog.create({
      admin_id: req.user.client_id,
      admin_email: req.user.email,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      details,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}
