import bcrypt from 'bcrypt';
import { Client } from '../models/Client.js';
import { HealthReport } from '../models/HealthReport.js';
import { AppError } from '../middleware/errorHandler.js';

const PROFILE_FIELDS = [
  'full_name',
  'mobile',
  'city',
  'state',
  'age',
  'gender',
  'occupation',
  'health_condition',
  'beauty_goal',
];

function sanitizeClient(client) {
  const obj = client.toObject();
  delete obj.password_hash;
  return obj;
}

export async function getMe(req, res, next) {
  try {
    const client = await Client.findById(req.user.client_id);
    if (!client) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    res.json({ success: true, data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const updates = {};
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const client = await Client.findByIdAndUpdate(
      req.user.client_id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!client) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    res.json({ success: true, data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const client = await Client.findById(req.user.client_id);
    if (!client) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const valid = await bcrypt.compare(currentPassword, client.password_hash);
    if (!valid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    const samePassword = await bcrypt.compare(newPassword, client.password_hash);
    if (samePassword) {
      throw new AppError(400, 'SAME_PASSWORD', 'New password must be different from current password');
    }

    client.password_hash = await bcrypt.hash(newPassword, 12);
    await client.save();

    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}

export async function getLatestReport(req, res, next) {
  try {
    const report = await HealthReport.findOne({ client_id: req.user.client_id })
      .sort({ report_date: -1 })
      .lean();

    if (!report) {
      throw new AppError(404, 'NOT_FOUND', 'No health reports found');
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function getMyReports(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { client_id: req.user.client_id };
    const [reports, total] = await Promise.all([
      HealthReport.find(filter)
        .sort({ report_date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HealthReport.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getReportTrends(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 24);
    const reports = await HealthReport.find({ client_id: req.user.client_id })
      .sort({ report_date: 1 })
      .limit(limit)
      .select(
        'report_id report_date hemoglobin vitamin_d cholesterol blood_sugar_fasting creatinine bmi urine_protein'
      )
      .lean();

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}
