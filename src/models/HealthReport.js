import mongoose from 'mongoose';

const healthReportSchema = new mongoose.Schema(
  {
    report_id: { type: String, required: true, unique: true },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    report_date: { type: Date, required: true, index: true },
    hemoglobin: { type: Number, required: true },
    vitamin_d: { type: Number, required: true },
    cholesterol: { type: Number, required: true },
    blood_sugar_fasting: { type: Number, required: true },
    creatinine: { type: Number, required: true },
    urine_protein: {
      type: String,
      enum: ['Negative', 'Trace', 'Positive'],
      required: true,
    },
    bmi: { type: Number, required: true },
    doctor_notes: { type: String, default: '' },
  },
  { timestamps: false }
);

healthReportSchema.index({ client_id: 1, report_date: -1 });

export const HealthReport = mongoose.model('HealthReport', healthReportSchema);
