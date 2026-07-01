import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    client_id: { type: Number, required: true, unique: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    occupation: { type: String, required: true },
    health_condition: { type: String, required: true, index: true },
    beauty_goal: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: false }
);

clientSchema.index({ full_name: 'text', email: 'text' });

export const Client = mongoose.model('Client', clientSchema);
