import fs from 'fs';
import { Readable } from 'stream';
import csv from 'csv-parser';

export function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const readable = Readable.from(buffer.toString());
    readable
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}
