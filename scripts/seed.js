import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from '../src/models/Client.js';
import { HealthReport } from '../src/models/HealthReport.js';
import { convertXlsxToCsv } from './convert-xlsx.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_PASSWORD = 'Password@123';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'user1@example.com').toLowerCase();
const BATCH_SIZE = 1000;

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function insertInBatches(Model, docs, label) {
  const all = [];
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const result = await Model.insertMany(batch, { ordered: false });
    all.push(...result);
    process.stdout.write(`\r  ${label}: ${all.length}/${docs.length}`);
  }
  console.log();
  return all;
}

async function ensureCsvData() {
  const clientsPath = path.join(DATA_DIR, 'clients.csv');
  const reportsPath = path.join(DATA_DIR, 'health_reports.csv');

  if (fs.existsSync(clientsPath) && fs.existsSync(reportsPath)) {
    return;
  }

  const xlsxPath = process.env.DATASET_XLSX_PATH;
  if (!xlsxPath) {
    throw new Error(
      'CSV files missing. Run: npm run convert-data -- "path/to/healthcare dataset.xlsx"'
    );
  }

  console.log('CSV not found — converting from Excel...');
  convertXlsxToCsv(xlsxPath);
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await ensureCsvData();

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await HealthReport.deleteMany({});
  await Client.deleteMany({});
  console.log('Cleared existing data');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const clientRows = await readCsv(path.join(DATA_DIR, 'clients.csv'));
  console.log(`Loading ${clientRows.length} clients...`);

  const clientDocs = clientRows.map((row) => ({
    client_id: Number(row.client_id),
    full_name: row.full_name.trim(),
    email: row.email.trim().toLowerCase(),
    mobile: String(row.mobile).trim(),
    city: row.city.trim(),
    state: row.state.trim(),
    age: Number(row.age),
    gender: row.gender.trim(),
    occupation: row.occupation.trim(),
    health_condition: row.health_condition.trim(),
    beauty_goal: row.beauty_goal.trim(),
    created_at: new Date(row.created_at),
    password_hash: passwordHash,
    role: row.email.trim().toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
  }));

  const insertedClients = await insertInBatches(Client, clientDocs, 'Clients');

  const clientIdMap = new Map(
    insertedClients.map((c) => [c.client_id, c._id])
  );

  const reportRows = await readCsv(path.join(DATA_DIR, 'health_reports.csv'));
  console.log(`Loading ${reportRows.length} health reports...`);

  const reportDocs = [];
  for (const row of reportRows) {
    const numericClientId = Number(row.client_id);
    const mongoClientId = clientIdMap.get(numericClientId);
    if (!mongoClientId) {
      console.warn(`Skipping report ${row.report_id}: unknown client_id ${row.client_id}`);
      continue;
    }
    reportDocs.push({
      report_id: row.report_id.trim(),
      client_id: mongoClientId,
      report_date: new Date(row.report_date),
      hemoglobin: Number(row.hemoglobin),
      vitamin_d: Number(row.vitamin_d),
      cholesterol: Number(row.cholesterol),
      blood_sugar_fasting: Number(row.blood_sugar_fasting),
      creatinine: Number(row.creatinine),
      urine_protein: row.urine_protein.trim(),
      bmi: Number(row.bmi),
      doctor_notes: row.doctor_notes?.trim() || '',
    });
  }

  await insertInBatches(HealthReport, reportDocs, 'Reports');

  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`Admin login: ${ADMIN_EMAIL}`);

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
