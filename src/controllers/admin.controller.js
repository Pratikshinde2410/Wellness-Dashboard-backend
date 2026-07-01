import bcrypt from 'bcrypt';
import { Client } from '../models/Client.js';
import { HealthReport } from '../models/HealthReport.js';
import { AuditLog } from '../models/AuditLog.js';
import { UploadLog } from '../models/UploadLog.js';
import { AppError } from '../middleware/errorHandler.js';
import { csvRowSchema } from '../validators/schemas.js';
import { parseCsvBuffer } from '../utils/csvParser.js';
import { logAudit } from '../utils/audit.js';
import {
  countAbnormalVitals,
  escapeRegex,
} from '../utils/vitals.js';

function sanitizeClient(client) {
  const obj = client.toObject ? client.toObject() : client;
  delete obj.password_hash;
  return obj;
}

function buildClientFilter({ search, city, state, health_condition }) {
  const filter = {};
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (state) filter.state = new RegExp(`^${escapeRegex(state)}$`, 'i');
  if (health_condition) {
    filter.health_condition = new RegExp(escapeRegex(health_condition), 'i');
  }
  if (search) {
    const term = escapeRegex(search);
    filter.$or = [
      { full_name: new RegExp(term, 'i') },
      { email: new RegExp(term, 'i') },
    ];
  }
  return filter;
}

export async function listClients(req, res, next) {
  try {
    const { search, city, state, health_condition, page, limit } = req.query;
    const filter = buildClientFilter({ search, city, state, health_condition });
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .select('-password_hash')
        .sort({ full_name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        clients,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getClient(req, res, next) {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    res.json({ success: true, data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
}

export async function createClient(req, res, next) {
  try {
    const data = req.body;
    const maxClient = await Client.findOne().sort({ client_id: -1 }).select('client_id').lean();
    const nextClientId = (maxClient?.client_id || 0) + 1;
    const passwordHash = await bcrypt.hash(data.password, 12);

    const client = await Client.create({
      client_id: nextClientId,
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      mobile: data.mobile,
      city: data.city,
      state: data.state,
      age: data.age,
      gender: data.gender,
      occupation: data.occupation,
      health_condition: data.health_condition,
      beauty_goal: data.beauty_goal,
      password_hash: passwordHash,
      role: data.role || 'user',
      is_active: true,
    });

    await logAudit(req, 'CLIENT_CREATE', 'client', client._id, { email: client.email });
    res.status(201).json({ success: true, data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
}

export async function updateClient(req, res, next) {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    await logAudit(req, 'CLIENT_UPDATE', 'client', client._id, req.body);
    res.json({ success: true, data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
}

export async function exportClients(req, res, next) {
  try {
    const filter = buildClientFilter(req.query);
    const clients = await Client.find(filter)
      .select('-password_hash')
      .sort({ full_name: 1 })
      .limit(5000)
      .lean();

    const header = 'client_id,full_name,email,mobile,city,state,age,gender,occupation,health_condition,beauty_goal,role,is_active';
    const rows = clients.map((c) =>
      [
        c.client_id,
        `"${c.full_name}"`,
        c.email,
        c.mobile,
        `"${c.city}"`,
        `"${c.state}"`,
        c.age,
        c.gender,
        `"${c.occupation}"`,
        `"${c.health_condition}"`,
        `"${c.beauty_goal}"`,
        c.role,
        c.is_active !== false,
      ].join(',')
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
}

export async function getClientReports(req, res, next) {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');

    const { page, limit } = req.query;
    const skip = (page - 1) * limit;
    const filter = { client_id: req.params.id };

    const [reports, total] = await Promise.all([
      HealthReport.find(filter).sort({ report_date: -1 }).skip(skip).limit(limit).lean(),
      HealthReport.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClients, totalReports, reportsThisMonth, recentUploads] =
      await Promise.all([
        Client.countDocuments(),
        HealthReport.countDocuments(),
        HealthReport.countDocuments({ report_date: { $gte: monthStart } }),
        UploadLog.find().sort({ created_at: -1 }).limit(5).lean(),
      ]);

    const conditionBreakdown = await Client.aggregate([
      { $group: { _id: '$health_condition', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        totalReports,
        reportsThisMonth,
        conditionBreakdown: conditionBreakdown.map((c) => ({
          condition: c._id,
          count: c.count,
        })),
        recentUploads,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(req, res, next) {
  try {
    const [avgVitals, reportsByMonth, cityBreakdown] = await Promise.all([
      HealthReport.aggregate([
        {
          $group: {
            _id: null,
            hemoglobin: { $avg: '$hemoglobin' },
            vitamin_d: { $avg: '$vitamin_d' },
            cholesterol: { $avg: '$cholesterol' },
            blood_sugar_fasting: { $avg: '$blood_sugar_fasting' },
            creatinine: { $avg: '$creatinine' },
            bmi: { $avg: '$bmi' },
          },
        },
      ]),
      HealthReport.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$report_date' },
              month: { $month: '$report_date' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
      Client.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        avgVitals: avgVitals[0] || {},
        reportsByMonth: reportsByMonth.map((r) => ({
          label: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
          count: r.count,
        })),
        cityBreakdown: cityBreakdown.map((c) => ({ city: c._id, count: c.count })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listAllReports(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const filter = {};
    if (search) {
      filter.report_id = new RegExp(escapeRegex(search), 'i');
    }

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      HealthReport.find(filter).sort({ report_date: -1 }).skip(skip).limit(limit).lean(),
      HealthReport.countDocuments(filter),
    ]);

    const clientIds = [...new Set(reports.map((r) => String(r.client_id)))];
    const clients = await Client.find({ _id: { $in: clientIds } })
      .select('full_name email')
      .lean();
    const clientMap = new Map(clients.map((c) => [String(c._id), c]));

    const enriched = reports.map((r) => ({
      ...r,
      client: clientMap.get(String(r.client_id)) || null,
      abnormalCount: countAbnormalVitals(r),
    }));

    res.json({
      success: true,
      data: {
        reports: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createClientReport(req, res, next) {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');

    const data = req.body;
    const reportDate = new Date(data.report_date);
    if (isNaN(reportDate.getTime())) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid report_date');
    }

    const report = await HealthReport.create({
      ...data,
      client_id: client._id,
      report_date: reportDate,
    });

    await logAudit(req, 'REPORT_CREATE', 'report', report.report_id, {
      client_id: client._id,
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.report_date) {
      const d = new Date(data.report_date);
      if (isNaN(d.getTime())) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid report_date');
      data.report_date = d;
    }

    const report = await HealthReport.findOneAndUpdate(
      { report_id: req.params.reportId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!report) throw new AppError(404, 'NOT_FOUND', 'Report not found');

    await logAudit(req, 'REPORT_UPDATE', 'report', report.report_id);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function deleteReport(req, res, next) {
  try {
    const report = await HealthReport.findOneAndDelete({ report_id: req.params.reportId });
    if (!report) throw new AppError(404, 'NOT_FOUND', 'Report not found');
    await logAudit(req, 'REPORT_DELETE', 'report', report.report_id);
    res.json({ success: true, data: { message: 'Report deleted' } });
  } catch (err) {
    next(err);
  }
}

export async function getUploadHistory(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      UploadLog.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      UploadLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLog(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadReportsCsv(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'CSV file is required');
    }

    const rows = await parseCsvBuffer(req.file.buffer);
    const inserted = [];
    const rejected = [];

    const clients = await Client.find().select('client_id _id').lean();
    const clientIdMap = new Map(clients.map((c) => [String(c.client_id), c._id]));

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = rows[i];

      const parsed = csvRowSchema.safeParse(row);
      if (!parsed.success) {
        rejected.push({
          row: rowNum,
          report_id: row.report_id || 'N/A',
          reason: parsed.error.errors.map((e) => e.message).join('; '),
        });
        continue;
      }

      const data = parsed.data;
      const mongoClientId = clientIdMap.get(String(data.client_id));
      if (!mongoClientId) {
        rejected.push({
          row: rowNum,
          report_id: data.report_id,
          reason: `Client not found for client_id ${data.client_id}`,
        });
        continue;
      }

      const reportDate = new Date(data.report_date);
      if (isNaN(reportDate.getTime())) {
        rejected.push({
          row: rowNum,
          report_id: data.report_id,
          reason: 'Malformed report_date',
        });
        continue;
      }

      try {
        const report = await HealthReport.create({
          report_id: data.report_id,
          client_id: mongoClientId,
          report_date: reportDate,
          hemoglobin: data.hemoglobin,
          vitamin_d: data.vitamin_d,
          cholesterol: data.cholesterol,
          blood_sugar_fasting: data.blood_sugar_fasting,
          creatinine: data.creatinine,
          urine_protein: data.urine_protein,
          bmi: data.bmi,
          doctor_notes: data.doctor_notes || '',
        });
        inserted.push(report.report_id);
      } catch (err) {
        rejected.push({
          row: rowNum,
          report_id: data.report_id,
          reason: err.code === 11000 ? 'Duplicate report_id' : err.message,
        });
      }
    }

    await UploadLog.create({
      admin_id: req.user.client_id,
      admin_email: req.user.email,
      filename: req.file.originalname,
      total_rows: rows.length,
      inserted: inserted.length,
      rejected: rejected.length,
    });

    await logAudit(req, 'CSV_UPLOAD', 'upload', req.file.originalname, {
      inserted: inserted.length,
      rejected: rejected.length,
    });

    res.json({
      success: true,
      data: {
        totalRows: rows.length,
        inserted: inserted.length,
        rejected: rejected.length,
        insertedIds: inserted,
        rejectedRows: rejected,
      },
    });
  } catch (err) {
    next(err);
  }
}
