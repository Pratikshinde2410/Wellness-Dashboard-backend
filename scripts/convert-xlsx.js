import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const DEFAULT_XLSX = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  'Downloads',
  'healthcare dataset (2) (1).xlsx'
);

function excelDateToIso(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    const d = new Date(parsed.y, parsed.m - 1, parsed.d);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return String(value);
}

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col])).join(',')
  );
  return [header, ...lines].join('\n');
}

export function convertXlsxToCsv(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Excel file not found: ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const clientSheet = workbook.Sheets.clients || workbook.Sheets.Clients;
  const reportSheet = workbook.Sheets.health_reports || workbook.Sheets['health_reports'];

  if (!clientSheet || !reportSheet) {
    throw new Error('Expected sheets: clients, health_reports');
  }

  const rawClients = XLSX.utils.sheet_to_json(clientSheet);
  const rawReports = XLSX.utils.sheet_to_json(reportSheet);

  const clients = rawClients.map((row) => ({
    client_id: row.client_id,
    full_name: row.full_name,
    email: row.email,
    mobile: row.mobile,
    city: row.city,
    state: row.state,
    age: row.age,
    gender: row.gender,
    occupation: row.occupation,
    health_condition: row.health_condition,
    beauty_goal: row.beauty_goal,
    created_at: excelDateToIso(row.created_at),
  }));

  const reports = rawReports.map((row) => ({
    report_id: row.report_id,
    client_id: row.client_id,
    report_date: excelDateToIso(row.report_date),
    hemoglobin: row.hemoglobin,
    vitamin_d: row.vitamin_d,
    cholesterol: row.cholesterol,
    blood_sugar_fasting: row.blood_sugar_fasting,
    creatinine: row.creatinine,
    urine_protein: row.urine_protein,
    bmi: row.bmi,
    doctor_notes: row.doctor_notes || '',
  }));

  const clientColumns = [
    'client_id', 'full_name', 'email', 'mobile', 'city', 'state',
    'age', 'gender', 'occupation', 'health_condition', 'beauty_goal', 'created_at',
  ];
  const reportColumns = [
    'report_id', 'client_id', 'report_date', 'hemoglobin', 'vitamin_d',
    'cholesterol', 'blood_sugar_fasting', 'creatinine', 'urine_protein', 'bmi', 'doctor_notes',
  ];

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'clients.csv'), rowsToCsv(clients, clientColumns));
  fs.writeFileSync(path.join(DATA_DIR, 'health_reports.csv'), rowsToCsv(reports, reportColumns));

  return { clients: clients.length, reports: reports.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const xlsxPath = process.argv[2] || process.env.DATASET_XLSX_PATH || DEFAULT_XLSX;
  try {
    const result = convertXlsxToCsv(xlsxPath);
    console.log(`Converted ${result.clients} clients and ${result.reports} health reports`);
    console.log(`Output: ${DATA_DIR}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
