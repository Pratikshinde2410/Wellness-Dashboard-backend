import { Router } from 'express';
import multer from 'multer';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  exportClients,
  getClientReports,
  getDashboardStats,
  getAnalytics,
  listAllReports,
  createClientReport,
  updateReport,
  deleteReport,
  getUploadHistory,
  getAuditLog,
  uploadReportsCsv,
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  clientListSchema,
  clientIdSchema,
  clientReportsSchema,
  createClientSchema,
  updateClientSchema,
  reportBodySchema,
  reportIdSchema,
  updateReportSchema,
  adminReportsListSchema,
  paginationSchema,
} from '../validators/schemas.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(requireAuth, requireAdmin);

router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/clients/export', exportClients);
router.get('/clients', validate(clientListSchema), listClients);
router.post('/clients', validate(createClientSchema), createClient);
router.get('/clients/:id', validate(clientIdSchema), getClient);
router.patch('/clients/:id', validate(updateClientSchema), updateClient);
router.get('/clients/:id/reports', validate(clientReportsSchema), getClientReports);
router.post('/clients/:id/reports', validate(clientIdSchema), validate(reportBodySchema), createClientReport);

router.get('/reports', validate(adminReportsListSchema), listAllReports);
router.patch('/reports/:reportId', validate(updateReportSchema), updateReport);
router.delete('/reports/:reportId', validate(reportIdSchema), deleteReport);

router.get('/upload-history', validate(paginationSchema), getUploadHistory);
router.get('/audit-log', validate(paginationSchema), getAuditLog);
router.post('/reports/upload-csv', upload.single('file'), uploadReportsCsv);

export default router;
