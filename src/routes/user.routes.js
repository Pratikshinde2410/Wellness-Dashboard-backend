import { Router } from 'express';
import {
  getMe,
  updateMe,
  changePassword,
  getLatestReport,
  getMyReports,
  getReportTrends,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  paginationSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), updateMe);
router.post('/me/change-password', requireAuth, validate(changePasswordSchema), changePassword);
router.get('/me/reports/trends', requireAuth, getReportTrends);
router.get('/me/reports/latest', requireAuth, getLatestReport);
router.get('/me/reports', requireAuth, validate(paginationSchema), getMyReports);

export default router;
