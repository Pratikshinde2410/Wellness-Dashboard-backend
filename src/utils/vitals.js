export const VITAL_RANGES = {
  hemoglobin: { low: 12, high: 17, label: 'Hemoglobin', unit: 'g/dL' },
  vitamin_d: { low: 20, high: 100, label: 'Vitamin D', unit: 'ng/mL' },
  cholesterol: { low: 0, high: 200, label: 'Cholesterol', unit: 'mg/dL' },
  blood_sugar_fasting: { low: 70, high: 100, label: 'Blood Sugar', unit: 'mg/dL' },
  creatinine: { low: 0.6, high: 1.2, label: 'Creatinine', unit: 'mg/dL' },
  bmi: { low: 18.5, high: 24.9, label: 'BMI', unit: '' },
};

export function getAbnormalVitals(report) {
  const abnormal = [];
  for (const [key, range] of Object.entries(VITAL_RANGES)) {
    const value = report[key];
    if (value != null && (value < range.low || value > range.high)) {
      abnormal.push({
        vital: key,
        label: range.label,
        value,
        unit: range.unit,
        low: range.low,
        high: range.high,
      });
    }
  }
  if (report.urine_protein && report.urine_protein !== 'Negative') {
    abnormal.push({
      vital: 'urine_protein',
      label: 'Urine Protein',
      value: report.urine_protein,
      unit: '',
    });
  }
  return abnormal;
}

export function countAbnormalVitals(report) {
  return getAbnormalVitals(report).length;
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
